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

## Visual layer (2026-11-14)
Code in `src/shared/visuals/`. It runs on iOS, Android and web; three.js and react-three-fiber render through `expo-gl` on native.
- **Sky gradient** (`ShaderGradient`, `SkyBackdrop`):
  - Ports ShaderGradient's noise-folded plane shader (github.com/ruucm/shadergradient, MIT).
  - Its colors follow the sky period (night, dawn, day, dusk) of your local time.
  - In a room it follows the proposed time instead (`useSkyStore`).
  - It sits once behind the tabs, plus once each on Onboarding and Armed.
  - With reduced motion it renders a still frame. Without GL it falls back to a linear gradient.
- **3D globe** (`Globe3D`, react-three-fiber):
  - Lit by the real sun position: it shows now on Onboarding and the alarm time on Armed.
  - One pin per member's time zone.
  - Latitude is approximate, because IANA zone names carry no coordinates.
- **Liquid glass** (`GlassLayer` / `GlassSurface`), by platform:
  - iOS 26: system Liquid Glass (`expo-glass-effect`).
  - Older iOS: blur.
  - Android: tint, sheen and rim, with no blur.
  - Web: backdrop blur, plus edge refraction ported from liquid-glass-js (github.com/dashersw/liquid-glass-js, MIT) as an SVG displacement map. The refraction works in Chromium only.
- **Accent:** now sunrise gold (`#E3A440` dark, `#8F5B12` light) instead of blue, to match the Figma file.
- **Overridden rule:** the Figma rules said "no background gradients"; the animated sky replaces that on request.
- **Verified:** web screenshots at 390 and 1440 px, dark and light, with no console errors. The Android bundle builds.
- **Not yet checked on a device:** GL performance on low-end Android. Native stack screens are now transparent, so the outgoing screen may show briefly during a push.

## Design pass (2026-11-14, second round)
- **Type:** Bricolage Grotesque everywhere, through `appFont` and `withAppFont`. Geist Mono for times and codes (`monoFont` and `withMonoFont`). The fonts are embedded by the `expo-font` plugin and loaded with `useFonts` for web and Expo Go.
- **Sky Lane:** the time slider track is now your sky across 48 hours (`skyRamp.ts`), with a gold meridian and a glass handle. The World tab's day bars use the same ramp.
- **Synced sky:** the gradient uses ShaderGradient's seamless loop, with its phase taken from UTC, so every device in a room shows the same motion. Stars appear at night.
- **Room constellation:**
  - Armed: gold arcs join the member pins on the globe.
  - Room list: each room has a 2D badge generated from its code (`ConstellationBadge`), replacing the emoji icons.
- **Ringing:** `SunOrb3D` (ShaderGradient's sphere mode) over a dawn sky.
- **Motion:** tokens in `src/shared/theme/motion.ts`, with press scale 0.97 and a strong ease-out.
- **Skills installed** (in `.claude/skills`): expo-design-system, vercel-react-native-skills, threejs-shaders, improve-animations.

## Open items
- **Design**: finish the screens above, then implement the new tokens, the two fonts, and the Sky Lane scrubber in the app.
- **App Check**: the client doesn't send tokens yet (native needs a dev build, web needs a reCAPTCHA key). The deployed callables require it.
- **Push setup**:
  - EAS `projectId`, needed for Expo push.
  - Bundle IDs (intentionally unset).
  - Web VAPID key.
- **Deferred**: iOS AlarmKit / Live Activity, Android exact alarms with a full-screen intent, and a Tauri desktop wrapper.
- Done 2026-11-12: the AI modal follows the light/dark theme; Android's Create sheet uses an M3 Extended FAB.

## 2026-11-15
- **Add to calendar** on the Armed screen: Google, Outlook, or an .ics file for any other calendar app. The code is in `src/shared/lib/calendar/` and has tests. The .ics file carries a reminder at the moment, which Apple Calendar honours. The invite link is left out while the domain is a placeholder. The native share sheet hasn't been tested on a device.
- **Theme:** the light/dark choice is now persisted (`settings.store.ts`). A brief dark flash at launch is still possible until the splash screen waits for settings to load.
- **Polish:**
  - The room subtitle has space below the header.
  - Member time chips use the mono font.
  - Settings values stay on one line.
  - Section labels are brighter over the sky.
  - Tab labels are sentence case.
- **Plan:** the polish list, the Google sign-in and Meet plan, and new feature ideas are in the addendum to `reports/SyncWorld production readiness gaps.md`.
