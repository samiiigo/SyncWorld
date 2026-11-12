# SyncWorld Backend: Production Readiness Audit

*Last updated 2026-11-12, after the frontend integration branch (`feat/frontend-integration`), a live end-to-end run against the Firebase emulators + realtime server, and a dependency/lint pass.*

Summary: auth, access control, input validation, rules, CORS, headers, logging and CI are in place. What's left before production is mostly operational: backups, alerting, dev-tool dependency upgrades, and real App Check on clients.

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
- **Status**: **DONE for production dependencies, PARTIAL for dev tools**.
  - Production dependencies (`npm audit --omit=dev`): **no high or critical issues**. That required moving `zod` from 3 to 4 in both workspaces (GHSA-mrhx-c7xc-m3w5, memory exhaustion on oversized collections). A root `overrides` entry also pins `@modelcontextprotocol/sdk` (an optional peer of `@google/genai`) to zod 4. 12 moderate issues remain, all in Google Cloud transitive deps.
  - Dev tools only (`firebase-tools`, `firebase`, `@firebase/rules-unit-testing`): high and critical issues remain (`tar`, `basic-ftp`, `@grpc/grpc-js`). npm's only fix is downgrading to old major versions, so these wait for upstream releases. They run on developer machines and in CI, and are never deployed.
  - The CI gate runs `npm audit --omit=dev --audit-level=high`.
  - Note: a local npm configured for `registry.npmmirror.com` has no audit API. Run audits with `--registry=https://registry.npmjs.org`.

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
- **Lint**: the app uses eslint with `eslint-config-expo` (flat config), and CI runs it. The backend's `lint` is `tsc --noEmit`.
- **Missing**:
  - Those repository secrets.
  - A CI job for the live end-to-end flow.

### Rollback plan
- **Status**: **DOCUMENTED** (not yet rehearsed against a real project).
- **Realtime server (Fly.io, app `syncworld-realtime`)**:
  1. `flyctl releases --app syncworld-realtime --image` lists past releases with their image refs.
  2. `flyctl deploy --app syncworld-realtime --image <previous image ref>` redeploys a known-good image without rebuilding.
- **Cloud Functions**: there's no built-in "previous version" switch. Check out the last good commit and run `npx firebase deploy --only functions` from `syncworld-backend`. To pull a single broken function quickly: `npx firebase functions:delete <name>`. Clients then get `not-found` until you redeploy.
- **Firestore rules / indexes**: redeploy from the last good commit with `npx firebase deploy --only firestore:rules` (or `firestore:indexes`). The Firebase console also keeps the rules history, so you can roll back from there.
- **Data**: no rollback is possible until backups exist (see Backup/restore above).
- **Tip**: tag each production deploy (`git tag deploy-YYYYMMDD-N`) so "the last good commit" is easy to find.

---

## 6. VERIFICATION (2026-11-09)

- Backend: `npx jest` passes 64/64 (functions + realtime server); the rules tests pass 8/8; tsc and the build are clean. Re-verified on 2026-11-12 after the zod 4 upgrade (the rules tests weren't re-run, since the rules didn't change).
- Live end-to-end run (two browser clients, Auth/Firestore/Functions emulators, realtime server):
  1. Create a room, then join with the code; each client sees the other's presence.
  2. Scrubber positions persist.
  3. Propose, and the vote modal opens on both clients.
  4. A single No vetoes the round on both clients.
  5. A unanimous Yes sets LOCKED, and both clients reach "2/2 armed".
