# SyncWorld Backend: Production Readiness Audit

*Audit generated based on the codebase state as of the current date.*

---

## 1. AUTH & ACCESS

### Authentication method and implementation
- **Status**: **DONE**
- **File(s)**: `realtime-server/src/sockets/connection.ts` (L38-L50), `realtime-server/src/middleware/verifyAuthToken.ts`, `functions/src/callable/createRoom.ts` (L22)
- **Logic**: Relies on Firebase Auth ID tokens. 
  - **Socket Handshake**: Expects the token in `socket.handshake.auth.token`. It uses `verifyAuthToken` (which wraps `firebase-admin.auth().verifyIdToken()`) to decode the token. If valid, the resulting `uid` is attached to `socket.data.uid`.
  - **Cloud Functions**: Firebase SDK natively injects `request.auth`. The function aborts immediately if it is absent: `if (!request.auth) throw new HttpsError(...)`.

### Authorization / access control (server-side enforcement)
- **Status**: **DONE**
- **File(s)**: `realtime-server/src/sockets/connection.ts` (L88), `firestore/firestore.rules`
- **Logic**: Enforced entirely server-side. Before allowing a socket to join a room, it queries Firestore to ensure the user is an active member: `const memberAllowed = await isRoomMemberOriginal(roomId, uid)`. Firestore rules similarly enforce membership for reads (see Data section).

### Secrets/API key handling
- **Status**: **DONE**
- **File(s)**: `realtime-server/src/config/env.ts` (L11), `realtime-server/src/lib/firebaseAdmin.ts` (L7)
- **Logic**: Secrets are not hardcoded. They are read from `process.env` and strictly validated using Zod (`const parsedEnv = envSchema.safeParse(process.env);`). The Firebase Service Account is passed dynamically via `process.env.FIREBASE_SERVICE_ACCOUNT_JSON` and parsed on boot.

### Password/credential storage
- **Status**: **NOT APPLICABLE**
- **Reason**: The backend does not store passwords or manage credentials directly. It delegates entirely to Firebase Authentication.

---

## 2. DATA

### Input validation per endpoint/function
- **Status**: **PARTIAL**
- **File(s)**: `realtime-server/src/sockets/connection.ts` (L73), `functions/src/callable/createRoom.ts` (L30)
- **Logic**: Inputs are validated using Zod schemas. For example, `createRoom` uses `createRoomInputSchema.parse(request.data ?? {})`. Socket `join-room` uses `JoinRoomPayloadSchema.safeParse(payload)`.
- **Missing**: Status is PARTIAL as I am inferring that not *all* real-time events and callable functions have 100% Zod schema coverage. 

### Firestore/DB security rules
- **Status**: **DONE**
- **File(s)**: `firestore/firestore.rules` (L22-L43)
- **Logic**: Exceptionally strict deny-all writes for clients. 
  ```javascript
  match /rooms/{roomId} {
    allow read: if isRoomMember(roomId);
    allow create, update, delete: if false; // Only Cloud Functions can mutate
  }
  match /push_tokens/{userId} {
    allow read, create, update, delete: if false; // Completely locked from clients
  }
  ```

### Backup/restore strategy
- **Status**: **MISSING**
- **Reason**: There are no GCP scheduled backup scripts, Terraform configs, or GitHub actions related to Firestore snapshot exports or point-in-time recovery. 

### Migration handling for schema/data changes
- **Status**: **MISSING**
- **Reason**: There are no tools, scripts, or strategies (like Umzug, Firestore batch migration scripts) in the repository for handling breaking schema changes.

---

## 3. SECURITY BASELINE

### HTTPS enforcement
- **Status**: **PARTIAL**
- **File(s)**: `realtime-server/src/index.ts` (L29)
- **Logic**: The server spins up using `createServer(app)` which is raw HTTP. 
- **Missing**: While TLS termination is assumed to happen at the Cloud Run/Proxy layer, the Node application lacks strict application-level security headers (e.g., Helmet, HSTS enforcement) to instruct clients never to use HTTP.

### CORS configuration
- **Status**: **MISSING** (Too permissive)
- **File(s)**: `realtime-server/src/index.ts` (L31)
- **Logic**: Currently hardcoded to accept all origins, which is a significant security risk for a production app.
  ```typescript
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Vulnerable to Cross-Site WebSocket Hijacking
    },
  });
  ```

