# SyncWorld: Current Project State (local codebase audit, 2026-11-14)

Scope: local repo `C:/Users/User/Desktop/CS/SyncWorld`, branch `feat/frontend-integration` (HEAD `68959a9`, working tree clean at audit time). Sources are file paths with line numbers, relative to the repo root. Nothing in the repo was modified. `.env` contents were not read.

## 1. Features: what is implemented end to end, and what is demo-only vs live

### Takeaway
The core loop (onboarding, create/join, 48h scrubber, unanimous vote with veto, armed screen, disarm/leave, presence) runs on both a simulated demo backend and a live Firebase + Socket.io backend. It has been verified end to end only against local emulators with two web clients, never against a deployed Firebase project or on an iOS device. Demo mode is the default when nothing is configured. AI suggestions fall back to a hard-coded mock in demo mode.

### Cited Findings
- One `SyncBackend` interface with two implementations: `demo.backend.ts` (simulated members, no network, the default when nothing is configured) and `live.backend.ts` (Firebase anonymous auth, callables, Firestore listeners, Socket.io for scrubbing/presence). — [syncworld-app/notes/current-status.md:11-13](syncworld-app/notes/current-status.md)
- The backend is chosen at runtime: `loadEnvConfig().demoMode ? createDemoBackend() : createLiveBackend()`. — [syncworld-app/src/context/AppContext.tsx:265](syncworld-app/src/context/AppContext.tsx)
- Demo mode defaults on unless a real Firebase config is present or emulators are requested: `demoMode: env.demoMode ?? (!hasRealFirebase && env.useEmulators !== true)`. — [syncworld-app/src/config/env.ts:48](syncworld-app/src/config/env.ts)
- Flows listed as working: onboarding, create/join a room, permission priming, 48h scrubber with late-night warnings and keyboard support, unanimous vote with veto, armed screen with the members-arming grid, disarm and leave. — [syncworld-app/notes/current-status.md:14-21](syncworld-app/notes/current-status.md)
- Live backend details: anonymous sign-in (`signInAnonymously`, line 68), all writes through `httpsCallable` (line 74), Firestore `onSnapshot` listeners for room, members, proposal and votes (lines 159-221), and a Socket.io client that sends a fresh ID token on reconnect, with `reconnectionDelay` 500 to `reconnectionDelayMax` 8000 (lines 256-267). It emits `join-room`, presence heartbeat, scrubber update and scrubber proposal (lines 271-302). — [syncworld-app/src/features/session/backends/live.backend.ts](syncworld-app/src/features/session/backends/live.backend.ts)
- Live end-to-end verification (2026-11-09): two browser clients against the Auth/Firestore/Functions emulators plus the realtime server. Create then join by code, presence on both clients, scrubber positions persist, propose opens the vote on both, a single No vetoes, unanimous Yes sets LOCKED and both reach "2/2 armed". — [syncworld-backend/PRODUCTION_READINESS.md:139-144](syncworld-backend/PRODUCTION_READINESS.md)
- Platform verification: web at 390/820/1440 px in demo and live (emulators); Android "bundle builds"; iOS "not run (needs a Mac or an EAS build)". — [syncworld-app/notes/current-status.md:32-35](syncworld-app/notes/current-status.md)
- AI suggest: `callAi` returns null in demo mode "so callers use the local fallback" (lines 31-34). `optimizeSchedule` falls back to a fixed mock slot ("Immediate Overlap Window", harmonyScore 92) and the string `'Generated using local mock.'` after a 1 s timeout (lines 47-73). A leftover comment reads "Mock implementation until Firebase is fully connected in the client" (line 48). — [syncworld-app/src/shared/lib/ai/aiService.ts](syncworld-app/src/shared/lib/ai/aiService.ts)
- The backend AI callables are `optimizeSchedule`, `parseNaturalLanguageSchedule` and `getTimezoneInsights`, all using model `'gemini-3.7-flash'` (lines 38, 100, 126, 167, 187, 220), rate limited to `AI_RATE_LIMIT_PER_HOUR = 30` (lines 12, 23). — [syncworld-backend/functions/src/callable/aiFeatures.ts](syncworld-backend/functions/src/callable/aiFeatures.ts)
- The spec's onboarding asks for a display name and permissions, silently records the IANA time zone, and issues a persistent anonymous session. — [SyncWorld-Master-Spec.md:21](SyncWorld-Master-Spec.md)

### Inferences
- "Wired to live backend" means wired and tested against emulators. No deployed environment has run the live path, and the deployed callables would currently reject real clients over App Check (see section 4).
- The visible Settings toggles (privacy "show status", "open invite", "No blocked users") look UI-only. I found no backend support for blocking or for these preferences (see section 2).

