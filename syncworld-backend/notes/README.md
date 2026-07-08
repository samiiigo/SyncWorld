# Backend Change Notes

Short reference for what was added in the backend workspace.

## Current Status

- Backend workspace scaffold is in place.
- `npm run typecheck` passes in the backend workspace.
- `npm run test:rules` passes with the Firestore emulator on port 8085.

## Files

- [workspace-scaffold.md](workspace-scaffold.md) - repo layout, TypeScript base config, env validation.
- [firestore-rules.md](firestore-rules.md) - Firestore schema and security rules summary.
- [functions.md](functions.md) - callable functions and scheduled jobs summary.
- [realtime-server.md](realtime-server.md) - Socket.io server, auth, membership checks, and events.
- [ci-deploy.md](ci-deploy.md) - Docker, CI, and deployment scaffolding.
