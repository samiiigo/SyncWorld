# Sentry Integration and Unit Testing Plan

This plan addresses the remaining tasks from the `SyncWorld-Backend-Master-Implementation-Plan.md`: adding Sentry for error tracking and scaffolding unit tests for the Cloud Functions and Realtime Server.

## User Review Required

> [!IMPORTANT]
> **Sentry DSN:** We will configure the Sentry DSN to be read from environment variables (`SENTRY_DSN`). You will need to provide this value in your environment for Sentry to capture events.

## Open Questions

> [!WARNING]
> **Testing Scope:** Do you want me to write the *complete* implementations for all the test cases immediately, or should I establish the testing framework, write one example test for each area (e.g. FSM tally and socket handshake), and leave the rest of the scaffolding for future expansion?

## Proposed Changes

### Dependencies

#### [MODIFY] package.json (root)
- Update `scripts` to include test commands for all workspaces.

#### [MODIFY] functions/package.json
- Add `@sentry/node` and `@sentry/profiling-node` to dependencies.
- Add `jest` and `@types/jest` to devDependencies.
- Add `test` script.

#### [MODIFY] realtime-server/package.json
- Add `@sentry/node` and `@sentry/profiling-node` to dependencies.
- Add `jest`, `supertest`, and `socket.io-client` to devDependencies for testing.
- Add `test` script.

---

### Sentry Integration (Realtime Server)

#### [MODIFY] realtime-server/src/config/env.ts
- Add `SENTRY_DSN` as an optional string in the Zod schema.

#### [MODIFY] realtime-server/src/index.ts
- Import Sentry and initialize `Sentry.init()` using `realtimeServerEnv.SENTRY_DSN`.
- Add Sentry error handler middleware to the Express app.

---

### Sentry Integration (Cloud Functions)

#### [MODIFY] functions/src/index.ts
- Initialize `Sentry.init()` using `defineString('SENTRY_DSN')` from `firebase-functions/params`.
- Wrap the main Cloud Functions exports (or configure globally if appropriate) to catch and report errors.

---

### Testing Configuration

#### [MODIFY] jest.config.cjs (root)
- Expand the `roots` array to include `<rootDir>/functions/src` and `<rootDir>/realtime-server/src`.
- Ensure tests end with `.test.ts`.

#### [NEW] functions/src/__tests__/fsm.test.ts
- Write unit tests for pure FSM transition logic and vote tallying, mocking Firestore SDK where necessary.

#### [NEW] realtime-server/src/__tests__/handshake.test.ts
- Write tests using `socket.io-client` to verify connection rejection when the token is missing or invalid.

#### [NEW] realtime-server/src/__tests__/scrubber.test.ts
- Write tests to verify scrubber updates are properly validated and broadcasted.

#### [NEW] realtime-server/src/__tests__/membership.test.ts
- Write tests for the room membership guard.

## Verification Plan

### Automated Tests
- Run `npm install` in the backend root workspace.
- Run `npm run test --workspaces` (which maps to functions, realtime-server, and firestore rules).
- Verify all newly added tests pass without errors.

### Manual Verification
- Start the realtime server locally with an invalid `SENTRY_DSN` to verify it doesn't crash on boot.
- Artificially trigger an error in the realtime server to verify Sentry capture logic executes.
