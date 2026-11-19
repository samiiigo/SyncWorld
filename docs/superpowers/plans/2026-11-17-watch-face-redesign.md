# Watch-face Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the slider/timeline room UI with the approved sky dial, and redraw the vote, armed, ringing and rooms-list screens around it, plus the small backend additions those screens need.

**Architecture:** Pure sky maths (`skyGeometry`, `skyColors`) feed one SVG component (`SkyDial`) and its centre scene (`SkyWindow`). Screens keep reading state from `AppContext`; new member fields flow through the existing `SyncBackend` interface (demo + live) so demo mode keeps working. Backend changes extend existing callables/triggers and add one callable and one scheduled job.

**Tech Stack:** Expo SDK 54, React Native 0.81, react-native-svg (new), react-native-reanimated 4, Luxon, jest-expo; Firebase Functions v2 + Zod + firebase-functions-test.

**Spec:** `docs/superpowers/specs/2026-11-17-watch-face-redesign-design.md` (approved 2026-11-17; open questions settled: keep hold-to-agree, credit Open-Meteo in Settings → About, unlock 1 h after the alarm). Mockups: https://claude.ai/artifact/5VAgCPAhQwSCW6kwcFXYNh

**Found while planning:** members already carry `alarmArmed` (set by `registerPushToken`), so the "phone confirmed" ticks reuse it; only `alarmBlocked` and `wokeAt` are new. `fireAlarms` sets rooms to `FIRED`, so the unlock is `FIRED → OPEN`.

## Global Constraints

- Branch: `feat/frontend-integration` (current). One commit per task. Never push without asking.
- App checks per task: `cd syncworld-app && npx tsc --noEmit && npx jest`. Backend: `cd syncworld-backend && npm test`.
- Visual check per UI task: web at 390 px wide in demo mode (`EXPO_PUBLIC_DEMO_MODE=true npx expo start --web`), compared with the mockup.
- Dial viewBox 200×200. Horizon y = 108. Body path `arc(t) = [100 − 57·cos(πt), 116 − 42·sin(πt)]`, t ∈ [0,1].
- Sun visible 6 AM–6 PM local, moon 6 PM–6 AM local.
- Ring labels exactly: `12 AM`, `6 AM`, `12 PM`, `6 PM`.
- "You" colour `#E3A440`. Odd hours = local time before 7 AM (`early`) or at/after 11 PM (`late`): orange **and** the word.
- No blur behind text; readout sits on the ground, not the sky. Text contrast ≥ 4.5:1.
- Reduce motion (`useReducedMotion()` from reanimated): no twinkle, no shooting star, sun/moon jump.
- Weather: Open-Meteo, cache 30 min per zone, failure → clear sky, never blocks render. Credit line `Weather: Open-Meteo` in Settings → About.
- Hold-to-agree = 600 ms; screen readers get a plain activate action.
- A FIRED room returns to OPEN 1 hour after its alarm time.
- Out of scope: desktop layout, native alarm modules, Google sign-in.
- All new visible copy passes unslop `banned_phrase_scan` with 0 hits.

## Review Focus

1. **Half-hour zones and +13 zones** (Asia/Kolkata, Pacific/Auckland in summer): bezel angle and local labels exact, not rounded → Task 1 test `handles half-hour and +13 zones`.
2. **DST change inside the 48 h window**: a member's hour uses the offset at the shown instant, not "now" → Task 1 test `uses offset at the instant (DST)`.
3. **Dragging past the window edge**: clamp, never wrap to the other day; crossing the ±180° seam never jumps 24 h → Task 4 tests `clamps to window`, `crossing ±180 does not jump`.
4. **Weather offline or zone without coordinates** (`Etc/UTC`): no crash, clear sky, no retry storm → Task 6 tests `returns null on fetch error`, `returns null for unknown zone`, null cached 5 min.
5. **Counter-offer in the past or beyond 7 days**: server rejects with `invalid-argument` and records no vote → Task 9 test `rejects counter outside window`.