### Rate limiting on public endpoints
- **Status**: **DONE**
- **File(s)**: `realtime-server/src/sockets/connection.ts` (L11), `functions/src/lib/rateLimit.ts` (L7)
- **Logic**: 
  - Socket events: In-memory token bucket per socket ID limiting messages to 100/sec (`if (!checkRateLimit(socket.id)) { socket.disconnect(true); }`).
  - Express Endpoints: `createUidRateLimiter(60 * 1000, 5)` used on `/room-lookup`.
  - Cloud Functions: Uses a custom Firestore transaction-based limiter: `await assertWithinRateLimit(uid, 'create-room', 3);`

### Dependency vulnerabilities
- **Status**: **PARTIAL**
- **Result**: I ran `npm audit --registry=https://registry.npmjs.org` against the codebase.
- **Logic**: It identified 15 vulnerabilities (13 moderate, 2 high). High severity issues reside in the `tar` package (arbitrary file creation via hardlink traversal) deeply nested in Google Cloud dependencies. 
- **Missing**: A forced upgrade or package resolution is required before production.

---

## 4. RELIABILITY

### Error handling
- **Status**: **DONE**
- **File(s)**: `functions/src/callable/createRoom.ts` (L23), `realtime-server/src/index.ts` (L47)
- **Logic**: 
  - Express routes use Sentry: `Sentry.setupExpressErrorHandler(app);`
  - Cloud Functions explicitly throw `HttpsError` objects which Firebase sanitizes before sending to the client, preventing stack trace leaks: `throw new HttpsError('unauthenticated', 'You must be signed in to create a room.');`

### Logging
- **Status**: **PARTIAL**
- **File(s)**: `realtime-server/src/index.ts` (L40, L59)
- **Logic**: Currently uses standard `console.log()` and `console.warn()`. 
- **Missing**: Lacks a structured JSON logger (like Pino or Winston). In GCP Cloud Logging, these standard console logs will not be properly indexed as JSON objects with severity levels, making queries difficult.

### Monitoring/alerting
- **Status**: **PARTIAL**
- **File(s)**: `realtime-server/src/index.ts` (L17)
- **Logic**: Sentry is fully integrated with performance profiling if the DSN is provided.
  ```typescript
  Sentry.init({ dsn: realtimeServerEnv.SENTRY_DSN, integrations: [nodeProfilingIntegration()] })
  ```
- **Missing**: There are no alerting rules configured (e.g., PagerDuty routing) and no infrastructure-level monitoring configured in code (like Datadog agents or Google Cloud Monitoring dashboards).

### External service failure handling
- **Status**: **MISSING**
- **File(s)**: `realtime-server/src/index.ts` (L37)
- **Logic**: Redis is instantiated blindly: `const pubClient = new Redis(realtimeServerEnv.REDIS_URL);`. 
- **Missing**: There is no explicit retry logic, exponential backoff, or fallback mechanism if Redis disconnects, meaning Socket.io scaling will instantly fail without graceful degradation.

---

## 5. PROCESS

### Environment separation
- **Status**: **DONE**
- **File(s)**: `realtime-server/src/config/env.ts`, `functions/src/lib/env.ts`
- **Logic**: The app strictly requires runtime environment variables. It enforces types and existence via Zod. Additionally, Firebase targets separate projects via `.firebaserc`.

### CI/CD
- **Status**: **PARTIAL**
- **File(s)**: `.github/workflows/security-gate.yml`
- **Logic**: A security gate runs on `pull_request` executing `npm run typecheck`, `npm run lint`, `npm audit`, and `npm run test:rules`. 
- **Missing**: While CI gates exist, deployment workflows (`deploy-functions.yml`) appear to be stubs or unverified, lacking E2E tests prior to deployment. 

### Rollback plan
- **Status**: **MISSING**
- **Reason**: No documentation, scripts, or specific GitHub action inputs exist to rapidly revert the Cloud Functions or Realtime Server to a previous known-good image.

---

## 6. STUBS, PLACEHOLDERS & TODOS

*A grep across the entire codebase for `TODO`, `FIXME`, `stub`, and `placeholder` yielded the following:*

1. **File**: `.github/workflows/security-gate.yml`
   - **Line 34**: `- run: echo "Add gitleaks detect here before merge"` *(Placeholder script)*

2. **File**: `notes/ci-deploy.md`
   - **Line 4**: `- Added GitHub Actions workflow stubs for deploy and security checks.`

3. **File**: `notes/context.md`
   - **Line 36**: `- Replace CI/deploy workflow stubs with real deploy steps later.`

*(Note: No actual `TODO` or `FIXME` comments exist inside the TypeScript source code.)*
