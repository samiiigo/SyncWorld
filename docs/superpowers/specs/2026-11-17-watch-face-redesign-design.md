# Watch-face redesign — design

Status: **draft, waiting for approval**. No app code changes until this is approved.
Date: 2026-11-17
Mockups: vote / armed / ringing screens — https://claude.ai/artifact/5VAgCPAhQwSCW6kwcFXYNh
(source: `directions/screens.html` and `directions/dial.html` in the session scratchpad)

## 1. Why

The current screens read as generic: glass cards, coloured bars, numbers in boxes. The user picked
direction B, a world-time watch, because it looks like a clock and shows the one thing the app is
about: *what time of day it is for each person*. Instead of arbitrary colours, every time is drawn as
the real sky for that hour, so "3 AM for Sydney" looks like night without reading a number.

## 2. Goals

1. One visual idea, the **sky dial**, used on the room, vote, armed and ringing screens.
2. Hours are easy to read: 12 AM / 6 AM / 12 PM / 6 PM marks with AM/PM words, no 24h maths.
3. Sky colours, sun, crescent moon, stars and weather follow the real local time and conditions.
4. The sun and moon travel fully off the frame and back in, so time passing feels continuous.
5. Phone first (iOS, Android, phone-width web). Must stay smooth at 60 fps on a mid-range Android.

## 3. Not in scope

- The desktop/Mac/Windows layout. Agreed rules are saved for later (thin non-scaling hairlines,
  solid panels behind text, three columns, keyboard support). Do not start it in this work.
- Native alarm work (AlarmKit, Android full-screen intent). Separate track.
- Google sign-in and Meet links. Separate track; the ringing screen only reserves a "Join call" slot.

## 4. Things to avoid

- Decorative effects that hide data: no blur behind text, no glow on numbers.
- Colour as the only signal. Late/early times are orange **and** carry a word ("early", "late").
- Motion that never stops. Stars twinkle slowly; everything respects the OS "reduce motion" setting.
- Text written in the AI register (checked with unslop before merge).

## 5. Approaches that were considered

| | Idea | Result |
|---|---|---|
| A | Horizontal sky lanes, one per member | Clear, but looked like any timeline app |
| **B** | **Sky dial: a 24h sky ring rotating behind a fixed city bezel** | **Chosen** |
| C | Departure-board grid | Good for many members, weak identity |

## 6. The sky dial (decided)

**Geometry** (viewBox 200×200, pure functions in `skyGeometry.ts`):
- Fixed bezel: each member's city sits at angle `(offset − myOffset) × 15°`. You are always at the top.
- Rotating ring: 24 h of sky, rotated by `−localHour(utc, me) × 15°`. Dragging the ring changes the
  proposed time in 15-minute steps.
- Four upright labels on the ring: 12 AM, 6 AM, 12 PM, 6 PM.
- Centre "window": sky gradient above a horizon at y = 108, ground below. The time readout sits on the
  ground so the sun never covers it.
- Sun is visible 6 AM–6 PM, moon 6 PM–6 AM, both on `arc(t) = [100 − 57·cos(πt), 116 − 42·sin(πt)]`,
  which starts and ends below the window edge, so each body fully leaves and re-enters.

**Colour** (`skyColors.ts`, pure, unit-tested): key stops for night, dawn, morning, noon, golden hour,
dusk, interpolated by local minutes. Gold `#E3A440` marks "you". Orange marks times before 7 AM or
after 11 PM.

**Night sky:** crescent moon (a circle masked by an offset circle), about 20 stars with slow twinkle,
and an occasional shooting star (dash-offset animation, at most one every ~12 s, off under reduce motion).

**Weather:** clouds, rain streaks or fog (blurred band) drawn in the window for the shown city.
Data from **Open-Meteo** (no API key, only lat/long of the city). Cached 30 min per city. If the call
fails, show a clear sky — the dial must never wait on weather.

## 7. Screens (decided)

**Room** — full dial, member table under it (name, local time, "early/late" tag, weather glyph),
"Propose this time" button.

**Vote** — small dial frozen at the proposed time, the time in large type, countdown line
("2 of 5 agreed · 1:12 left"), member table with Agreed / Waiting. Primary action is
**hold to agree** (0.6 s fill) so a pocket tap can't vote. Secondary row: **+1 h**, **+2 h**, **No**.
Any No still vetoes (unanimous rule unchanged); +1 h / +2 h veto *and* propose the new time in one step.