---

### Task 1: Sky geometry (pure maths)

**Files:**
- Create: `syncworld-app/src/shared/sky/skyGeometry.ts`
- Test: `syncworld-app/src/shared/sky/__tests__/skyGeometry.test.ts`

**Interfaces:**
- Consumes: `zoneOffsetMinutes(tz: string, ms: number): number` from `src/shared/lib/time/time.conversions.ts`.
- Produces:
  - `localMinutes(utcMs: number, tz: string): number` — 0..1439 at that instant.
  - `bezelAngleDeg(memberTz: string, youTz: string, utcMs: number): number` — `(offMember − offYou)/60 × 15`, normalised to (−180, 180].
  - `ringRotationDeg(utcMs: number, youTz: string): number` — `−localMinutes/60 × 15`.
  - `bodyPosition(localMin: number): { kind: 'sun' | 'moon'; x: number; y: number }` — sun for [360,1080) with t = (min−360)/720; moon otherwise with t = ((min−1080+1440) % 1440)/720.
  - `oddHour(localMin: number): 'early' | 'late' | null` — `< 420` → `'early'`, `>= 1380` → `'late'`.
  - `snapToTick(utcMs: number): number` — nearest 15 min.

- [ ] **Step 1: Write the failing tests**

```ts
it('body is off-frame at 6 AM and highest at noon / midnight', () => {
  expect(bodyPosition(360)).toMatchObject({ kind: 'sun', x: 43, y: 116 });
  expect(bodyPosition(720)).toMatchObject({ kind: 'sun', x: 100, y: 74 });
  expect(bodyPosition(1080).kind).toBe('moon');
  expect(bodyPosition(0)).toMatchObject({ kind: 'moon', x: 100, y: 74 });
});
it('oddHour', () => {
  expect(oddHour(6 * 60 + 59)).toBe('early');
  expect(oddHour(7 * 60)).toBeNull();
  expect(oddHour(23 * 60)).toBe('late');
});
it('handles half-hour and +13 zones', () => {
  const t = Date.UTC(2026, 0, 10, 0, 0);
  expect(bezelAngleDeg('Asia/Kolkata', 'Etc/UTC', t)).toBeCloseTo(82.5);
  expect(bezelAngleDeg('Pacific/Auckland', 'Etc/UTC', t)).toBeCloseTo(-165);
});
it('uses offset at the instant (DST)', () => {
  expect(localMinutes(Date.UTC(2026, 2, 28, 12), 'Europe/London')).toBe(720);
  expect(localMinutes(Date.UTC(2026, 2, 29, 12), 'Europe/London')).toBe(780);
});
it('ringRotationDeg and snapToTick', () => {
  expect(ringRotationDeg(Date.UTC(2026, 0, 1, 6), 'Etc/UTC')).toBe(-90);
  expect(snapToTick(Date.UTC(2026, 0, 1, 6, 8))).toBe(Date.UTC(2026, 0, 1, 6, 15));
});
```

- [ ] **Step 2:** `npx jest src/shared/sky` → FAIL (module not found).
- [ ] **Step 3:** Implement the functions in `skyGeometry.ts`.
- [ ] **Step 4:** `npx jest src/shared/sky` → PASS.
- [ ] **Step 5:** Commit `feat(sky): dial geometry helpers`.

---

### Task 2: Sky colours

**Files:**
- Create: `syncworld-app/src/shared/sky/skyColors.ts`
- Test: `syncworld-app/src/shared/sky/__tests__/skyColors.test.ts`