### Gaps
- I could not run the app, so the claims about working flows come from the project's own notes, not from my own execution.
- I did not trace `parseNaturalLanguage` or `getTimezoneInsights` fallbacks line by line. I assume they mirror `optimizeSchedule`, but I did not confirm it.

## 2. Auth, accounts and profile

### Takeaway
Auth is Firebase anonymous only. There is no account upgrade or linking (Google/Apple/email), no account deletion, and no server-side profile. The Settings "Account" page shows a hard-coded placeholder email. The spec calls for Google, Apple and anonymous sign-in.

### Cited Findings
- Live sign-in uses `signInAnonymously(auth)`. The only auth imports are `onAuthStateChanged`, `signInAnonymously` and `signOut`. — [syncworld-app/src/features/session/backends/live.backend.ts:10,68](syncworld-app/src/features/session/backends/live.backend.ts)
- Native auth persists through `initializeAuth(... getReactNativePersistence(AsyncStorage))`. Web uses `getAuth`. — [syncworld-app/src/shared/lib/firebase/firebase.app.ts:29-41](syncworld-app/src/shared/lib/firebase/firebase.app.ts)
- The backend doc confirms "Firebase Auth ID tokens (the app signs in anonymously)". — [syncworld-backend/PRODUCTION_READINESS.md:14](syncworld-backend/PRODUCTION_READINESS.md)
- The spec's tech table lists "Firebase Auth (Google, Apple, Anonymous) + JWT" (line 116) and mentions email/password and social login flows (line 424). — [SyncWorld-Master-Spec.md](SyncWorld-Master-Spec.md)
- The Settings account page has an editable name field and a sign-out handler, but the email shown is the literal `you@example.com`. — [syncworld-app/src/features/settings/pages/SettingsDetailScreen.tsx:89-107](syncworld-app/src/features/settings/pages/SettingsDetailScreen.tsx)
- Sign-out goes through `backend.signOut()`. — [syncworld-app/src/context/AppContext.tsx:706-712](syncworld-app/src/context/AppContext.tsx)
- The Firestore `/users/{userId}` collection is "Reserved for a future user profile feature... Nothing currently writes to this collection". — [syncworld-backend/firestore/firestore.rules:17-22](syncworld-backend/firestore/firestore.rules)
- Searching the app for `deleteUser`, `linkWith`, `signInWith` and "delete account" found nothing. A privacy page exists, with only local toggles and the static text "No blocked users". — [syncworld-app/src/features/settings/pages/SettingsDetailScreen.tsx:170-187](syncworld-app/src/features/settings/pages/SettingsDetailScreen.tsx)
- The auth scaffolding files are unimplemented TODO stubs (`bootstrapIdentity`, `createIdentityRepository`) and nothing imports them. — [syncworld-app/src/features/auth/auth.orchestrator.ts:21-25](syncworld-app/src/features/auth/auth.orchestrator.ts), [auth.repository.ts:23](syncworld-app/src/features/auth/auth.repository.ts)

### Inferences
- Signing out of an anonymous account loses that identity permanently, so the user also loses room membership.
- Because accounts can be created in the app, Apple's in-app account deletion requirement (App Store guideline 5.1.1(v)) probably applies. The report writer should check that against best-practice research; I could not verify it here.

### Gaps
- I found no in-repo record of where the display name is stored (local store or member doc). `session.store.ts:31` uses zustand `persist`, which suggests local storage.

## 3. Alarms and notifications

### Takeaway
On iOS and Android, a room lock schedules one expo-notifications local notification (a DATE trigger). Android uses a MAX-importance "alarms" channel with `bypassDnd`, and iOS uses the `timeSensitive` interruption level. On web, alarms are an in-tab `setTimeout` plus the Notification API, and FCM web push works only when a VAPID key is set. Remote push needs an EAS projectId, which does not exist yet. The spec's AlarmKit (iOS 26), Android exact alarms, full-screen intents and BOOT_COMPLETED handling are all deferred. The adapter for them throws "not implemented" and nothing imports it.

