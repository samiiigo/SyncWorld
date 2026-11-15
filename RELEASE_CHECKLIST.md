# SyncWorld release checklist

Last updated 2026-11-15, branch `feat/frontend-integration`.

This file is the single list of what must be true before SyncWorld can be called safe and publishable. Work through it top to bottom. Tick a box only after running the check written next to it.

Background and sources are in [reports/SyncWorld production readiness gaps.md](reports/SyncWorld%20production%20readiness%20gaps.md). Design proposals with mockups: https://claude.ai/artifact/1TiR8tn2ST9wva4terqJAF (private until its owner shares it).

## 1. Where the project stands

SyncWorld is a good product idea with a solid backend and an attractive web demo. It is not yet an app.

**What is strong**
- The idea is clear and different: a group picks one moment on a shared timeline, everyone must agree, and every device rings. Poll tools stop at "a date is chosen". Alarm apps don't help you choose.
- The backend is built carefully. Clients can't write to the database at all, every change goes through a server function, there are per-user rate limits, and 64 backend tests pass.
- The time logic is right: UTC everywhere, IANA zones for display, DST cases tested.
- The look is distinctive: the sky that follows the proposed time, the globe, the Sky Lane slider.

**What is weak**
- The core promise is unproven. The alarm is a normal notification. On an iPhone in Silent mode it will not ring. Nothing has been run on a real phone.
- Nobody can install it. There is no build setup, and the project is four Expo versions behind.
- The live backend would reject the app, because the server demands an App Check token the app never sends.
- The app has parts that only look finished. Settings shows a placeholder email, toggles that save nothing and "No blocked users" as fixed text.
- The scope is wide for a small team: phone, tablet, desktop web, 3D, an AI assistant. The alarm, which is the product, has had the least work.

**Recommendation.** Stop adding features until one real iPhone and one real Android phone ring on time, in Silent mode, from a room created against a deployed backend. Everything in sections A to C serves that goal. Judge progress by one number: the share of members' devices that actually rang.

## 2. How to use this file

- `[ ]` not done, `[~]` partly done, `[x]` done and checked.
- **Blocker** items stop a release. **Launch** items are needed for a public 1.0. **Later** items can wait.
- Each item says how to check it. If the check can't be run yet, the item stays open.
- When an item is done, add the commit hash or PR number after it.

## 3. Release gates

The app can go to the stores only when all of these are true.

- [ ] **G1.** A room created on a deployed backend rings an iPhone (iOS 26, Silent mode, Focus on) and an Android phone (locked, battery saver on) within 2 seconds of the agreed time. Repeated 20 times with no miss.
- [ ] **G2.** Every Blocker item below is ticked.
- [ ] **G3.** No high or critical findings open from the security section.
- [ ] **G4.** The end-to-end test (create, join, vote, arm) passes in CI on every pull request.
- [ ] **G5.** Privacy policy, terms, account deletion, and report and block are live and reachable from inside the app.
- [ ] **G6.** Crash-free sessions are at least 99.5% across a 14-day closed test with 12 or more testers.

## A. Build and release

- [ ] **A1 (Blocker).** `eas.json` exists with development, preview and production profiles. Check: `eas build --profile development --platform all` finishes.
- [ ] **A2 (Blocker).** `app.json` has `ios.bundleIdentifier`, `android.package`, `extra.eas.projectId`, `owner`, `ios.buildNumber` and `android.versionCode`. Check: `npx expo config --type public` shows them.
- [ ] **A3 (Blocker).** Expo upgraded from SDK 54 to 58, one version at a time. Check: `npx expo-doctor` is clean after each step and all tests pass.
- [ ] **A4 (Blocker).** The team tests on development builds, not Expo Go. Check: the dev build opens on one iPhone and one Android phone.
- [ ] **A5 (Launch).** `expo-updates` configured with a `runtimeVersion` policy. Check: a preview build receives an over-the-air update.
- [ ] **A6 (Launch).** Version numbers agree. `package.json` says 0.0.1 and `app.json` says 1.0.0 today.
- [ ] **A7 (Launch).** App icon, adaptive icon and splash are SyncWorld's own artwork, not the Expo template. Check: look at them on a device home screen.
- [ ] **A8 (Launch).** Google Play closed test started early. New personal accounts need 12 testers for 14 days.
- [ ] **A9 (Launch).** Android targets API 36. Check: the built manifest's `targetSdkVersion`.