**Interfaces:**
- Produces:
  - `type SkyStop = { min: number; top: string; bottom: string }`
  - `SKY_STOPS: SkyStop[]` — night 0, dawn 330, morning 420, noon 720, golden 1020, dusk 1110, night 1200; hex values copied from the `SKY` table in `directions/dial.html`.
  - `skyAt(localMin: number): { top: string; bottom: string }` — linear RGB interpolation between neighbouring stops, wrapping at 1440.
  - `GROUND = '#14161B'`, `YOU = '#E3A440'`, `ODD = '#E8743B'`.
  - `contrastRatio(a: string, b: string): number` — WCAG 2 formula.

- [ ] **Step 1: Failing tests**

```ts
it('returns exact stop colours at stop minutes', () => {
  const noon = SKY_STOPS.find(s => s.min === 720)!;
  expect(skyAt(720)).toEqual({ top: noon.top, bottom: noon.bottom });
});
it('wraps at midnight', () => { expect(skyAt(1440)).toEqual(skyAt(0)); });
it('readout colours are readable on the ground', () => {
  for (const c of ['#FFFFFF', ODD, YOU]) expect(contrastRatio(c, GROUND)).toBeGreaterThanOrEqual(4.5);
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. If `ODD` fails contrast, lighten it until it passes and give the value in the commit message.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(sky): sky colour stops`.

---

### Task 3: Static SkyDial on the room screen (behind a flag)