### Cited Findings
- The device alarm module explains the design: a local notification on native, plus an Expo push token for the backend. On web, the Notification API while the tab is open, plus FCM web push through a service worker when it is closed. "Browsers can't do true OS alarms." — [syncworld-app/src/shared/lib/alarms/alarmDevice.ts:1-13](syncworld-app/src/shared/lib/alarms/alarmDevice.ts)
- The Android channel `alarms` is set to `AndroidImportance.MAX`, vibration, PUBLIC lockscreen visibility and `bypassDnd: true`. — [alarmDevice.ts:46-56](syncworld-app/src/shared/lib/alarms/alarmDevice.ts)
- The native schedule is `scheduleNotificationAsync` with a `DATE` trigger, `interruptionLevel: 'timeSensitive'` and `sound: 'default'`. The ID is stored in AsyncStorage. — [alarmDevice.ts:102-117](syncworld-app/src/shared/lib/alarms/alarmDevice.ts)
- The web alarm is a `setTimeout` that shows `new Notification(... requireInteraction: true)` only if the tab is still open. — [alarmDevice.ts:90-99](syncworld-app/src/shared/lib/alarms/alarmDevice.ts)
- Push registration returns null without an EAS projectId, in Expo Go on Android, or on web without a VAPID key. "The local alarm still fires in those cases." — [alarmDevice.ts:139-154](syncworld-app/src/shared/lib/alarms/alarmDevice.ts)
- Web push registers `/firebase-messaging-sw.js?config=...` and calls `getToken` with the VAPID key. — [alarmDevice.ts:156-173](syncworld-app/src/shared/lib/alarms/alarmDevice.ts); the service worker is at [syncworld-app/public/firebase-messaging-sw.js](syncworld-app/public/firebase-messaging-sw.js)
- Devices without a token register as `kind: 'local'`. — [syncworld-app/src/features/session/backends/live.backend.ts:322](syncworld-app/src/features/session/backends/live.backend.ts)
- Backend push: `fireAlarms` runs every 1 minute. Expo tokens go to the Expo push API and FCM web tokens go through `sendEachForMulticast`. Invalid tokens are pruned. — [syncworld-backend/functions/src/scheduled/fireAlarms.ts:6](syncworld-backend/functions/src/scheduled/fireAlarms.ts), [syncworld-backend/PRODUCTION_READINESS.md:92-93](syncworld-backend/PRODUCTION_READINESS.md)
- Open push setup items: the EAS `projectId` for Expo push, bundle IDs ("intentionally unset") and the web VAPID key. Deferred: "iOS AlarmKit / Live Activity, Android exact alarms with a full-screen intent, and a Tauri desktop wrapper". — [syncworld-app/notes/current-status.md:88-92](syncworld-app/notes/current-status.md)
- The spec requires AlarmKit on iOS 26+ with a full-screen alarm and an "I'm awake" AppIntent, falling back to a critical push plus `UNUserNotificationCenter` (line 289). On Android it requires `setExactAndAllowWhileIdle`, `USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM`, `setFullScreenIntent`, `WAKE_LOCK` and `BOOT_COMPLETED` re-registration (line 292). It also requires the `NSAlarmKitUsageDescription` plist key and permission prompts timed just before the first create/join (line 308). — [SyncWorld-Master-Spec.md](SyncWorld-Master-Spec.md)
- `createNativeAlarmAdapter` throws `'createNativeAlarmAdapter not implemented'` and carries TODOs for exact alarms, the Android 12+ check, BOOT_COMPLETED and battery optimization. Nothing imports it. — [syncworld-app/src/shared/lib/alarms/alarms.adapter.ts:12-22](syncworld-app/src/shared/lib/alarms/alarms.adapter.ts)
- `app.json` declares no `expo-notifications` config plugin, no Android permissions (for example `USE_EXACT_ALARM` or `POST_NOTIFICATIONS`), no iOS `infoPlist`, and no custom alarm sound. Its plugins are only expo-font, expo-router, expo-screen-orientation and expo-asset. — [syncworld-app/app.json:31-54](syncworld-app/app.json)

### Inferences
- iOS local notifications without AlarmKit or the Critical Alerts entitlement will not ring through silent mode or Focus the way an alarm clock does. `timeSensitive` also needs the Time Sensitive Notifications entitlement, and I found no config that sets it.
- The web alarm is unreliable when the tab is closed or throttled unless FCM web push is configured, and the VAPID key is still missing.
- I found no handling for a device's time zone changing between lock and fire. The spec relies on AlarmKit's relative mode for this ([SyncWorld-Master-Spec.md:78](SyncWorld-Master-Spec.md)), and a DATE trigger at a UTC instant is unaffected anyway.

### Gaps
- I could not confirm from the code whether the in-app "Alarm ringing" screen (`SunOrb3D` over a dawn sky, per [current-status.md:81](syncworld-app/notes/current-status.md)) opens when a notification is tapped. I did not trace the notification response listener.

## 4. Backend: functions, rules, rate limiting, App Check, realtime server, deployment, environments

### Takeaway
The backend has 14 Cloud Functions (10 callables: 7 room + 3 AI; 1 Firestore trigger; 3 scheduled), deny-all-client-writes Firestore rules, per-uid rate limits, and a Socket.io server on Fly.io (Dubai) with a Redis adapter, helmet, CORS allowlist and Sentry. The deployed room callables enforce App Check, but the client sends no App Check tokens. The AI callables skip the App Check assertion entirely. Only one Firebase project (`syncworld-dev`) is configured, and the deploy secrets are absent.

