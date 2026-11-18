# Backend & Software Architecture / Security for a Firebase + Socket.io (Fly.io) + Expo group-coordination app (as of Nov 2026)

Scope note: I used 17 tool calls, mostly on primary docs (Firebase, Expo, RNFirebase, Socket.io, Fly.io, Apple, Google Play). Items marked "(training knowledge, unverified this session)" sit under Inferences or Gaps and need checking before anyone relies on them.

## Auth & accounts (anonymous → linked accounts, Sign in with Apple, deletion, persistence)

### Takeaway
Start every user on anonymous auth, then upgrade them with `linkWithCredential`. Turn on Identity Platform's anonymous auto-cleanup so abandoned anonymous users don't pile up or count toward billing. If you offer Google sign-in on iOS you must also offer an equivalent privacy-preserving login, which in practice means Sign in with Apple. Both stores require account deletion inside the app, and Google Play also requires a public web deletion link.

### Cited Findings
- Anonymous → permanent upgrade: run the provider flow up to (but not including) `signInWith*`, build an `AuthCredential` (Google/Email/etc.), then call `linkWithCredential(auth.currentUser, credential)`. The upgraded account keeps access to the anonymous account's data. — [Firebase anonymous auth docs](https://firebase.google.com/docs/auth/web/anonymous-auth)
- With Firebase Auth upgraded to Identity Platform, you can turn on automatic cleanup. Anonymous accounts older than 30 days are deleted, and accounts that were linked to a provider are not. With cleanup on, anonymous auth "will not count toward usage limits or billing quotas." — [Firebase anonymous auth docs](https://firebase.google.com/docs/auth/web/anonymous-auth)
- Identity Platform no-cost tier on Blaze: 50K MAU, 50 SAML/OIDC MAU. Phone auth is billed per SMS. — [Firebase pricing](https://firebase.google.com/pricing)
- Apple Guideline 4.8: an app that uses a third-party/social login (Google Sign-In named explicitly) for the user's primary account "must also offer as an equivalent option another login service" that limits data to name and email, lets users keep their email private, and doesn't track for ads without consent. — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 5.1.1(v): "If your app doesn't include significant account-based features, let people use it without a login. If your app supports account creation, you must also offer account deletion within the app." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Google Play: any app that offers account creation must (a) provide a prominent in-app deletion path and (b) provide a working **web link** where users can request account and data deletion, entered in the Data safety form. Deletion covers all data declared in Data safety. Retention for fraud or legal reasons must be disclosed. Non-compliant apps could face enforcement after May 31, 2024. — [Google Play Help: account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- Auth session persistence with the Firebase JS SDK in Expo: Expo's Firebase guide points to a separate guide (expo.fyi/firebase-js-auth-setup) for keeping users logged in across reloads. `getReactNativePersistence` (AsyncStorage) is the Auth mechanism, but issue #9316 reports a TypeScript "no exported member" error importing it from `firebase/auth` on firebase 12.4.0. Expo warns that warnings or failures depend on the version and suggests a custom persistence manager as a fallback. — [Expo using Firebase](https://docs.expo.dev/guides/using-firebase/); [expo/fyi firebase-js-auth-setup](https://github.com/expo/fyi/blob/main/firebase-js-auth-setup.md); [firebase-js-sdk #9316](https://github.com/firebase/firebase-js-sdk/issues/9316)
- Expo SDK requires `firebase@12.0.0`+. Older versions cause ES module resolution errors (page updated Nov 2, 2026). — [Expo using Firebase](https://docs.expo.dev/guides/using-firebase/)

### Inferences
- Anonymous-first suits a "join a room with a code" app. Apple 5.1.1(v) even favours letting people use the app without a login. Ask for an upgrade (Apple/Google/email) only when a user needs persistence across devices or wants to own a room.
- Any anonymous user counts as "account creation" once you persist their data. The safe reading is to ship an in-app "Delete my data/account" for anonymous users too. Implement it as a callable Cloud Function that deletes the user's Firestore docs (memberships, votes, rooms they own) and then the Auth user. Host a static web deletion-request page for Google Play.
- Linking conflicts: when a credential already belongs to another account, the app must catch the error and offer to sign in to the existing account, discarding or merging the anonymous data on the server. The Firebase page doesn't document this flow (see Gaps).
- On web, the JS SDK persists Auth in IndexedDB by default (training knowledge, unverified this session). The fragile part is native RN with the JS SDK.

### Gaps
- I didn't fetch Apple's requirement that Sign in with Apple tokens be revoked on account deletion (REST `revoke`), or Firebase's `revokeAccessToken` helper. Training knowledge says Apple requires revocation for SIWA users. Verify against Apple's account-deletion guidance page.
- I didn't verify the exact error code for linking collisions (`auth/credential-already-in-use`) or the recommended merge flow.
- I didn't confirm whether anonymous users count toward the 50K MAU when cleanup is off.

## Data model & consistency (rooms/members/proposals/votes; transactions; rules testing; server time)

### Takeaway
Model rooms as top-level docs with member, proposal and vote subcollections, using auto-IDs. Let a callable Cloud Function or Admin-SDK transaction do every state-machine transition (proposal → unanimous → locked), so clients can't forge outcomes. Pin down the rules with `@firebase/rules-unit-testing` against the emulator.

### Cited Findings
- Hotspots: avoid high write rates to lexicographically close docs and monotonically increasing IDs. Auto-IDs use a scatter algorithm. An indexed, sequentially increasing field such as a timestamp caps a collection at about 500 writes/s, so exempt it from indexing if you don't query it. — [Firestore best practices](https://firebase.google.com/docs/firestore/best-practices)
- Single-document write rate has no fixed number. Throughput "depends highly on the workload", and high rates cause "contention, higher latency, or other errors". Load-test it. — [Firestore best practices](https://firebase.google.com/docs/firestore/best-practices)
- Transactions: SDKs retry automatically on transient errors. Keep the number of docs per transaction small to reduce contention. Ramp-up rule: 500 ops/s to a new collection, then +50% every 5 minutes. — [Firestore best practices](https://firebase.google.com/docs/firestore/best-practices)
- Large array/map fields can approach the 40,000 index-entries-per-document limit. Exempt them from indexing. — [Firestore best practices](https://firebase.google.com/docs/firestore/best-practices)
- Rules testing: `initializeTestEnvironment` (projectId plus a rules file), `authenticatedContext(uid, claims)`, `unauthenticatedContext()`, `assertSucceeds`/`assertFails`, `withSecurityRulesDisabled` for seeding, `clearFirestore()` between tests. It needs running emulators and never touches production. — [Firebase rules unit tests](https://firebase.google.com/docs/rules/unit-tests)

### Inferences
- Suggested model: `rooms/{roomId}` holds `code`, `ownerUid`, `status`, `memberUids[]` (small, used by rules), `createdAt`, `expiresAt`. Subcollections: `members/{uid}`, `proposals/{proposalId}`, and either `proposals/{pid}/votes/{uid}` or a `votes` map on the proposal. A separate `roomCodes/{code}` doc maps the short code to `roomId`. Create it in a transaction so codes are unique.
- Unanimity: use one vote doc per uid so a member can only write their own vote (`request.auth.uid == voteId`). A callable function (or a Firestore `onDocumentWritten` trigger) runs a transaction that reads the proposal, member count and votes, then flips `status` to `accepted`/`rejected`. Rules should forbid clients from writing `status`. With small groups (under ~20), per-proposal contention stays far below the hotspot thresholds.
- Make callables idempotent: the client sends a `requestId` (UUID), and the function stores processed IDs or uses deterministic doc IDs (`votes/{uid}`), so retries can't double-apply.
- Server time: write `serverTimestamp()` for every ordering or deadline field. For countdowns, compute a client offset from a server-provided time (the Socket.io handshake `serverNow`, or reading back a doc written with `serverTimestamp()`), then show `Date.now() + offset`. Firebase RTDB exposes `.info/serverTimeOffset` for this (training knowledge, unverified this session). Never let the client decide when a deadline has expired; enforce it in the function.

### Gaps
- I didn't fetch the doc-size limit (1 MiB, training knowledge) or the "realtime queries at scale" page, which covers listener limits.
- I found no case study of unanimous-voting state machines on Firestore. The design above is my synthesis.

## Realtime (Firestore listeners vs Socket.io, scaling on Fly.io, presence, alternatives)

### Takeaway
Use Firestore listeners for durable, authoritative state (room, proposals, votes) and Socket.io only for ephemeral, high-frequency signals (typing, live cursors, "X is choosing…", presence) that you don't want billed per write. Running both is justified only if those ephemeral features exist. Otherwise RTDB presence plus Firestore is simpler and needs no extra infrastructure. If you keep Socket.io on Fly, run a single machine at first. To scale out you need sticky sessions (or WebSocket-only transport) plus an adapter, and connection-state recovery is not supported by the plain Redis adapter.

### Cited Findings
- Socket.io across multiple nodes: "all requests associated with a particular session ID reach the process that originated them" (sticky sessions), via cookie, IP or `@socket.io/sticky`. The alternative is WebSocket-only transport (no long-polling fallback, so clients on restrictive networks can fail). Proxy timeout must exceed `pingInterval + pingTimeout` (45s default). — [Socket.io multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)
- Adapters: Redis, Redis Streams, MongoDB, Postgres, Cluster, Google Cloud Pub/Sub, AWS SQS, Azure Service Bus. — [Socket.io multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)
- Connection state recovery (`connectionStateRecovery.maxDisconnectionDuration`) restores the socket's id, rooms and data and replays missed packets. It works with the in-memory, Redis Streams and MongoDB adapters, **not the Redis (pub/sub) adapter**. Postgres and Cluster support is WIP. Recovery "will not always be successful", so check `socket.recovered` and resync when it's false. `skipMiddlewares: true` can let blocked users back in. — [Socket.io connection state recovery](https://socket.io/docs/v4/connection-state-recovery)
- Firestore has no native presence. The official pattern: the client watches RTDB `.info/connected`, registers `onDisconnect()` to write offline to `/status/{uid}`, and a Cloud Function mirrors this into Firestore. Caveats: it measures the RTDB connection, not the Firestore one. Listeners may need debouncing. On Android, RTDB disconnects after 60s idle. — [Firestore presence solution](https://firebase.google.com/docs/firestore/solutions/presence)
- Fly.io cost: shared-cpu-1x is $2.19/mo (256MB), $3.69 (512MB), $6.70 (1GB) per 30 days always-on. Outbound is $0.02/GB in NA/EU, inbound free. A dedicated IPv4 is $2/mo; shared IPv4 and IPv6 are free. Stopped machines pay $0.15/GB-month of rootfs. There is **no free tier** for new orgs, only a $1/7-day trial credit, but personal-org bills under $5/mo are waived. — [Fly.io pricing](https://docs.fly.io/about/pricing)
- Fly lists Upstash Redis as an extension priced by the provider. — [Fly.io pricing](https://docs.fly.io/about/pricing)
- Firestore Standard no-cost: 50K reads/day, 20K writes/day, 20K deletes/day, 1 GiB stored, 10 GiB egress/month. Enterprise edition meters "real-time update units" (50K/day free). — [Firebase pricing](https://firebase.google.com/pricing)

### Inferences
- Cost logic: every Firestore listener update costs a read per changed doc per listener. A 6-person room with 100 vote and proposal changes is about 600 reads, so the free 50K/day covers roughly 80 such sessions a day before costs (still cents) start. Pushing ephemeral events like typing or cursor moves through Firestore would multiply both writes and reads. That is what justifies Socket.io.
- Rule: if it must survive an app restart or be auditable, put it in Firestore. If it's lost the moment it's stale, use Socket.io. Socket.io must not be a second source of truth for votes.
- Authenticate sockets: the client sends a Firebase ID token (and ideally an App Check token) in `auth` on the handshake. Server middleware calls `admin.auth().verifyIdToken()` (and `admin.appCheck().verifyToken()`), then authorises room joins against Firestore membership.
- Fly scaling path: (1) one machine plus `min_machines_running = 1` (auto-stop drops sockets), (2) two or more machines in one region with WebSocket-only transport (RN supports it natively) and the Redis Streams adapter (Upstash) if you want state recovery. Fly's `fly-replay` header or the `@socket.io/sticky` approach can provide affinity (training knowledge, unverified this session).
- Alternatives: RTDB for presence is the lowest-ops choice in this stack. Ably or Pusher remove the server entirely and offer presence, history and recovery as managed features, but add a vendor plus a token-auth endpoint (a Cloud Function). Liveblocks targets collaborative documents and is likely overkill. Supabase Realtime would mean a second backend. For a small team, the defensible options are "Firestore + RTDB presence, no Socket.io" or "Firestore + one Fly Socket.io machine for ephemeral signals".

### Gaps
- I didn't fetch Ably, Pusher, Liveblocks or Supabase pricing pages, so there are no cited numbers for alternatives.
- I didn't fetch Fly's docs on `fly-replay`, autostop or WebSockets, or Upstash prices.
- I found no public case study of production apps combining Firestore and Socket.io.

## Offline & resilience

### Takeaway
On native, the Firebase JS SDK's Firestore gives you **memory-only cache** in practice. Durable offline persistence needs React Native Firebase (a dev build). For a live group-voting app, memory cache plus a clear "reconnecting" UI is acceptable. Make writes idempotent and resync after reconnects.

### Cited Findings
- Firestore persistence in RN via the JS SDK is a known gap: issue #7947 reports "Error using user provided cache" on RN 0.73 with SDK 10.7.1. The memory cache is the default. The community polyfill `expo-firestore-offline-persistence` is unmaintained. React Native Firebase Firestore exposes a `persistence` setting. — [firebase-js-sdk #7947](https://github.com/firebase/firebase-js-sdk/issues/7947); [expo-firestore-offline-persistence](https://www.npmjs.com/package/expo-firestore-offline-persistence)
- JS SDK vs RNFB: the JS SDK works in Expo Go and on web (Auth, Firestore, RTDB, Storage) but lacks Analytics and Crashlytics. RNFB wraps the native SDKs, needs a dev build (`expo-dev-client`, config plugins, `npx expo prebuild --clean`), and can't run in Expo Go. — [Expo using Firebase](https://docs.expo.dev/guides/using-firebase/)
- Socket.io recovery isn't guaranteed. Resync when `socket.recovered === false`. — [Socket.io connection state recovery](https://socket.io/docs/v4/connection-state-recovery)

### Inferences
- Use RNFB on iOS/Android (native persistence, App Check, Crashlytics) and the JS SDK on web, behind a platform-split `backend/firebase.native.ts` / `firebase.web.ts`. This is the common Expo pattern and is forced anyway by the App Check requirement below.
- Optimistic UI: Firestore applies local writes to listeners immediately (`hasPendingWrites`). Show votes as pending until the server confirms. For callables, show a pending state and disable re-submit, and dedupe with a `requestId`.
- Reconnect: the Socket.io client already backs off exponentially. On reconnect, re-join rooms and re-fetch an authoritative snapshot from Firestore rather than trusting the replay.

### Gaps
- I didn't verify whether firebase-js-sdk v12 has fixed persistent cache on RN. Treat it as unresolved.

## Security (App Check in Expo, rate limiting, room-code abuse, secrets, MASVS)

### Takeaway
App Check on native needs React Native Firebase in a dev build: App Attest with DeviceCheck fallback on iOS, Play Integrity on Android, reCAPTCHA Enterprise on web. Enforce it on Firestore, Functions and your Socket.io handshake. Room-code brute force needs long enough codes, rate-limited join callables and server-side validation.

### Cited Findings
- RNFB App Check providers: iOS uses DeviceCheck, App Attest, or App Attest with DeviceCheck fallback (App Attest on iOS 14+). Android uses Play Integrity (works on and off Play). Debug provider for simulators and CI. reCAPTCHA v3/Enterprise is web-only. — [RNFB App Check](https://rnfirebase.io/app-check/usage)
- Expo setup: add `@react-native-firebase/app-check` to `plugins`. **New Architecture is required from RNFB v26.** `initializeAppCheck` returns synchronously. Native config failures only `console.warn`, so check them. `onTokenChanged` is a no-op on iOS. There is no App Check emulator. Never ship the debug provider, and revoke leaked debug tokens. `getLimitedUseToken` exists for replay protection. — [RNFB App Check](https://rnfirebase.io/app-check/usage)
- App Check has no cost but has provider-dependent quotas. — [Firebase pricing](https://firebase.google.com/pricing)

### Inferences
- Roll out in monitor mode first, watch the verified-request percentage in the console, then enforce. Pass `enforceAppCheck: true` (plus `consumeAppCheckToken` for sensitive callables like joinRoom) in Functions v2 (training knowledge, unverified this session).
- Room codes: six or more characters from an unambiguous 30-ish character alphabet gives about 7×10^8 codes. Expire them with the room, and only resolve them via a `joinRoom` callable, never a client query on `roomCodes`. Rate-limit per uid and per IP (a Firestore counter doc or an in-memory/Redis token bucket on the Socket server). Cap members per room.
- Rules: deny by default. Members can read a room only if `request.auth.uid in resource.data.memberUids`. Clients never write `status`, `ownerUid` or `memberUids`. Validate field shapes and sizes.
- Secrets: Functions v2 uses `defineSecret` (Secret Manager). Fly uses `fly secrets set`. EAS uses EAS environment variables/secrets. Firebase web API keys are identifiers, not secrets; protection comes from rules and App Check. MASVS basics: no secrets in the bundle, TLS only, store tokens in Keychain/Keystore (`expo-secure-store`), disable debug providers and logging in release.

### Gaps
- I didn't fetch Firebase's App Check docs for Functions v2 or Firestore enforcement, or the OWASP MASVS v2 page itself. The MASVS items above come from training knowledge.
- I found no official Firebase rate-limiting primitive. It must be custom.

## Operations (environments, CI/CD, monitoring, crash reporting, analytics, cost, backups)

### Takeaway
Run separate Firebase projects for dev, staging and prod, CI with GitHub Actions (rules tests against emulators, then `firebase deploy`, `fly deploy`, EAS Build/Update), Sentry via `@sentry/react-native` (Crashlytics only if you adopt RNFB and don't need web), budget alerts, and Firestore PITR or scheduled backups for prod. At small scale, Firebase is roughly $0 and Fly is a few dollars a month.

### Cited Findings
- "Firebase recommends using a *separate* Firebase project for *each* environment". iOS, Android and web of the same app share a project. Don't mix debug and production data. — [Firebase dev workflow best practices](https://firebase.google.com/docs/projects/dev-workflows/general-best-practices)
- `sentry-expo` has been deprecated since Expo SDK 50 (Jan 18, 2024). Use `@sentry/react-native` with the `@sentry/react-native/expo` config plugin. It supports react-native-web, though some features differ on web. — [sentry-expo npm](https://npmjs.com/package/sentry-expo); [Sentry Expo guide](https://docs.sentry.io/platforms/react-native/guides/expo/); [Sentry migration](https://docs.sentry.io/platforms/react-native/migration/sentry-expo/)
- Crashlytics needs RNFB (not available in the JS SDK). It's free for mobile, with no web support listed. — [Expo using Firebase](https://docs.expo.dev/guides/using-firebase/); [Firebase pricing](https://firebase.google.com/pricing)
- Blaze no-cost: Functions get 2M invocations, 400K GB-s, 200K CPU-s and 5 GB egress per month. FCM is no-cost. Remote Config starts per-request fees above 100K fetches/day from Sep 1, 2026. Storage no-cost quotas are Blaze-only and limited to us-central1/us-west1/us-east1 for non-legacy buckets. — [Firebase pricing](https://firebase.google.com/pricing)
- Firestore PITR: off by default, 7-day window, minute granularity. Storage is billed per GB-month with no free tier. Reads from the PITR window cost normal reads. — [Firestore PITR](https://firebase.google.com/docs/firestore/pitr)
- Fly: personal orgs under $5/mo are waived. Free snapshot storage up to 10GB. — [Fly.io pricing](https://docs.fly.io/about/pricing)

### Inferences
- Rough small-scale cost (hundreds of DAU): Firebase about $0–5/mo, inside the free quotas. Fly: one shared-cpu-1x 512MB is $3.69, possibly waived under $5. Add Upstash Redis only when you scale to more than one machine. Sentry's free developer tier is probably enough at first (not verified this session). Set a GCP budget alert anyway; Blaze has no hard cap.
- CI pipeline: on PR, run lint, typecheck and unit tests, then `firebase emulators:exec "npm run test:rules && npm run test:functions"`. On main, deploy to staging (`firebase deploy --project staging`, `fly deploy -a app-staging`, `eas update --channel staging`). On tag, do the same for prod plus `eas build --profile production` and `eas submit`. Use Workload Identity Federation or a service-account secret for `firebase deploy`, and `FLY_API_TOKEN` for Fly.
- Logging: Functions v2 logs to Cloud Logging. Use structured JSON logs on Fly (`fly logs`) or ship them to Sentry or Better Stack. Alert on function error rate, Firestore rule denials spikes, and Socket server health checks.
- Analytics: Firebase Analytics also needs RNFB. PostHog or Amplitude are JS alternatives that work on web too (no sources fetched).

### Gaps
- I didn't fetch Firestore scheduled-backup pricing, EAS pricing, Sentry pricing, or a side-by-side of Crashlytics and Sentry for 2026.
- I didn't fetch the official GitHub Action for Firebase deploy or Fly's GitHub Actions guide.

## Testing strategy

### Takeaway
Use a three-layer pyramid: Jest unit tests for pure logic (vote reducer, state machine, time offset), emulator-backed integration tests (rules and callables), and E2E on a few critical flows (create room, join by code, unanimous vote): Maestro on native, Playwright on web.

### Cited Findings
- Rules tests require running emulators and never touch production. Clear data between tests with `clearFirestore()`. — [Firebase rules unit tests](https://firebase.google.com/docs/rules/unit-tests)
- There is no App Check emulator. Use the debug provider and tokens in simulators and CI. — [RNFB App Check](https://rnfirebase.io/app-check/usage)

### Inferences
- Pull the voting state machine out into a pure TS module shared by Functions and client (for optimistic UI), so it can be unit-tested exhaustively.
- Test the Socket.io server with `socket.io-client` in Jest against a real server instance, with the Admin SDK pointed at the Auth emulator.
- Maestro (YAML flows, EAS-friendly) is lower-friction than Detox for Expo. Run multi-device tests by driving two simulators or one simulator plus Playwright web. Device farms (EAS Workflows with Maestro, BrowserStack, Firebase Test Lab) come later. None of this is sourced this session.

### Gaps
- I didn't fetch Maestro, Detox, Playwright or EAS Workflows docs. The tool choices above are opinion and training knowledge.

## Client architecture (feature folders, zustand, backend interface, tokens, New Architecture)

### Takeaway
Organise by feature (`features/rooms`, `features/voting`, `features/auth`), with a typed `Backend` interface implemented by `DemoBackend` (in-memory) and `LiveBackend` (Firebase plus Socket.io), selected at startup. Use zustand for client and UI state, with Firestore listeners feeding the stores. The New Architecture is now effectively mandatory because RNFB v26+ requires it.

### Cited Findings
- RNFB App Check (v26+) requires the New Architecture. — [RNFB App Check](https://rnfirebase.io/app-check/usage)
- RNFB needs a dev build and config plugins; Expo Go can't run it. — [Expo using Firebase](https://docs.expo.dev/guides/using-firebase/)

### Inferences
- The backend interface should expose observable subscriptions (`subscribeRoom(roomId, cb) → unsubscribe`) and commands (`castVote`, `joinRoom`) that return promises. That shape makes the demo/live swap trivial and keeps Firebase types out of UI code.
- Keep server-derived state (room, proposals) normalised in zustand slices written only by the backend adapter. Keep UI state (sheet open, drafts) in separate slices. Avoid storing derived "isUnanimous" values; compute them with selectors.
- Platform files (`.native.ts` / `.web.ts`) isolate the RNFB vs JS SDK split.
- Design tokens belong in a `theme/` module. Out of scope for backend research.

### Gaps
- I didn't fetch zustand docs or Expo's project-structure guidance in this session.