**Armed** — full dial stopped at the agreed time; each city tick turns gold once that phone has
confirmed its alarm, dashed until then. Centre shows the countdown. One plain note names who isn't
ready ("Marcus hasn't allowed alarms yet · Remind"). Then the calendar row (Google / Outlook / .ics,
already built) and Disarm.

**Ringing** — full-screen sky for the alarm moment (sunrise animation if it's morning, stars if
night), very large local time, "I'M UP" bar at the bottom (already wired to `onWakeUp`), a
"who's up" strip, "Nudge the others". "Join call" appears only if the room has a call link.

**Rooms list** — each room row gets a 32 px mini dial showing the agreed or proposed time; no other
change.

## 8. Backend additions needed

| Need | Change | Used by |
|---|---|---|
| Phone confirmed its alarm | `members/{uid}.alarmState: 'none' \| 'armed' \| 'blocked'` written by the client after scheduling | Armed ticks, "who isn't ready" note |
| Who's up | `members/{uid}.wokeAt: Timestamp`, set by "I'M UP" | Ringing "who's up" strip, Nudge |
| Counter-offer | `castVote` accepts `{ vote: 'no', counter?: utcIso }`; on veto, server opens a new proposal at `counter` | Vote +1 h / +2 h |
| Room unlocks after ringing | Server moves the room from LOCKED to IDLE after the alarm time + 1 h | Fixes "an alarm is already armed" bug |

All writes go through existing callables with Zod validation and rules tests; no new collections.

## 9. Building blocks in the app

- Add `react-native-svg` (not installed yet; `npx expo install react-native-svg`). Reanimated 4 is
  already present for animation.
- `src/shared/sky/skyGeometry.ts`, `skyColors.ts` — pure functions, jest tests.
- `src/shared/sky/SkyDial.tsx` — props `{ utcMinutes, me, members, mode: 'full' | 'mini', interactive,
  weather? }`.
- `src/shared/sky/SkyWindow.tsx` — the centre scene (also used full-screen by Ringing).
- `src/shared/lib/weather/openMeteo.ts` — fetch + cache, returns `'clear' | 'cloud' | 'rain' | 'fog'`
  and °C.
- Screens rewire to these: `RoomsScreens.tsx`, the vote modal, `ArmedPage.tsx`, the ringing state.
- `TimeScrubber.tsx` and `MemberTimelines.tsx` are replaced by the dial; delete after the switch.

## 10. Build order

1. Pure sky maths (`skyGeometry`, `skyColors`) with tests.
2. `SkyDial` static render on the room screen behind a feature flag; compare to the mockup.
3. Drag to change time (15-min snap, haptic tick on native).
4. Sun/moon/stars/shooting star + reduce-motion handling.
5. Open-Meteo weather.
6. Vote screen (hold to agree; +1 h/+2 h shown but disabled until step 8).
7. Armed + Ringing screens.
8. Backend: `alarmState`, `wokeAt`, counter-offer, auto-unlock — with tests — then enable the UI.
9. Rooms list mini dials; remove old scrubber; unslop pass on all copy.

Each step: `tsc --noEmit`, jest, and a screenshot check at 390 px web plus Android emulator.

## 11. Accessibility

- Dial is one accessible "adjustable" element: label "Proposed time 9:15 AM Tuesday", swipe up/down
  moves 15 minutes. Member table carries the same information as text.
- Text contrast ≥ 4.5:1 on every sky colour (the readout sits on the solid ground, not the sky).
- Hold-to-agree has a screen-reader alternative: a normal double-tap action.
- Reduce motion: no twinkle, no shooting star, sun/moon jump instead of glide.

## 12. Left to the builder

Exact sky colour stops, star count, cloud shapes, and animation timings may be tuned during build as
long as the screenshots still match the mockups.

## 13. Open questions for approval

1. Hold-to-agree: keep (safer) or plain tap (faster)? Recommendation: keep.
2. Weather source Open-Meteo is fine for a free app; for a paid release its licence requires
   attribution — OK to show "Weather: Open-Meteo" in Settings → About?
3. Auto-unlock one hour after the alarm — right length?