### Cited Findings
- Exported functions: `createRoom`, `joinRoom`, `castVote`, `transitionRoomStatus`, `leaveRoom`, `registerPushToken`, `disarmAlarm`, `onProposalWrite` (trigger), `expireProposals`, `fireAlarms`, `cleanupOrphanedRooms` (scheduled), plus AI `optimizeSchedule`, `parseNaturalLanguageSchedule` and `getTimezoneInsights`. That is 14 exports. — [syncworld-backend/functions/src/index.ts:17-29](syncworld-backend/functions/src/index.ts)
- Schedules: `expireProposals` and `fireAlarms` run every 1 minute; `cleanupOrphanedRooms` runs every 24 hours. — [functions/src/scheduled/expireProposals.ts:5](syncworld-backend/functions/src/scheduled/expireProposals.ts), [fireAlarms.ts:6](syncworld-backend/functions/src/scheduled/fireAlarms.ts), [cleanupOrphanedRooms.ts:7](syncworld-backend/functions/src/scheduled/cleanupOrphanedRooms.ts)
- Functions Sentry is initialized with `tracesSampleRate: 1.0` and `profilesSampleRate: 1.0` when `SENTRY_DSN` is set. — [functions/src/index.ts:4-12](syncworld-backend/functions/src/index.ts)
- `assertAppCheck` throws `failed-precondition` unless `request.app` is present or `FUNCTIONS_EMULATOR === 'true'`. — [functions/src/lib/appCheck.ts:11-15](syncworld-backend/functions/src/lib/appCheck.ts)
- `assertAppCheck` is called in createRoom, joinRoom, castVote, leaveRoom, transitionRoomStatus, registerPushToken and disarmAlarm. A grep found no call in `aiFeatures.ts`. — grep across [syncworld-backend/functions/src/callable/](syncworld-backend/functions/src/callable/) (for example `createRoom.ts:27`, `alarmDelivery.ts:28,61`)
- Searching the app for appcheck/app-check found nothing: the client does not send App Check tokens. — grep of `syncworld-app/src` and `syncworld-app/app`. The status doc says the same: "native needs a dev build, web needs a reCAPTCHA key. The deployed callables require it." — [syncworld-app/notes/current-status.md:87](syncworld-app/notes/current-status.md)
- "Deploying the callables before this ships will reject every real client." — [syncworld-backend/PRODUCTION_READINESS.md:30](syncworld-backend/PRODUCTION_READINESS.md)
- On the realtime server, `ENFORCE_APP_CHECK` defaults to false (warn-only). — [syncworld-backend/realtime-server/src/config/env.ts:10-15](syncworld-backend/realtime-server/src/config/env.ts)
- Rate limits: Firestore-backed fixed one-hour window (`RATE_LIMIT_WINDOW_MS = 60*60*1000`), stored in the `rate_limits/{uid}:{key}` collection (rateLimit.ts:5-8). createRoom allows 3 per hour (createRoom.ts:32), joinRoom 20 per hour (joinRoom.ts:23), AI 30 per hour (aiFeatures.ts:23). Sockets use a token bucket of 100 events/s, and `/room-lookup` is limited per uid. — [functions/src/lib/rateLimit.ts](syncworld-backend/functions/src/lib/rateLimit.ts); [PRODUCTION_READINESS.md:68-73](syncworld-backend/PRODUCTION_READINESS.md)
- Firestore rules: all client writes are denied. Rooms, members, proposals and votes are readable only by room members; `push_tokens` and `room_codes` are fully denied; `users/{uid}` can be read only by its owner. — [syncworld-backend/firestore/firestore.rules:1-52](syncworld-backend/firestore/firestore.rules)
- The `rate_limits` collection has no rule, so it is denied to clients by default. Admin SDK writes bypass rules. — [firestore.rules](syncworld-backend/firestore/firestore.rules) (absence)
- The realtime server uses helmet, CORS from `ALLOWED_ORIGINS`, an optional Redis adapter (`@socket.io/redis-adapter` + ioredis), Sentry, and pino logging. — [syncworld-backend/realtime-server/src/index.ts:1-64](syncworld-backend/realtime-server/src/index.ts); [PRODUCTION_READINESS.md:63-66,89-90](syncworld-backend/PRODUCTION_READINESS.md)
- Socket auth and membership: the ID token is verified at the handshake, the `rooms/{id}/members/{uid}` check is cached per socket, and presence heartbeats reject spoofed user IDs. — [PRODUCTION_READINESS.md:15,22](syncworld-backend/PRODUCTION_READINESS.md); [realtime-server/src/sockets/presence.handlers.ts:9-35](syncworld-backend/realtime-server/src/sockets/presence.handlers.ts)
- The realtime server's env defaults `FIREBASE_PROJECT_ID` to `'syncworld-dev'`. — [realtime-server/src/config/env.ts:6](syncworld-backend/realtime-server/src/config/env.ts)
- Fly.io: app `syncworld-realtime`, region `dxb`, `shared-cpu-1x`/256 MB, `min_machines_running = 1`, `auto_stop_machines = false`, connection limits 800 soft / 1000 hard, and an HTTP `/health` check every 30 s. — [syncworld-backend/realtime-server/fly.toml:4-42](syncworld-backend/realtime-server/fly.toml)
- `firebase.json`: functions runtime `nodejs20`, rules and indexes paths, and emulators for auth 9099, firestore 8085, functions 5001 and the UI. — [syncworld-backend/firebase.json:1-27](syncworld-backend/firebase.json)
- `.firebaserc` defines only `"default": "syncworld-dev"`, with no staging or prod aliases. — [syncworld-backend/.firebaserc:1-5](syncworld-backend/.firebaserc)
- The app env supports `EXPO_PUBLIC_ENVIRONMENT=development|staging|production`. — [syncworld-app/.env.example:8-9](syncworld-app/.env.example)
- Missing operations work: no backup/PITR, no migrations, monitoring is Sentry only with no alerts or dashboards, and there is no fallback if Redis stays down. — [PRODUCTION_READINESS.md:52-56,95-99](syncworld-backend/PRODUCTION_READINESS.md)
- Dependencies: production deps are clean at high/critical after the zod 4 upgrade, with 12 moderate issues left. Dev tools still carry high/critical issues (`tar`, `basic-ftp`, `@grpc/grpc-js`). — [PRODUCTION_READINESS.md:75-80](syncworld-backend/PRODUCTION_READINESS.md)
- The rollback plan is documented but "not yet rehearsed against a real project". — [PRODUCTION_READINESS.md:124-132](syncworld-backend/PRODUCTION_READINESS.md)
- `syncworld-backend/firestore-debug.log` exists in the backend directory (I did not check whether git tracks it). — directory listing