**Files:**
- Modify: `syncworld-app/package.json` via `npx expo install react-native-svg`
- Modify: `syncworld-app/src/config/feature-flags.ts` — add `enableSkyDial: boolean`, default `true`.
- Create: `syncworld-app/src/shared/sky/SkyDial.tsx`, `syncworld-app/src/shared/sky/SkyWindow.tsx`, `syncworld-app/src/features/rooms/components/MemberTimeTable.tsx`
- Modify: `syncworld-app/src/features/rooms/pages/RoomsScreens.tsx:355-401` — when the flag is on, render `SkyDial` + `MemberTimeTable` instead of the layout A/B toggle, `TimeScrubber`, avatar strip and `MemberTimelines`.
- Test: `syncworld-app/src/shared/sky/__tests__/SkyDial.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–2; `MemberView` from `AppContext.tsx`.
- Produces:
  - `type DialMember = { id: string; name: string; timezone: string; isYou: boolean; tick?: 'gold' | 'dashed' | 'plain' }`
  - `type WeatherNow = { kind: 'clear' | 'cloud' | 'rain' | 'fog'; tempC: number }` — declared in `SkyWindow.tsx` now, moved to `openMeteo.ts` in Task 6.
  - `SkyDial(props: { utcMs: number; youTz: string; members: DialMember[]; mode: 'full' | 'mini'; interactive?: boolean; onChange?: (utcMs: number) => void; onCommit?: (utcMs: number) => void; minUtc?: number; maxUtc?: number; weather?: WeatherNow | null; readout?: { big: string; small: string } })`
  - `SkyWindow(props: { localMin: number; size: number; weather?: WeatherNow | null; fullBleed?: boolean; animate?: boolean })`
  - `MemberTimeTable(props: { members: MemberView[]; status?: Record<string, string> })` — name, local time, `early`/`late` tag in `ODD`, optional status column (used by vote/armed).

- [ ] **Step 1: Failing tests**

```tsx
it('labels the dial with the shown time', () => {
  const { getByLabelText } = render(
    <SkyDial utcMs={Date.UTC(2026, 10, 18, 5, 15)} youTz="Asia/Dubai" members={[]} mode="full" />);
  expect(getByLabelText(/9:15 AM/)).toBeTruthy();
});
it('mini mode hides ring labels', () => {
  const { queryByText } = render(<SkyDial utcMs={0} youTz="Etc/UTC" members={[]} mode="mini" />);
  expect(queryByText('12 PM')).toBeNull();
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement by porting the SVG structure of `directions/dial.html`: bezel ticks and city labels, rotating ring group with segments coloured by `skyAt`, four upright labels, clipped window with sky gradient, horizon, ground, readout. Static only (no drag, stars, weather). Root `View`: `accessible`, `accessibilityLabel={'Proposed time ' + readout.big + ' ' + readout.small}`.
- [ ] **Step 4:** tsc + jest → PASS. Web check at 390 px against the mockup's room dial.
- [ ] **Step 5:** Commit `feat(sky): static sky dial on room screen`.

---

### Task 4: Drag and accessibility on the dial

**Files:**
- Create: `syncworld-app/src/shared/sky/dialDrag.ts`
- Test: `syncworld-app/src/shared/sky/__tests__/dialDrag.test.ts`
- Modify: `SkyDial.tsx`; `RoomsScreens.tsx` — pass `interactive`, `onChange={ctx.scrubTo}`, `onCommit` (→ `ctx.setDragging(false)`), `minUtc={ctx.windowStart}`, `maxUtc={ctx.windowStart + SCRUBBER_WINDOW_MS}`; not interactive while status is VOTING/LOCKED (today's rule).

**Interfaces:**
- Produces: `dragToUtc(startUtc: number, startAngleDeg: number, currentAngleDeg: number, minUtc: number, maxUtc: number): number` — unwrapped angle delta × 4 min/deg, `snapToTick`, clamped.

- [ ] **Step 1: Failing tests** (`T` = a fixed UTC ms, `H` = 3_600_000, `D` = 24·H)

```ts
it('a quarter turn moves 6 hours', () => {
  expect(Math.abs(dragToUtc(T, 0, 90, T - D, T + D) - T)).toBe(6 * H);
});
it('crossing ±180 does not jump', () => {
  expect(Math.abs(dragToUtc(T, 170, -170, T - D, T + D) - T)).toBeLessThanOrEqual(90 * 60_000);
});
it('clamps to window', () => {
  expect(dragToUtc(T, 0, 720, T, T + 2 * D)).toBeLessThanOrEqual(T + 2 * D);
  expect(dragToUtc(T, 0, -720, T, T + 2 * D)).toBeGreaterThanOrEqual(T);
});
```
Fix the sign (clockwise drag = later or earlier) in the implementation to match how the ring visibly turns in the mockup; the tests above don't depend on it.

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `dragToUtc`. In `SkyDial` use `PanResponder` (web + native) to get the angle from the dial centre; call `onChange` on each tick change; native haptic `selectionAsync` per tick via the existing platform haptics shim; `onCommit` on release. `accessibilityRole="adjustable"`, increment/decrement = ±15 min.
- [ ] **Step 4:** Run → PASS. Web: drag the ring, the member table updates, "Propose this time" proposes the shown time.
- [ ] **Step 5:** Commit `feat(sky): drag and adjustable dial`.

---

### Task 5: Sun, crescent moon, stars, shooting star

**Files:**
- Create: `syncworld-app/src/shared/sky/stars.ts`
- Test: `syncworld-app/src/shared/sky/__tests__/stars.test.ts`
- Modify: `SkyWindow.tsx`

**Interfaces:**
- Produces: `starField(seed: number, count: number, yMin: number, yMax: number): { x: number; y: number; r: number; phase: number }[]` (deterministic PRNG, e.g. mulberry32); `starOpacity(localMin: number): number` — 1 at night, 0 for [420, 1110], linear over dawn 330–420 and dusk 1110–1200.

- [ ] **Step 1: Failing tests:** `starField(1, 20, 20, 104)` gives 20 stars within the y bounds and equals a second call; `starOpacity(720) === 0`; `starOpacity(0) === 1`; `0 < starOpacity(375) < 1`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Sun = circle + soft halo; moon = crescent via `Mask` with an offset circle; both at `bodyPosition`. Stars twinkle via reanimated opacity; one shooting star every ~12 s (animated `strokeDashoffset`). No animation when `useReducedMotion()` or `animate === false`.
- [ ] **Step 4:** Run → PASS. Web at local 6:00, 12:00, 19:30, 00:00: the body fully leaves and re-enters the window.
- [ ] **Step 5:** Commit `feat(sky): sun, moon and stars`.

---

### Task 6: Weather from Open-Meteo

**Files:**
- Create: `syncworld-app/src/shared/lib/weather/openMeteo.ts`, `syncworld-app/src/shared/lib/weather/zoneCoords.ts`
- Test: `syncworld-app/src/shared/lib/weather/__tests__/openMeteo.test.ts`
- Modify: `SkyWindow.tsx` (clouds / rain streaks / fog band, `feGaussianBlur` on the fog band only); `RoomsScreens.tsx` (weather for you); `src/features/settings/hooks/useSettingsScreen.ts` (About: `Weather: Open-Meteo`).

**Interfaces:**
- Produces:
  - `WeatherNow` (moved here from `SkyWindow.tsx`).
  - `ZONE_COORDS: Record<string, { lat: number; lon: number }>` — every zone in `demo.backend.ts` plus ~40 common IANA city zones.
  - `weatherCodeToKind(code: number): WeatherNow['kind']` — 0–1 clear; 2–3 cloud; 45–48 fog; 51–67, 80–82, 95–99 rain; anything else cloud.
  - `fetchWeather(tz: string, now?: number, fetchImpl?: typeof fetch): Promise<WeatherNow | null>` — GET `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weather_code`; in-memory cache per tz for 30 min; `null` for unknown zone or any error, `null` cached 5 min.
  - `useWeather(tz: string | undefined): WeatherNow | null`.

- [ ] **Step 1: Failing tests:** code table (0→clear, 3→cloud, 45→fog, 61→rain); `returns null for unknown zone` (`'Etc/UTC'`, fetch not called); `returns null on fetch error`; a second call within 30 min skips fetch, one after 31 min fetches.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Web online shows real weather; with DevTools offline, clear sky and no errors beyond the failed request.
- [ ] **Step 5:** Commit `feat(sky): live weather from Open-Meteo`.

---

### Task 7: Vote screen

**Files:**
- Create: `syncworld-app/src/features/rooms/components/HoldToAgree.tsx`
- Test: `syncworld-app/src/features/rooms/components/__tests__/HoldToAgree.test.tsx`
- Modify: `RoomsScreens.tsx` `VoteModal` (~line 528) — mini `SkyDial` at `proposedUtc`, big local time, `Tue 18 Nov · 05:15 UTC`, line `{agreed} of {total} agreed · {m:ss} left`, `MemberTimeTable` with `Agreed` / `Waiting`, `HoldToAgree`, then `+1 h` / `+2 h` / `No`. Rule line: `Everyone must agree. One No cancels it.`
- Modify: `AppContext.tsx` — add `onCounter(hours: 1 | 2): void` to the context type and value (Task 10 makes it send the counter).

**Interfaces:**
- Produces: `HoldToAgree(props: { onAgree: () => void; disabled?: boolean; holdMs?: number })`, default `holdMs` 600; early release cancels; `accessibilityActions=[{ name: 'activate' }]` calls `onAgree` at once. `+1 h`/`+2 h` render disabled until Task 10.

- [ ] **Step 1: Failing tests** (fake timers): press-in + 599 ms → not called; +1 ms → called once; press-in, 300 ms, press-out, 600 ms → not called; `fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })` → called.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement and rebuild `VoteModal`.
- [ ] **Step 4:** Run → PASS. Web demo: propose, hold to agree, counter updates; No → veto toast as before.
- [ ] **Step 5:** Commit `feat(vote): watch-face vote screen with hold to agree`.

---

### Task 8: Armed and ringing screens

**Files:**
- Modify: `syncworld-app/src/features/session/session.types.ts` — `SessionMember` gains `alarmBlocked: boolean; wokeAt: number | null`.
- Modify: `src/features/session/backends/demo.backend.ts` (Marcus `alarmBlocked: true`; other sims get `wokeAt` 5–40 s after fire), `live.backend.ts` (map member-doc `alarmBlocked ?? false`, `wokeAt?.toMillis() ?? null`), `__tests__/demo.backend.test.ts`.
- Create: `syncworld-app/src/features/alarms/armedNote.ts`, test `src/features/alarms/__tests__/armedNote.test.ts`.
- Modify: `src/features/alarms/pages/ArmedPage.tsx`.
  - Not fired: full `SkyDial` frozen at the agreed time; ticks `gold` if `alarmArmed`, else `dashed`; readout = countdown / `RINGS IN · TUE 9:15 AM`; `armedNote` line with a `Remind` action (reuse Share); `AddToCalendarRow`; Disarm.
  - Fired: full-bleed `SkyWindow` at alarm local time, big time, `AM · TUE 18 NOV · {CITY} · {WEATHER} {°}`, who's-up strip (initials filled when `wokeAt`), `I'M UP` bar → `onWakeUp`. `Nudge the others` only if an existing notify path exists, else omitted (say so in the commit). `Join call` omitted (no call link yet).

**Interfaces:**
- Produces: `armedNote(members: SessionMember[]): string | null`.

- [ ] **Step 1: Failing tests:** `armedNote` → `null` when all armed; a blocked member beats an unconfirmed one; first name only (`'Marcus Reid'` → `Marcus hasn't allowed alarms yet`; unconfirmed → `Priya's phone hasn't confirmed yet`). Demo test: after fire and 40 s of fake time, at least one sim has `wokeAt !== null`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Web demo: arm, ticks turn gold, alarm fires, ringing screen shows, `I'M UP` returns to the room.
- [ ] **Step 5:** Commit `feat(alarms): watch-face armed and ringing screens`.

---

### Task 9: Backend — member status, counter-offers, auto-unlock

**Files:**
- Modify: `syncworld-backend/functions/src/lib/validation.ts` — `castVoteInputSchema` adds `counterUtcMs: z.number().int().optional()`; new `setMemberStatusInputSchema = z.object({ roomId: z.string().min(1), alarmBlocked: z.boolean().optional(), wokeUp: z.literal(true).optional() }).refine(v => v.alarmBlocked !== undefined || v.wokeUp === true)`.
- Modify: `functions/src/callable/castVote.ts` — if `counterUtcMs` is present: require `choice === 'reject'` and `now + 60_000 <= counterUtcMs <= now + 7·86_400_000`, else `invalid-argument` before the transaction; store `counterUtcMs` on the vote doc.
- Modify: `functions/src/triggers/onProposalWrite.ts` — on reject, if the new vote has `counterUtcMs`, create a proposal with the same fields `transitionRoomStatus.ts` uses (target = `counterUtcMs`, createdBy = voter, `status: 'active'`, `expiresAt` = now + 90 s) and set room `status: 'VOTING'`; otherwise unchanged (`OPEN`).
- Modify: `functions/src/lib/roomFsm.ts` — add `{ from: 'FIRED', to: 'OPEN', trigger: 'alarm_expired' }` and `{ from: 'VOTING', to: 'VOTING', trigger: 'counter_offer' }`.
- Create: `functions/src/callable/setMemberStatus.ts` — auth + App Check + member check + `assertWithinRateLimit`; writes `alarmBlocked` and/or `wokeAt: Timestamp.now()` on `rooms/{roomId}/members/{uid}`.
- Create: `functions/src/scheduled/unlockFiredRooms.ts` — `onSchedule('every 5 minutes')`: for rooms with `status == 'FIRED'` whose `fired` proposal target ≤ now − 3_600_000: room `status: 'OPEN'`, `lastStatusChangeAt`; each member `alarmArmed: false, wokeAt: null`.
- Modify: `functions/src/index.ts` — export both new functions.
- Check `syncworld-backend/firestore/firestore.rules`: clients must not write `alarmBlocked`/`wokeAt` directly; add a rules test only if they currently can.
- Tests (mocking style of `__tests__/fsm.test.ts`): new `castVote.test.ts`, `setMemberStatus.test.ts`, `unlockFiredRooms.test.ts`; extend `fsm.test.ts`, `validation.test.ts`.

- [ ] **Step 1: Failing tests:** `rejects counter outside window` (now − 1 min and now + 8 days) with no transaction call; counter with `accept` → `invalid-argument`; reject + counter → new active proposal at the counter time and room `VOTING`; plain reject → `OPEN`; `setMemberStatus` non-member → `permission-denied`; `wokeUp` writes `wokeAt`; unlock flips a room whose alarm was 61 min ago and leaves one at 59 min; FSM allows `FIRED → OPEN`.
- [ ] **Step 2:** `cd syncworld-backend && npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` → all PASS; `npx tsc --noEmit -p functions` clean.
- [ ] **Step 5:** Commit `feat(functions): counter-offers, member status, unlock fired rooms`.

---

### Task 10: Wire the backend additions into the app

**Files:**
- Modify: `session.types.ts` — `SyncBackend.vote(roomId: string, proposalId: string, choice: VoteChoice, counterUtcMs?: number): Promise<void>`; add `setMemberStatus(roomId: string, s: { alarmBlocked?: boolean; wokeUp?: true }): Promise<void>`.
- Modify: `live.backend.ts` (`castVote` with `counterUtcMs`; new `setMemberStatus` callable), `demo.backend.ts` (counter → new proposal at that time with a fresh 90 s window and cleared votes; status → local member update; FIRED → OPEN 1 h after the alarm), `__tests__/demo.backend.test.ts`.
- Modify: `AppContext.tsx` — `onCounter(h)` votes no with `counterUtcMs = proposedUtc + h·3_600_000`; `onWakeUp` also calls `setMemberStatus(roomId, { wokeUp: true })` (errors → existing toast, navigation not blocked); where arming finds notification permission denied, call `setMemberStatus(roomId, { alarmBlocked: true })`.
- Modify: `RoomsScreens.tsx` — enable `+1 h` / `+2 h`.

- [ ] **Step 1: Failing tests** (demo backend): counter creates an active proposal at the counter time with no votes; `setMemberStatus({ wokeUp: true })` sets your `wokeAt`; a FIRED room is OPEN after 61 min of fake time past the alarm.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS. Web demo: `+1 h` reopens the vote an hour later; `I'M UP` fills your initials; after the unlock you can propose again (fixes "An alarm is already armed").
- [ ] **Step 5:** Commit `feat(app): counter-offers, wake receipts, auto-unlock`.

---

### Task 11: Rooms-list mini dials, remove the old scrubber, copy pass

**Files:**
- Modify: rooms list in `RoomsScreens.tsx` — 32 px `SkyDial mode="mini"` per row at the agreed/proposed time, else now.
- Delete: `src/features/rooms/components/TimeScrubber.tsx`, `MemberTimelines.tsx`, `scrubberBands.ts`, their tests, and the layout A/B toggle; remove the `enableSkyDial` flag and the old branch.

- [ ] **Step 1:** `grep -rn "TimeScrubber\|MemberTimelines\|scrubberBands\|enableSkyDial" syncworld-app/src` — list every hit to remove.
- [ ] **Step 2:** Make the changes.
- [ ] **Step 3:** `npx tsc --noEmit && npx jest` → PASS; the grep from Step 1 → no hits.
- [ ] **Step 4:** unslop `banned_phrase_scan` over the visible strings of changed `.tsx` files → 0 hits. Web check at 390 px: rooms list, room, vote, armed, ringing. Android emulator if available.
- [ ] **Step 5:** Commit `refactor(rooms): sky dial everywhere, drop slider`.
