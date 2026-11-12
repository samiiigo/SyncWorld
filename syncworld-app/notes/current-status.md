# Current Status (2026-11-12)

Branch `feat/frontend-integration`, based on the restructer merge.

## What works
- **Platforms**: one Expo codebase for iOS, Android and the web build. Windows and Mac use the web build, installable as a PWA. Layouts adapt by width (`useDeviceClass`):
  - phone: tab bar
  - tablet/desktop: side rail
  - desktop: rooms list plus room detail, side by side
- **Design**: SyncWorld tokens from the prototype (`DESIGN.md`), dark theme by default.
- **Session engine** (`src/features/session/`): one `SyncBackend` interface with two implementations:
  - `demo.backend.ts`: simulated members, no network. The default when nothing is configured.
  - `live.backend.ts`: Firebase anonymous auth, callables, Firestore listeners, and Socket.io for live scrubbing and presence.
- **Flows**:
  - onboarding
  - create or join a room
  - permission priming
  - 48h scrubber with late-night warnings and keyboard support
  - unanimous vote with veto
  - armed screen with the members-arming grid
  - disarm and leave
- **Alarms**: native schedules a local notification. Push goes through Expo (native) or FCM (web, needs a VAPID key).

## How to run
- `npm start` (Expo). With nothing configured it runs in demo mode. (Before 2026-11-12, the development default silently switched demo mode off and tried to reach the emulators. That's fixed and covered by `src/config/__tests__/env.test.ts`.)
- Against local backend:
  1. In `syncworld-backend`, start the emulators: `npx firebase emulators:start`.
  2. Start the realtime server: `node realtime-server/dist/index.js` with `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` set.
  3. In the app, set `EXPO_PUBLIC_DEMO_MODE=false` (see `.env.example`). Use the `EXPO_PUBLIC_*_EMULATOR_PORT` overrides if the default ports are taken.
- Checks: `npx tsc --noEmit`, `npm run lint` (eslint, `eslint-config-expo`), `npm test` (27 tests).

## Verified
- Web at 390, 820 and 1440 px widths (headless Chrome), in demo mode and live against the emulators with two clients.
- Android: bundle builds.
- iOS: not run (needs a Mac or an EAS build).

## Design (Figma, in progress)
- File: https://www.figma.com/design/fe3ivwIStcRAhMuNPOSmPq ("SyncWorld — Design"). Built to the `figma-designer` rules from github.com/elayadesign/ai-design-skills.
- **Concept:** each member is a strip of their local sky over the window, and the proposed time is one gold line through every strip.
- **Pages:**
  - **Foundations:**
    - color tokens: Core Colors plus a Color System with Light and Dark modes
    - spacing and radius scales
    - 28 text styles in Bricolage Grotesque, with Geist Mono for times
  - **Components:** Button (5 types × 5 states), Input (7 states), Avatar, Phosphor icons, and the Sky Lane (Day/Night × Regular/Compact).
  - **Screens:** Onboarding, Room, Vote and Alarm set (phone, dark), plus a Light copy of Room.
- **Not designed yet:**
  - Rooms list (with loading, empty and error states), Join with a code, Settings and Alarm ringing
  - tablet and desktop layouts
- **Not in the app yet:** these designs aren't implemented. The app still uses the prototype look described above.

## Open items
- **Design**: finish the screens above, then implement the new tokens, the two fonts, and the Sky Lane scrubber in the app.
- **App Check**: the client doesn't send tokens yet (native needs a dev build, web needs a reCAPTCHA key). The deployed callables require it.
- **Push setup**:
  - EAS `projectId`, needed for Expo push.
  - Bundle IDs (intentionally unset).
  - Web VAPID key.
- **Deferred**: iOS AlarmKit / Live Activity, Android exact alarms with a full-screen intent, and a Tauri desktop wrapper.
- Done 2026-11-12: the AI modal follows the light/dark theme; Android's Create sheet uses an M3 Extended FAB.
