# Backend Context

Use this file as the quick resume point for backend work.

## Branch

- Current branch: `Starting-back-end-Design`
- Remote branch: `origin/Starting-back-end-Design`

## Done So Far

- Backend workspace scaffold created.
- Firestore rules and emulator tests added and passing.
- Callable functions added for `createRoom`, `joinRoom`, `castVote`, and `transitionRoomStatus`.
- Realtime server scaffolded with auth, membership checks, scrubber updates, proposal handling, and presence handling.
- Vote resolution trigger, proposal expiry sweep, alarm firing job, and cleanup job added.
- Backend notes folder added with short summary files.

## Current Validation

- Backend typecheck passes.
- Firestore rules test passes.
- Backend changes have been pushed to GitHub.

## Important Decisions

- Backend is moving in small slices, not Docker/Kubernetes first.
- Firestore rules are the trust boundary.
- Direct client vote writes are denied; voting goes through the backend callable.
- Quorum is checked from the live `members` subcollection.

## Known Follow-Ups

- Add deeper integration tests for functions and realtime server.
- Tighten realtime event handling if needed.
- Replace CI/deploy workflow stubs with real deploy steps later.
- Leave Docker/Kubernetes for later unless deployment demands it.
- Keep frontend and backend event names aligned.
- **PRE-SCALING TODO**: Replace in-memory rate limiters (`connection.ts`, `rateLimiter.ts`) and disconnect timers with Redis-backed logic *before* running multiple realtime server instances.
- **MEMBERSHIP CACHE TODO (D9)**: The realtime server caches room membership in memory upon join. If a future feature allows removing/kicking a member, we must emit a targeted socket event to force the client to disconnect or drop `authorizedRooms` to prevent stale access.

## Resume Rule

Start here first before making the next backend change. Update this file whenever a meaningful backend milestone lands.