### Inferences
- The AI callables run without App Check, while the room callables require it. That is inconsistent, and since they call Gemini, they are the cost-bearing endpoints most open to abuse.
- `fireAlarms` running every minute gives backup pushes up to about 60 s of jitter. Its precision therefore depends on the device's local notification.
- Even with the client fixed, App Check on native needs `@react-native-firebase/app-check` in a dev build, and so a move away from Expo Go.
- The app pins zod `^3.25.76` ([syncworld-app/package.json:58](syncworld-app/package.json)) while the backend has moved to zod 4 ([PRODUCTION_READINESS.md:77](syncworld-backend/PRODUCTION_READINESS.md)). That is a minor version split across the workspaces.

### Gaps
- I did not inspect `firestore.indexes.json` or the room FSM in detail.
- Whether the realtime server persists scrubber state to Firestore (`persistenceManager.ts`) and how often: I saw the file but did not read it.

## 5. Quality: tests, lint, CI, E2E, crash reporting, analytics, accessibility, localization, legal, store metadata

### Takeaway
There are unit tests for app utilities, the demo backend, functions and the realtime server, plus Firestore rules tests, and a PR "Security Gate" CI runs typecheck, lint, tests, audit, rules tests and gitleaks. There are no E2E tests (no Detox or Maestro, and no CI job for the live flow). The app has no crash reporting or analytics. Accessibility work is partial, there is no localization, and there is no privacy policy or terms. Store metadata is minimal: no bundle IDs and no EAS project.

