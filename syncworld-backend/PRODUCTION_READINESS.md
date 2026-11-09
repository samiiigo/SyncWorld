# SyncWorld Backend: Production Readiness Audit

*Last updated 2026-11-09, after the frontend integration branch (`feat/frontend-integration`) and a live end-to-end run against the Firebase emulators + realtime server.*

Summary: auth, access control, input validation, rules, CORS, headers, logging and CI are in place. What's left before production is mostly operational: backups, rollback, alerting, dependency upgrades, and real App Check on clients.

---

## 1. AUTH & ACCESS

### Authentication method and implementation
- **Status**: **DONE**
- **File(s)**: `realtime-server/src/sockets/connection.ts`, `realtime-server/src/middleware/verifyAuthToken.ts`, every `functions/src/callable/*.ts`
- **Logic**: Firebase Auth ID tokens (the app signs in anonymously).
  - **Socket handshake**: token in `socket.handshake.auth.token`, verified with `firebase-admin.auth().verifyIdToken()`; `uid` attached to `socket.data.uid`. The client supplies a fresh token on every reconnect.
  - **Cloud Functions**: each callable rejects calls without `request.auth`.

### Authorization / access control (server-side enforcement)
- **Status**: **DONE**
- **File(s)**: `realtime-server/src/sockets/connection.ts`, `realtime-server/src/sockets/roomMembership.guard.ts`, `functions/src/callable/*.ts`, `firestore/firestore.rules`
- **Logic**:
  - Sockets: `join-room` checks `rooms/{id}/members/{uid}` once in Firestore, then caches it per socket; scrubber, presence and proposal events check that cache.
  - Callables: every room callable (`castVote`, `transitionRoomStatus`, `leaveRoom`, `registerPushToken`, `disarmAlarm`) requires the caller to be a member. `transitionRoomStatus` gained this check on 2026-11-09. Before that, any signed-in user who knew a roomId could cancel a vote or a locked alarm.
  - `FIRED` can only be set by the scheduled `fireAlarms` pipeline.

### App Check
- **Status**: **PARTIAL**
- **File(s)**: `functions/src/lib/appCheck.ts`, `realtime-server/src/sockets/connection.ts`
- **Logic**: Callables enforce App Check except when `FUNCTIONS_EMULATOR=true`. The realtime server verifies tokens but only warns while `ENFORCE_APP_CHECK=false`.
- **Missing**: The clients don't send App Check tokens yet. Native needs a dev build with `@react-native-firebase/app-check`, and web needs a reCAPTCHA Enterprise site key. **Deploying the callables before this ships will reject every real client.**

### Secrets/API key handling
- **Status**: **DONE**
- **Logic**: Secrets are read from `process.env` and validated with Zod. The service account arrives via `FIREBASE_SERVICE_ACCOUNT_JSON`. Gitleaks runs in CI with full history.

### Password/credential storage
- **Status**: **NOT APPLICABLE**: delegated to Firebase Authentication.

---

## 2. DATA

### Input validation per endpoint/function
- **Status**: **DONE**
- **File(s)**: `functions/src/lib/validation.ts`, `realtime-server/src/sockets/schemas.ts`
- **Logic**: Every callable, including the AI callables, parses its input with a Zod schema. Room callables go through `parseCallableInput`, so bad input returns `invalid-argument` naming the fields, never `INTERNAL`. Every socket event payload is parsed with `safeParse`.

### Firestore/DB security rules
- **Status**: **DONE**: covered by 8 rules tests (`npm run test:rules`).
- **Logic**: Clients can't write anything. Only members can read rooms, and `push_tokens` can't be accessed from clients at all.

### Backup/restore strategy
- **Status**: **MISSING**: no scheduled Firestore exports or PITR configuration.

### Migration handling for schema/data changes
- **Status**: **MISSING**: no migration scripts or strategy.

---

## 3. SECURITY BASELINE

### HTTPS / security headers
- **Status**: **DONE** (app level). `helmet()` sets the security headers, and TLS terminates at Fly.io.

### CORS configuration
- **Status**: **DONE**: Socket.io and Express accept only the comma-separated `ALLOWED_ORIGINS`. **Set it in production** to the web app's origin(s).

### Rate limiting on public endpoints
- **Status**: **DONE**
- **Logic**:
  - Sockets: a token bucket of 100 events/s.
  - Callables: a Firestore-backed `assertWithinRateLimit` on create, join, and AI (30 per window).
  - Express: `/room-lookup` is limited per uid.

### Dependency vulnerabilities
- **Status**: **PARTIAL**: `npm audit` still reports high-severity transitive issues (e.g. `tar` under Google Cloud dependencies). The CI security gate will flag these until they're upgraded or overridden.

---

## 4. RELIABILITY

### Error handling
- **Status**: **DONE**: callables throw sanitized `HttpsError`s (AI errors included). Sentry is wired into the realtime server when `SENTRY_DSN` is set.

### Logging
- **Status**: **DONE**: structured `pino` logging in the realtime server (pretty-printed in development).

### Push delivery
- **Status**: **DONE**: `fireAlarms` → `lib/pushDelivery.ts` sends Expo tokens to the Expo push API and FCM web tokens via `sendEachForMulticast`, and prunes invalid tokens. Devices with no push token register as `kind: 'local'`: they ring from their local notification or the in-app alarm, and still show as armed.

### Monitoring/alerting
- **Status**: **PARTIAL**: Sentry only. There are no alert rules or dashboards.

### External service failure handling
- **Status**: **PARTIAL**: Redis clients log errors and rely on ioredis's default reconnect. There's no explicit fallback if Redis stays down.

---

## 5. PROCESS

### Environment separation
- **Status**: **DONE**: Zod-validated env on both servers; `.firebaserc` per project. The app reads `EXPO_PUBLIC_*` (see `syncworld-app/.env.example`).

### CI/CD
- **Status**: **PARTIAL**
- **File(s)**: repo-root `.github/workflows/security-gate.yml`, `deploy-functions.yml`, `deploy-realtime-server.yml`
- **Logic**: These workflows moved to the repo root on 2026-11-09; under `syncworld-backend/.github/` they never ran. The security gate runs:
  - backend typecheck
  - frontend typecheck
  - jest
  - `npm audit`
  - rules tests (on the Firestore emulator)
  - gitleaks
- **Deploys**: these only run when the `FIREBASE_TOKEN` / `FLY_API_TOKEN` secrets exist.
- **Missing**:
  - Those repository secrets.
  - eslint: the `lint` script references it, but it isn't installed.
  - A CI job for the live end-to-end flow.

### Rollback plan
- **Status**: **MISSING**: no documented way to revert functions or the realtime server image.

---

## 6. VERIFICATION (2026-11-09)

- Backend: `npx jest` passes 64/64 (functions + realtime server); the rules tests pass 8/8; tsc is clean.
- Live end-to-end run (two browser clients, Auth/Firestore/Functions emulators, realtime server):
  1. Create a room, then join with the code; each client sees the other's presence.
  2. Scrubber positions persist.
  3. Propose, and the vote modal opens on both clients.
  4. A single No vetoes the round on both clients.
  5. A unanimous Yes sets LOCKED, and both clients reach "2/2 armed".