## B. Alarm reliability

This is the product. It has had the least work.

- [ ] **B1 (Blocker).** iOS 26 and later uses AlarmKit with a fixed date, with `NSAlarmKitUsageDescription` set. Check: gate G1 on an iPhone.
- [ ] **B2 (Blocker).** iOS below 26 falls back to a time-sensitive notification, and the app tells the user plainly that Silent mode will mute it.
- [ ] **B3 (Blocker).** Android uses `setAlarmClock()` with a full-screen alert. Check: gate G1 on a locked Android phone.
- [ ] **B4 (Blocker).** Android re-sets alarms after a restart (`BOOT_COMPLETED`) and after a time or zone change. Check: arm, restart the phone, wait for the ring.
- [ ] **B5 (Blocker).** The exact-alarm permission has its own explainer screen, and a room shows who has not granted it. On Android 14 and later it is off by default.
- [ ] **B6 (Blocker).** The dead adapter `src/shared/lib/alarms/alarms.adapter.ts` (it throws "not implemented") is replaced by the real module or deleted.
- [ ] **B7 (Launch).** Each device reports "armed" only after the OS confirms the alarm is scheduled. Today "Armed" is shown after the app asks, not after the OS answers.
- [ ] **B8 (Launch).** Each device reports "rang" with a timestamp, and the room shows the count.
- [ ] **B9 (Launch).** The ringing screen has a clear stop control and opens when the alarm fires or is tapped. Today it still shows "Disarm Alarm", "Members arming" and "Fires in 0m 0s" while ringing.
- [ ] **B10 (Launch).** A room member who changes time zone after arming still rings at the same instant. Check: arm, change the device zone, wait.
- [ ] **B11 (Launch).** Tested on a Xiaomi and a Samsung phone with default battery settings. If the alarm is killed, the app shows the steps to exempt it.
- [ ] **B12 (Launch).** Server push stays a backup only. `fireAlarms` runs once a minute, so it can be up to 60 seconds late.
- [ ] **B13 (Launch).** Web and desktop say clearly that the alarm is best effort and needs the tab or installed app open.

## C. Security

- [ ] **C1 (Blocker).** The app sends App Check tokens: App Attest on iOS, Play Integrity on Android, reCAPTCHA Enterprise on web. Check: a callable succeeds against a deployed project with enforcement on.
- [ ] **C2 (Blocker).** The three AI functions in `functions/src/callable/aiFeatures.ts` call `assertAppCheck`. They cost money per call and are the only callables without it.
- [ ] **C3 (Blocker).** Separate staging and production Firebase projects. Today `.firebaserc` has only `syncworld-dev`.
- [ ] **C4 (Blocker).** A budget alert is set on the production project, and the Gemini key has a quota cap.
- [ ] **C5 (Launch).** AI responses are validated before being returned. Today the functions return `JSON.parse(...)` output as is (`aiFeatures.ts` lines 128, 196, 250). Add a zod schema and bound `targetTimeUtc` to the next 48 hours.
- [ ] **C6 (Launch).** User text sent to Gemini is delimited and treated as data. `userPrompt`, `meetingType`, `customPreferences` and display names are pasted straight into the prompt today.
- [ ] **C7 (Launch).** The realtime server enforces App Check. `ENFORCE_APP_CHECK` defaults to false.
- [ ] **C8 (Launch).** Room and display names pass a profanity and length filter on the server.
- [ ] **C9 (Launch).** Room codes can't be guessed in bulk. Check: the join rate limit (20 an hour) holds against a script, and codes come from a secure random source.
- [ ] **C10 (Launch).** `npm audit --omit=dev --audit-level=high` is clean in the app, functions and realtime server.
- [ ] **C11 (Launch).** No secrets in git history. Check: the gitleaks job passes on the full history. `.env` files are not tracked (verified 2026-11-15).
- [ ] **C12 (Launch).** CI actions are pinned to a commit. `deploy-realtime-server.yml` uses `setup-flyctl@master`.
- [ ] **C13 (Launch).** Sentry sample rates lowered from 1.0 in production, and no display names or room names are sent in events.
- [ ] **C14 (Launch).** Firestore rules tests cover every collection, including a test that a non-member can't read a room. Check: `npm run test:rules`.
- [ ] **C15 (Later).** When Google sign-in is added, guests are linked to the new credential, not signed in fresh, and Sign in with Apple is offered on iOS.