### Cited Findings
- App tests (by `it(`/`test(` count): `src/config/__tests__/env.test.ts` 5, `src/features/session/__tests__/demo.backend.test.ts` 7, `src/shared/lib/time/__tests__/time.conversions.test.ts` 15, `src/shared/visuals/__tests__/visuals.test.ts` 8. That is about 35 test blocks. The status note says "`npm test` (27 tests)", which may predate the visuals tests added on 2026-11-14. — grep of the test files; [syncworld-app/notes/current-status.md:30](syncworld-app/notes/current-status.md)
- Backend tests (by block count): functions are aiFeatures 6, createRoom 3, fsm 18, joinRoom 3, pushDelivery 6 and validation 5; the realtime server is handshake 4, membership 6 and scrubber 10; Firestore rules have 8. The doc says "jest passes 64/64" plus "rules tests pass 8/8"; my grep count is about 61 non-rules blocks, and the difference is probably parameterized tests. — [syncworld-backend/PRODUCTION_READINESS.md:138](syncworld-backend/PRODUCTION_READINESS.md)
- Nothing tests the live backend, the UI components or the screens. Jest's `testMatch` is `**/__tests__/**/*.test.ts?(x)`. — [syncworld-app/package.json:73-80](syncworld-app/package.json)
- Lint: eslint 9 flat config with `eslint-config-expo`, with `react/no-unknown-property` turned off for the visuals folder (r3f JSX). — [syncworld-app/eslint.config.js:1-15](syncworld-app/eslint.config.js). The backend's `lint` is `tsc --noEmit`. — [PRODUCTION_READINESS.md:119](syncworld-backend/PRODUCTION_READINESS.md)
- CI `security-gate.yml` runs on `pull_request` only. Its backend job does typecheck, lint, test, `npm audit --omit=dev --audit-level=high` and `test:rules` (on Java 21 for the emulator). Its frontend job does typecheck, lint and `npm test --if-present`. A secret-scan job runs gitleaks with full history. — [.github/workflows/security-gate.yml:1-86](.github/workflows/security-gate.yml)
- `deploy-functions.yml` runs on push to `main` (functions paths), typechecks, tests, and deploys only if `FIREBASE_TOKEN` exists. — [.github/workflows/deploy-functions.yml:1-46](.github/workflows/deploy-functions.yml)
- `deploy-realtime-server.yml` runs on push to `main`, tests, typechecks, and runs `flyctl deploy` with `FLY_API_TOKEN`. It has no secret-present guard and uses `superfly/flyctl-actions/setup-flyctl@master` (an unpinned ref). — [.github/workflows/deploy-realtime-server.yml:41-47](.github/workflows/deploy-realtime-server.yml)
- No CI workflow builds the app (no EAS build, no web export or deploy) and none runs E2E. The missing repository secrets and the missing CI job for the live end-to-end flow are listed as open. — [PRODUCTION_READINESS.md:120-122](syncworld-backend/PRODUCTION_READINESS.md)
- An empty leftover directory exists at `syncworld-backend/.github/workflows`. — directory listing; [PRODUCTION_READINESS.md:111](syncworld-backend/PRODUCTION_READINESS.md)
- Crash reporting and analytics: searching the app for sentry/analytics/crashlytics/posthog/amplitude found only README mentions. The app's package.json has no such dependency. Sentry exists only on the backend. — [syncworld-app/package.json:14-60](syncworld-app/package.json)
- Accessibility: `accessibilityLabel`/`accessibilityRole`/`accessible=` appear 77 times across 15 files in `src`/`app`. Reduced motion is respected in `Globe3D` (frameloop `demand`) and `ShaderGradient` (a still frame). — [syncworld-app/src/shared/visuals/Globe3D.tsx:284-307](syncworld-app/src/shared/visuals/Globe3D.tsx); [current-status.md:59](syncworld-app/notes/current-status.md). The status notes mention scrubber keyboard support. — [current-status.md:18](syncworld-app/notes/current-status.md)
- Localization: no i18n library (no `expo-localization` or i18n package in package.json). The notification copy carries "TODO: implement with i18n string interpolation". — [syncworld-app/src/shared/lib/notifications/notifications.events.ts:22](syncworld-app/src/shared/lib/notifications/notifications.events.ts). Strings are hard-coded in English (for example `alarmDevice.ts:87-88`).
- Privacy policy and terms: searching the repo found no policy or terms documents or links. The only "privacy" item is the Settings page with local toggles. — [syncworld-app/src/features/settings/hooks/useSettingsScreen.ts:13,39](syncworld-app/src/features/settings/hooks/useSettingsScreen.ts)
- Backend security policy doc: [syncworld-backend/SECURITY.md](syncworld-backend/SECURITY.md) exists (not reviewed in detail).
- Store metadata in `app.json`: name "SyncWorld", slug `syncworld-app`, `version` "1.0.0", icon/splash/adaptive-icon/favicon assets, scheme `syncworld`, `newArchEnabled: true`, `supportsTablet`. There is no `ios.bundleIdentifier`, no `android.package`, no `buildNumber`/`versionCode`, no `extra.eas.projectId`, no `owner`, no `runtimeVersion`/`updates`, and no web manifest settings (name, theme color). — [syncworld-app/app.json:1-56](syncworld-app/app.json)
- `package.json` version is "0.0.1" while app.json says "1.0.0". — [syncworld-app/package.json:3](syncworld-app/package.json), [app.json:5](syncworld-app/app.json)
- Assets present: `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` (I did not check whether these are the default Expo template images). `public/` contains only `firebase-messaging-sw.js`, with no `manifest.json`, even though the notes call the web build "installable as a PWA". — directory listing; [current-status.md:6](syncworld-app/notes/current-status.md)

### Inferences
- The test pyramid is backend-heavy. App-side live integration, UI and E2E coverage is zero, and the only end-to-end proof is a manual two-browser run.
- The PWA installability claim is doubtful without a manifest. Expo's web export may generate one from app.json, but this config sets no web name or theme color; I could not verify the output.

### Gaps
- I did not run tsc, lint or the tests, so pass/fail status comes from the docs.
- I did not quantify accessibility coverage per screen (labels on the scrubber, vote buttons and so on) beyond the raw counts.

## 6. Build and release: EAS, OTA, versioning, SDK version

