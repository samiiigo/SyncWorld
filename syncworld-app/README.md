# SyncWorld

Cross-platform React Native mobile app for coordinating shared UTC-based alarms across multiple time zones.

> **This is a blueprint-only scaffold.** No UI screens, visual components, or working feature implementations exist yet. This project contains architectural documentation, typed domain contracts, state shape planning, service boundaries, and file scaffolding for all major features.

## Core Product Flow

```
Identity → Room Create/Join → Scrubber → Vote → Armed → Fired
```

## Room Finite State Machine

```
OPEN → PROPOSING → VOTING → LOCKED → FIRED
            ↑          │
            └──────────┘
       (veto / quorum loss / expiry)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo Managed Workflow (SDK 54) |
| Language | TypeScript (strict mode) |
| State | Zustand (independent slices per domain) |
| Auth | Firebase Auth (anonymous + provider linking) |
| Persistence | Cloud Firestore (real-time listeners) |
| Real-time | Socket.io (scrubber sync, presence) |
| Time | Luxon + native `Intl.DateTimeFormat` |
| Notifications | Expo Notifications + FCM |
| Native Alarms | Platform-specific via abstraction port |
| Backend (future) | Node.js/Express + Cloud Functions |

## Time Model

UTC epoch milliseconds are the single source of truth. IANA timezone identifiers are stored per member. The server never processes or stores local times. All local display conversion happens on the client.

## Architecture Principles (SOLID)

- **SRP** — Each module, slice, contract, and file has exactly one responsibility
- **OCP** — Event unions, adapter factories, and feature boundaries extend without rewriting core
- **LSP** — Service ports (AuthPort, FirestorePort, SocketPort, etc.) allow implementation swaps
- **ISP** — Small, focused contracts per feature; no bloated god-types
- **DIP** — Features depend on port abstractions, not concrete SDK imports

## Project Structure

```
syncworld-app/
├── src/
│   ├── features/           # Feature modules (one per product area)
│   │   ├── identity/       # Auth, session bootstrap, timezone detection
│   │   ├── rooms/          # Room CRUD, FSM, lobby, presence
│   │   ├── scrubber/       # Real-time scrubber sync pipeline
│   │   ├── voting/         # Proposal, vote, consensus resolution
│   │   └── alarm/          # Alarm arming, countdown, fire lifecycle
│   │
│   ├── services/           # External service adapters (DIP boundary)
│   │   ├── firebase/       # Auth + Firestore ports and adapters
│   │   ├── socket/         # Socket.io port and adapter
│   │   ├── notifications/  # Push notification port and adapter
│   │   └── alarms/         # Native alarm scheduling port and adapter
│   │
│   ├── lib/                # Shared utilities
│   │   └── time/           # UTC conversion, DST handling, countdown
│   │
│   ├── store/              # Zustand state slices
│   │   ├── identity.slice.ts
│   │   ├── rooms.slice.ts
│   │   ├── scrubber.slice.ts
│   │   ├── voting.slice.ts
│   │   └── alarm.slice.ts
│   │
│   ├── types/              # Domain type definitions (type aliases only)
│   ├── constants/          # App and domain constants
│   └── config/             # Environment and feature flag config
│
├── docs/                   # Architecture and planning documents
│   ├── architecture.md
│   ├── feature-map.md
│   ├── state-machine.md
│   ├── time-model.md
│   └── failure-modes.md
│
├── .env.example            # Environment variable template
├── app.json                # Expo configuration
├── tsconfig.json           # TypeScript config with path aliases
└── package.json            # Dependencies and scripts
```

## Feature Module Anatomy

Each feature folder contains:

| File | Purpose |
|------|---------|
| `README.md` | Responsibility, scope, edge cases, integration points |
| `*.contracts.ts` | Service port types and factory signatures |
| `*.events.ts` | Domain event kinds (discriminated union subset) |
| `*.state.ts` | State shape documentation and re-exports |
| `*.repository.ts` | Data access layer contract |
| `*.orchestrator.ts` | Flow coordination (TODO bodies) |

## Getting Started

```bash
# Install dependencies
npm install

# Type-check the blueprint
npm run typecheck

# Start Expo dev server (nothing to see yet — no UI implemented)
npm start
```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Feature Map](docs/feature-map.md)
- [Room State Machine](docs/state-machine.md)
- [Time Model](docs/time-model.md)
- [Failure Modes](docs/failure-modes.md)

## Implementation Order (Recommended)

1. `services/firebase` — SDK init, auth adapter, firestore adapter
2. `features/identity` — anonymous bootstrap, store hydration
3. `features/rooms` — room CRUD, FSM, lobby presence
4. `services/socket` — socket adapter, presence channel
5. `features/scrubber` — sync pipeline, conflict resolution
6. `features/voting` — proposal, tally, consensus
7. `features/alarm` — arming, countdown, native scheduling
8. `services/notifications` — push notification integration
9. `services/alarms` — native alarm platform adapters
10. UI layer — screens, navigation, components (not in this blueprint)