## D. Privacy and store rules

- [ ] **D1 (Blocker).** In-app "Delete my account and data", backed by a server function that removes memberships, votes and push tokens. Play also needs a public web page for deletion.
- [ ] **D2 (Blocker).** Report and block for rooms and members, with server support. The "No blocked users" text in Settings is a placeholder today.
- [ ] **D3 (Blocker).** Privacy policy and terms published, and linked from Settings and the store listings.
- [ ] **D4 (Blocker).** `ios.privacyManifests` filled in. Apple's App Privacy answers and Google's Data safety form match what the app really collects: display name, time zone, push token, crash data.
- [ ] **D5 (Launch).** Age rating questionnaires answered, with a 13+ minimum.
- [ ] **D6 (Launch).** A contact email for abuse reports is shown in the app.
- [ ] **D7 (Launch).** App Review notes include a demo path: how to create a room alone and trigger a test alarm in under a minute.
- [ ] **D8 (Launch).** Play declarations submitted for exact alarms and full-screen alerts.
- [ ] **D9 (Launch).** The AI feature says it sends member names and time zones to Google, and can be turned off.
- [ ] **D10 (Launch).** Rooms and their data are deleted after a set period. `cleanupOrphanedRooms` exists; write the retention period into the privacy policy.

## E. Architecture and code

- [ ] **E1 (Launch).** Remove the unused scaffold. There are 87 `TODO` comments and 5 files that throw "not implemented" under `syncworld-app/src`, mostly from the earlier restructure (`features/auth/auth.orchestrator.ts`, `rooms.repository.ts`, the scrubber and voting slices). Either implement them or delete them and their READMEs.
- [ ] **E2 (Launch).** Split `src/context/AppContext.tsx` (831 lines). It holds theme, toasts, sheets, the scrubber, voting, arming and room lifecycle, so any change re-renders every screen. Move room, vote and alarm state into zustand stores next to `session.store.ts`.
- [ ] **E3 (Launch).** Split `RoomsScreens.tsx` (897 lines) and `WorldPage.tsx` (1,148 lines) into one file per screen and component.
- [ ] **E4 (Launch).** One source of truth for design tokens. `SyncTheme` (`t.text`, `t.accent`) and `ColorPalette` (`colors.textPrimary`, `colors.primary`) both exist and screens mix them. Keep `ColorPalette`.
- [ ] **E5 (Launch).** Settings shows only what works. Remove or wire up the placeholder email, "Sign out" for guests (it loses their rooms), the notification toggles, "Show my status", "Cache size" and "Clear cache".
- [ ] **E6 (Launch).** The invite link uses a domain the team owns. `inviteLinkFor` returns `https://sync.app/j/CODE`, which is a placeholder.
- [ ] **E7 (Launch).** Deep links open the app: `syncworld://join/CODE` and the https link. Check: tap a link on a phone with the app installed and without.
- [ ] **E8 (Launch).** Socket event names are shared between app and server from one file, with a test that fails if they drift.
- [ ] **E9 (Launch).** The app and backend use the same major version of zod. The app is on 3, the backend on 4.
- [ ] **E10 (Launch).** Errors shown to users never include raw server messages. Check `describeBackendError` covers every callable error code.
- [ ] **E11 (Launch).** The app handles offline: a clear banner, queued votes rejected with a message, and the armed alarm still rings.
- [ ] **E12 (Launch).** The theme loads before the first frame. A light-mode user can see a dark flash at launch because settings load just after.
- [ ] **E13 (Launch).** `DESIGN.md` and `notes/current-status.md` describe the current app. `DESIGN.md` still describes the blue prototype look.
- [ ] **E14 (Launch).** With no Gemini key, the AI sheet hides the scores. It shows made-up values (92/100, 88/100) today.
- [ ] **E15 (Later).** All user-facing strings live in one place, ready for translation.
- [ ] **E16 (Later).** Native builds use React Native Firebase for offline cache and App Check; web keeps the JS SDK.