### Takeaway
There is no `eas.json`, no EAS projectId, no expo-updates or OTA configuration, no app-build CI, and no versioning scheme. The app is on Expo SDK 54 (RN 0.81.5, React 19.1, New Architecture). iOS has never been built or run.

### Cited Findings
- `eas.json` is absent: `ls: cannot access 'eas.json'` in `syncworld-app/`. — directory listing
- SDK and runtime versions: `expo ~54.0.35`, `react-native 0.81.5`, `react 19.1.0`, `expo-router ~6.0.24`, `react-native-reanimated ~4.1.1`, `firebase ^11.0.0`, `jest-expo ~54.0.18`. — [syncworld-app/package.json:24,38,46,48,51,44,69](syncworld-app/package.json)
- `expo-updates` is not a dependency and app.json has no `updates`/`runtimeVersion`. — [package.json:14-60](syncworld-app/package.json), [app.json](syncworld-app/app.json)
- Native-only features already present need a dev build to work, among them App Check ("native needs a dev build") and remote push (null in Expo Go on Android). — [current-status.md:87](syncworld-app/notes/current-status.md); [alarmDevice.ts:139-142](syncworld-app/src/shared/lib/alarms/alarmDevice.ts)
- The how-to-run docs still describe `npm start` (Expo) as the run path. — [current-status.md:24-30](syncworld-app/notes/current-status.md)
- iOS is "not run (needs a Mac or an EAS build)". — [current-status.md:35](syncworld-app/notes/current-status.md)

