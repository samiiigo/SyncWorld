# Architecture Overview

## System Context

SyncWorld is a cross-platform mobile app (iOS, Android, Web) built with Expo Managed Workflow and TypeScript. It coordinates a shared alarm across users in different time zones using a collaborative scrubber, voting consensus, and native alarm scheduling.

## Architectural Style

**Feature-first modular architecture** with SOLID-driven boundaries. Each feature is a self-contained module with its own contracts, state, repository, events, and orchestrator. Features communicate through typed events and shared store slices rather than direct imports.

## Layer Diagram

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│   Expo Router app/ wrappers → features/*/pages   │
│   shared/components · layouts chrome             │
├─────────────────────────────────────────────────┤
│                Orchestrator Layer                 │
│    Coordinates flows across services & store     │
│   auth.orch │ rooms.orch │ voting.orch │ …       │
├─────────────────────────────────────────────────┤
│                  Store Layer                      │
│   Feature-colocated Zustand slices / AppContext  │
│  auth │ rooms │ scrubber │ voting │ alarms       │
├─────────────────────────────────────────────────┤
│               Service Port Layer                  │
│        Abstract contracts (DIP boundary)         │
│  AuthPort │ FirestorePort │ SocketPort │ …       │
├─────────────────────────────────────────────────┤
│              Service Adapter Layer                │
│   shared/lib adapters (firebase, socket, …)      │
│  firebase.auth │ firestore │ socket.io │ expo-*  │
├─────────────────────────────────────────────────┤
│              External Services                    │
│  Firebase Auth │ Firestore │ Socket.io Server    │
│  FCM │ APNs │ Node.js/Express │ Cloud Functions  │
└─────────────────────────────────────────────────┘
```

## Dependency Flow (DIP)

```
Features ──→ Service Ports (contracts) ←── Service Adapters (concrete)
    │                                             │
    ▼                                             ▼
  Store                                      External SDKs
```

High-level modules (features, orchestrators) depend on abstractions (ports/contracts). Low-level modules (adapters) implement those abstractions. No feature ever imports a concrete SDK.

## Data Flow

### Write Path (User Action → Persistence)
```
User gesture → Store action → Orchestrator → Service port → Adapter → Firebase/Socket
```

### Read Path (External → User Display)
```
Firestore listener / Socket.io event → Adapter → Service port → Store update → UI re-render
```

### Scrubber Real-Time Path
```
Local drag → Debounce → Socket.io emit → Server broadcast → Remote receive → Store → Re-render
                                                                    ↓
                                                         Firestore persist (debounced)
```

## State Management

Zustand with independent stores per domain. Each store is a separate `create()` call, not slices of a monolith. Benefits:
- Subscriptions are scoped: scrubber changes don't trigger identity re-renders
- Stores can be independently tested
- No circular dependencies between slices

## Event System

All domain events use discriminated unions with a `kind` field. The `SyncWorldEvent` union type is the exhaustive aggregate. Events are used for:
- Logging and analytics
- Cross-feature communication via orchestrators
- Debugging (event timeline reconstruction)

## Service Ports (Dependency Inversion)

| Port | Responsibility | Implementations |
|------|---------------|----------------|
| `AuthPort` | Authentication lifecycle | Firebase Auth adapter |
| `FirestorePort` | Document persistence | Firestore adapter |
| `SocketPort` | Real-time transport | Socket.io adapter |
| `NotificationPort` | Push/local notifications | Expo Notifications adapter |
| `NativeAlarmPort` | OS alarm scheduling | Platform-specific adapter |

Each port can be stubbed for testing or swapped for an alternative provider without changing feature code (LSP).

## Time Architecture

See [Time Model](time-model.md) for the full specification. Key points:
- UTC epoch milliseconds everywhere
- IANA timezone per member
- Server is timezone-agnostic
- Client converts for display
- DST edge cases explicitly handled

## Error Handling

All service operations return `Result<T, E>` instead of throwing. This makes error paths explicit and composable. Orchestrators pattern-match on results to decide recovery behavior.

## Future Backend

The Node.js/Express backend and Cloud Functions are external services. This client scaffold references them only through:
- `config/env.ts` — server URLs
- `services/socket` — Socket.io server connection
- `services/firebase` — Firestore security rules and Cloud Function triggers

No backend code exists in this repository. Backend contracts are implied by the client-side port definitions.