## F. Design and UX

Screens were checked from screenshots at 390 px and 1440 px, dark and light, on 2026-11-15.

**Bugs and rough edges**
- [ ] **F1 (Launch).** Ringing screen shows the wrong content. See B9.
- [ ] **F2 (Launch).** Create and Join sheet is a flat grey panel, the only opaque surface in the app. Make it glass with a grab handle.
- [ ] **F3 (Launch).** Rooms list is mostly empty space. A room card shows only its name and code. Show status, members and the next alarm.
- [ ] **F4 (Launch).** Vote card doesn't show what the time means for other people. Add each member's local time and mark who would be up late.
- [ ] **F5 (Launch).** Icons match the Figma file. The app uses Ionicons, Figma uses Phosphor.
- [ ] **F6 (Launch).** Button labels use one style. "Propose This Time" and "Create Room" are title case, the rest of the app is sentence case.
- [ ] **F7 (Launch).** The member time strip under the slider cuts off the sixth member with no hint that it scrolls.
- [ ] **F8 (Launch).** Every screen has loading, empty, error and offline states. Check each one by hand.
- [ ] **F9 (Launch).** "Lock screen preview" on the Armed screen matches what the real alarm looks like on each platform, or is removed.
- [ ] **F10 (Launch).** The Figma file matches the app, or is marked as out of date.
- [x] **F11.** Room subtitle spacing, mono time chips, one-line Settings values, brighter section labels, sentence-case tabs (commit `5ea9d67`).
- [x] **F12.** Light or dark choice is remembered (commit `98550b1`).

**Proposed redesigns** (mockups in the linked page)
- [ ] **F13.** Room: make the stacked Sky Lanes the main view, one lane per member, with one gold line through all of them.
- [ ] **F14.** Ringing: a full-screen sunrise with one large "I'm up" control and a live row of who has answered.
- [ ] **F15.** Armed: members sit around the globe as a ring that fills as each device confirms.
- [ ] **F16.** Vote: press and hold to agree, with the card filling gold as votes arrive.
- [ ] **F17.** Rooms list: cards with a mini sky strip, member stack and countdown.

## G. Accessibility

- [ ] **G-1 (Launch).** Text contrast is at least 4.5:1 over the animated sky in every sky period and both themes. Check with a contrast tool on screenshots of dawn, day, dusk and night.
- [ ] **G-2 (Launch).** With "Reduce Transparency" on, glass surfaces become solid.
- [ ] **G-3 (Launch).** With "Reduce Motion" on, the sky, globe, confetti and sheet animations stop. The sky and globe already do.
- [ ] **G-4 (Launch).** The time slider works without dragging: plus and minus buttons, and screen-reader adjust actions. Keyboard arrows already work on web.
- [ ] **G-5 (Launch).** A full pass with VoiceOver and TalkBack through create, join, vote and arm. Every control has a label and the vote result is announced.
- [ ] **G-6 (Launch).** Touch targets are at least 44 pt on iOS and 48 dp on Android. Check the calendar buttons (40 high) and the slider/timelines switch.
- [ ] **G-7 (Launch).** The app works at the largest system text size without clipped text.
- [ ] **G-8 (Launch).** Status is never shown by color alone. Online, idle and disconnected dots have text; check the late-night chips.