### Inferences
- If the store version of Expo Go no longer opens SDK 54 projects (the coordinator's premise; I did not verify it locally), then physical-device testing needs either an SDK upgrade or a development build via EAS. Neither is set up. `expo-glass-effect` (iOS 26 Liquid Glass) and `expo-gl` likewise want a dev build for full fidelity.
- Release readiness is blocked at the configuration level (bundle IDs, projectId, eas.json, signing), before any store review.

### Gaps
- I did not check whether the `web` target is deployed anywhere (no hosting config found in `firebase.json`, which has no `hosting` key).

## 7. Design and UI state

### Takeaway
A heavy visual layer landed on 2026-11-14: a shader sky gradient, a 3D globe with three.js/r3f via expo-gl, platform-specific liquid glass, the Bricolage Grotesque and Geist Mono fonts, and a gold accent. It is verified only in web screenshots and an Android bundle build. Performance on low-end Android and native transitions are unchecked. The Figma redesign is incomplete and only partly implemented, and `DESIGN.md` is stale: it still describes a blue accent and "no decorative gradients".

### Cited Findings
- Visual layer components: `ShaderGradient`, `SkyBackdrop`, `Globe3D`, `SunOrb3D`, `ConstellationBadge`, `GLBoundary`, `glass/`, `skyRamp.ts`. — directory listing of [syncworld-app/src/shared/visuals/](syncworld-app/src/shared/visuals/)
- Sky gradient: ports ShaderGradient (MIT) and follows the local sky period, or the proposed time inside a room. Reduced motion shows a still frame; without GL it falls back to a linear gradient. — [current-status.md:54-59](syncworld-app/notes/current-status.md)
- Globe: lit by the real sun position, one pin per member time zone, with approximate latitude "because IANA zone names carry no coordinates". — [current-status.md:60-63](syncworld-app/notes/current-status.md)
- Liquid glass: iOS 26 system glass (`expo-glass-effect`), blur on older iOS, tint/sheen without blur on Android, and backdrop blur plus SVG refraction on web (Chromium only). — [current-status.md:64-68](syncworld-app/notes/current-status.md)
- Accent changed to sunrise gold `#E3A440`/`#8F5B12`. The "no background gradients" rule was overridden on request. — [current-status.md:69-70](syncworld-app/notes/current-status.md)
- "Not yet checked on a device: GL performance on low-end Android. Native stack screens are now transparent, so the outgoing screen may show briefly during a push." — [current-status.md:72](syncworld-app/notes/current-status.md). The latest commit `68959a9` reads "stop left screens showing through on web; frosted header band" (git log).
- Second design pass: fonts embedded via the `expo-font` plugin, the Sky Lane scrubber, a UTC-phased synced sky, constellation badges, `SunOrb3D` for ringing, and motion tokens in `src/shared/theme/motion.ts`. — [current-status.md:74-83](syncworld-app/notes/current-status.md); fonts in [app.json:32-45](syncworld-app/app.json)
- Figma: Foundations, Components and some phone screens exist. Not yet designed: the rooms list (with loading/empty/error states), join with a code, Settings, Alarm ringing, and tablet and desktop layouts. — [current-status.md:37-50,86](syncworld-app/notes/current-status.md)
- `DESIGN.md` still says "one accent (Action Blue)... no decorative gradients" with `primary #2997FF`. — [syncworld-app/src/shared/theme/DESIGN.md:6-9,29](syncworld-app/src/shared/theme/DESIGN.md)
- Responsive layout: tab bar on phones, side rail on tablet/desktop, and a rooms list plus detail split on desktop (`useDeviceClass`). — [current-status.md:6-9](syncworld-app/notes/current-status.md)

### Inferences
- The always-on GL (shader sky behind the tabs plus a 3D globe) is a battery and performance risk on mobile. The project itself flags it as unverified on devices.
- Design docs drift from the code (DESIGN.md versus the gold accent and sky), so the source of truth is unclear.

### Gaps
- I took no screenshots or runtime measurements, so frame rate and memory use are unknown.

## 8. TODOs, stubs and "not implemented" code

### Takeaway
About 77 TODO lines remain in the app. Almost all sit in an early "orchestrator/repository/adapter/slice" scaffold that nothing imports (dead code), and the real logic lives in `session/` and `AppContext.tsx`. Five adapters throw "not implemented". The backend source has no TODOs.

### Cited Findings
- TODO counts per file: feature-flags 2 (Remote Config not integrated), alarms orchestrator 3, repository 1, slice 8, auth orchestrator 5, repository 1, rooms orchestrator 3 (including "handle race conditions on simultaneous join" and "host reassignment on host disconnect"), repository 1, scrubber orchestrator 1, pipeline 4, slice 7, voting slice 6, orchestrator 3, repository 1, alarms.adapter 8, firebase.config 6, firestore.adapter 6, notifications.adapter 9, notifications.events 1, socket.adapter 8, store.root 3. — grep across `syncworld-app/src`
- Throwing stubs: `createNativeAlarmAdapter` ([shared/lib/alarms/alarms.adapter.ts:22](syncworld-app/src/shared/lib/alarms/alarms.adapter.ts)), `initFirebase` ([shared/lib/firebase/firebase.config.ts:17](syncworld-app/src/shared/lib/firebase/firebase.config.ts)), `createFirestoreAdapter` ([firebase.firestore.adapter.ts:20](syncworld-app/src/shared/lib/firebase/firebase.firestore.adapter.ts)), `createNotificationAdapter` ([shared/lib/notifications/notifications.adapter.ts:23](syncworld-app/src/shared/lib/notifications/notifications.adapter.ts)), `createSocketAdapter` ([shared/lib/socket/socket.adapter.ts:22](syncworld-app/src/shared/lib/socket/socket.adapter.ts)).
- Import check: `alarms.adapter`, `firebase.config`, `firebase.firestore.adapter`, `notifications.adapter`, `socket.adapter`, `store.root`, `alarms.orchestrator` and `rooms.orchestrator` each have 0 importers in `src`/`app`. — grep
- Feature flags: "TODO: integrate with Firebase Remote Config or a feature flag service". — [syncworld-app/src/config/feature-flags.ts:34-37](syncworld-app/src/config/feature-flags.ts)
- `src/services/ai/` is an empty directory; the AI client lives at `src/shared/lib/ai/aiService.ts`. — directory listing
- Searching the backend `functions/src` and `realtime-server/src` for TODO/FIXME/not implemented found nothing. — grep

### Inferences
- The dead scaffold, along with feature READMEs that describe it (for example `src/shared/lib/notifications/README.md`), can mislead contributors and tools about what is implemented. It is a cleanup item, not a functional gap. Still, several TODOs in it name real unaddressed concerns: host reassignment, offline bootstrap, battery-optimization warnings, BOOT_COMPLETED and sync-latency telemetry.

### Gaps
- I did not verify whether the live backend handles host reassignment or simultaneous-join races elsewhere (for example in the backend FSM or `onProposalWrite`).

## Environment and secrets notes (no values read)
- `syncworld-app/.env` exists (554 bytes; contents not read). `.env.example` lists `EXPO_PUBLIC_ENVIRONMENT`, `EXPO_PUBLIC_DEMO_MODE`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID` (default `demo-syncworld`), `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID`, `EXPO_PUBLIC_FIREBASE_VAPID_KEY`, `EXPO_PUBLIC_USE_EMULATORS`, `EXPO_PUBLIC_EMULATOR_HOST`, `EXPO_PUBLIC_{AUTH,FIRESTORE,FUNCTIONS}_EMULATOR_PORT` and `EXPO_PUBLIC_SOCKET_SERVER_URL`. — [syncworld-app/.env.example:8-39](syncworld-app/.env.example)
- The realtime server needs `FIREBASE_PROJECT_ID`, `REDIS_URL`, `SENTRY_DSN`, `ALLOWED_ORIGINS` and `ENFORCE_APP_CHECK` set as Fly secrets. — [syncworld-backend/realtime-server/fly.toml:13-16](syncworld-backend/realtime-server/fly.toml)
