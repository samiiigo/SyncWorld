# SyncWorld Backend Hardening & Implementation Plan

This plan tracks the technical priorities, Sentry error tracking, CI/CD pipelines, and unit testing hardening for the SyncWorld backend workspaces (`functions` and `realtime-server`).

## 1. Package Script Alignment

- **Workspace Root (`syncworld-backend/package.json`)**:
  - `build`: Runs `npm run build --workspaces` (compiles both TypeScript projects).
  - `test`: Runs `npm run test --workspaces` (executes Jest test suites across both packages).
  - `typecheck`: Runs `npm run typecheck --workspaces` (runs TypeScript typechecking without emit).
  - `lint`: Runs `npm run lint --workspaces` (verifies static analysis without emit).
  - `test:rules`: Runs Firestore security rules emulator tests.

## 2. Production Sentry Provisioning & Fallbacks

- **Environment Schema (`realtime-server/src/config/env.ts`)**:
  - Validates `SENTRY_DSN` using Zod schema `z.string().url().optional().or(z.literal(''))`.
- **Runtime Initialization (`realtime-server/src/index.ts` & `functions/src/index.ts`)**:
  - Initializes Sentry with Node Profiling integration if `SENTRY_DSN` is configured.
  - Emits friendly no-op fallback logs in development mode (`NODE_ENV === 'development'`) when DSN is absent.

## 3. Infrastructure & CI Pipelines

- **Health Checks (`realtime-server/src/routes/health.ts` & `fly.toml`)**:
  - Express `/health` route returns `200 OK` with uptime, timestamp, and environment.
  - Fly.io HTTP health check configured with 30s interval, 10s grace period, and 5s timeout.
- **Continuous Integration (`.github/workflows/deploy-realtime-server.yml`)**:
  - Runs `npm install`, `npm test`, and `npm run typecheck` before triggering Fly.io deployment.

## 4. Comprehensive Unit Test Coverage (Target ≥ 80%)

- **Cloud Functions (`functions/src/__tests__/`)**:
  - `fsm.test.ts`: Pure FSM transition validation (`ROOM_TRANSITIONS`), `transitionRoomStatusInputSchema`, callable transition validation (member threshold, consensus verification, role authorization), and `onProposalWrite` trigger consensus resolution.
  - `createRoom.test.ts`: Room creation, room code generation, and owner membership initialization.
  - `joinRoom.test.ts`: Room membership validation, passcode verification, and member count incrementing.
- **Realtime Server (`realtime-server/src/__tests__/`)**:
  - `handshake.test.ts`: WebSocket auth token validation, rejection of missing/invalid tokens, App Check handling, and proper connection lifecycle teardown.
  - `scrubber.test.ts`: Payload schema verification, range clamping (0 - 48h), unauthenticated/unjoined socket rejection, and room broadcast verification.
  - `membership.test.ts`: Verification of memory-cached room authorization vs Firestore fallback and cache invalidation.