## H. Performance

- [ ] **H1 (Launch).** The sky and globe hold 50 frames a second or more on a low-end Android phone. If not, fall back to the static gradient there.
- [ ] **H2 (Launch).** WebGL pauses when the app is in the background or the screen is covered.
- [ ] **H3 (Launch).** Only one GL canvas is alive per screen.
- [ ] **H4 (Launch).** Cold start under 3 seconds on a mid-range phone.
- [ ] **H5 (Launch).** Dragging the slider doesn't re-render the member list on every frame. Check with the React profiler; this depends on E2.
- [ ] **H6 (Launch).** Web bundle size is recorded and three.js loads lazily after the first screen.
- [ ] **H7 (Later).** Battery use over an hour in an open room is measured.

## I. Testing and CI

Today: 43 app tests and 64 backend tests pass. Nothing tests screens, the live backend or a real device.

- [ ] **I1 (Blocker).** An end-to-end test covers create, join, scrub, propose, vote and arm with two clients against the emulators, and runs in CI.
- [ ] **I2 (Launch).** A veto test and a vote-expiry test at the same level.
- [ ] **I3 (Launch).** Tests for `live.backend.ts` against the emulators.
- [ ] **I4 (Launch).** CI builds the app on every pull request: web export and an EAS build.
- [ ] **I5 (Launch).** The security gate also runs on pushes to `main`, not only on pull requests.
- [ ] **I6 (Launch).** A written manual test plan for the alarm on real devices (section B), run before each release.
- [ ] **I7 (Launch).** DST tests cover the next two changeover dates for the US, EU and Australia.
- [ ] **I8 (Later).** Screenshot tests for the main screens in both themes.

## J. Operations

- [ ] **J1 (Launch).** Crash reporting in the app with `@sentry/react-native`.
- [ ] **J2 (Launch).** Firestore point-in-time recovery turned on in production.
- [ ] **J3 (Launch).** Alerts for function error rate, `fireAlarms` failures and the realtime server health check.
- [ ] **J4 (Launch).** The rollback steps in `PRODUCTION_READINESS.md` have been rehearsed once on staging.
- [ ] **J5 (Launch).** The realtime server still works if Redis is down, or fails with a clear message.
- [ ] **J6 (Launch).** A simple funnel is measured: rooms created, joined, proposals, locked, rang.
- [ ] **J7 (Later).** A status page or in-app notice for outages.

## K. Web and desktop

- [ ] **K1 (Launch).** A web manifest exists so the site installs as an app. `public/` has only the messaging service worker today.
- [ ] **K2 (Launch).** A VAPID key is set so web push works.
- [ ] **K3 (Launch).** Liquid glass falls back cleanly in Safari and Firefox. The refraction effect is Chromium only.
- [ ] **K4 (Launch).** The web app is hosted on the team's own domain with HTTPS, and that domain is in the realtime server's `ALLOWED_ORIGINS`.

## 4. Suggested order of work

1. **Build setup and Expo upgrade** (A1 to A4). Everything native depends on these.
2. **Native alarm on both platforms** (B1 to B6), tested on two real phones.
3. **App Check and environments** (C1 to C4), then the first run against a deployed backend.
4. **End-to-end test in CI** (I1).
5. **Ringing screen and receipts** (B7 to B9, F14, F15). This is where the design work pays off most.
6. **Store requirements** (section D), and start the Play closed test.
7. **Code cleanup** (E1 to E5), accessibility and performance passes.
8. **Design upgrades** (F13, F16, F17) and the growth features in the report.

## 5. Not yet verified

These need checking before dates are promised.

- Whether Apple accepts AlarmKit for an app that isn't an alarm clock.
- Whether Google Play grants the exact-alarm and full-screen permissions for this use.
- Which AlarmKit wrapper for React Native is maintained, or whether a custom module is needed.
- GL performance on any real phone.
- Whether the native calendar share sheet works on Android calendar apps.
- Whether Google will require verification for the calendar permission.
