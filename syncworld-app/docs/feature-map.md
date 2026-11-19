# Feature Map

Comprehensive mapping of all SyncWorld product areas to their blueprint locations.

## 1. Identity and Anonymous Session Bootstrap

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/auth/README.md` |
| Service contracts | `src/features/auth/auth.contracts.ts` |
| Events | `src/features/auth/auth.events.ts` |
| State shape | `src/features/auth/state/auth.slice.ts` |
| Repository | `src/features/auth/auth.repository.ts` |
| Orchestrator | `src/features/auth/auth.orchestrator.ts` |
| Auth port | `src/shared/lib/firebase/firebase.contracts.ts` → `AuthPort` |
| Domain types | `src/shared/types/common.ts` → `UserId`, `SessionId`, `IANATimezone` |

## 2. Room Creation and Join Flow

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/rooms/README.md` |
| Service contracts | `src/features/rooms/rooms.contracts.ts` |
| Events | `src/features/rooms/rooms.events.ts` |
| State shape | `src/features/rooms/state/rooms.slice.ts` |
| Repository | `src/features/rooms/rooms.repository.ts` |
| FSM guard | `src/features/rooms/rooms.fsm.ts` |
| Orchestrator | `src/features/rooms/rooms.orchestrator.ts` |
| Constants | `src/features/rooms/constants/room.constants.ts` |
| Domain types | `src/shared/types/room.ts`, `src/shared/types/member.ts` |

## 3. Lobby and Presence Model

| Aspect | Location |
|--------|----------|
| Presence types | `src/shared/types/member.ts` → `PresenceStatus`, `LobbySnapshot` |
| Presence service | `src/features/rooms/rooms.contracts.ts` → `RoomPresenceService` |
| Presence events | `src/shared/types/events.ts` → `PresenceEvent` |
| Socket events | `src/shared/lib/socket/socket.events.ts` → presence events |
| Heartbeat config | `src/shared/constants/app.constants.ts` → `PRESENCE` |

## 4. Scrubber Synchronization Pipeline

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/scrubber/README.md` |
| Service contracts | `src/features/scrubber/scrubber.contracts.ts` |
| Events | `src/features/scrubber/scrubber.events.ts` |
| State shape | `src/features/scrubber/state/scrubber.slice.ts` |
| Sync pipeline | `src/features/scrubber/scrubber.pipeline.ts` |
| Orchestrator | `src/features/scrubber/scrubber.orchestrator.ts` |
| Socket events | `src/shared/lib/socket/socket.events.ts` → scrubber events |
| Domain types | `src/shared/types/scrubber.ts` |
| Time bounds | `src/shared/lib/time/time.constants.ts` |

## 5. Proposal and Voting State Machine

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/voting/README.md` |
| Service contracts | `src/features/voting/voting.contracts.ts` |
| Events | `src/features/voting/voting.events.ts` |
| State shape | `src/features/voting/state/voting.slice.ts` |
| Repository | `src/features/voting/voting.repository.ts` |
| Orchestrator | `src/features/voting/voting.orchestrator.ts` |
| Constants | `src/features/voting/constants/voting.constants.ts` |
| Domain types | `src/shared/types/vote.ts` |

## 6. Consensus Locking and Alarm Arming Flow

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/alarms/README.md` |
| Service contracts | `src/features/alarms/alarms.contracts.ts` |
| Events | `src/features/alarms/alarms.events.ts` |
| State shape | `src/features/alarms/state/alarms.slice.ts` |
| Repository | `src/features/alarms/alarms.repository.ts` |
| Orchestrator | `src/features/alarms/alarms.orchestrator.ts` |
| Constants | `src/features/alarms/constants/alarms.constants.ts` |
| Domain types | `src/shared/types/alarm.ts` |

## 7. Push Notification / Event Planning

| Aspect | Location |
|--------|----------|
| Service README | `src/shared/lib/notifications/README.md` |
| Port contract | `src/shared/lib/notifications/notifications.contracts.ts` |
| Event catalog | `src/shared/lib/notifications/notifications.events.ts` |
| Adapter | `src/shared/lib/notifications/notifications.adapter.ts` |

## 8. Native Alarm Scheduling Abstraction

| Aspect | Location |
|--------|----------|
| Service README | `src/shared/lib/alarms/README.md` |
| Port contract | `src/shared/lib/alarms/alarms.contracts.ts` |
| Adapter | `src/shared/lib/alarms/alarms.adapter.ts` |
| Domain types | `src/shared/types/alarm.ts` → `NativeAlarmHandle` |

## 9. Countdown and Post-Lock Room Lifecycle

| Aspect | Location |
|--------|----------|
| Countdown service | `src/features/alarms/alarms.contracts.ts` → `CountdownService` |
| Countdown state | `src/features/alarms/state/alarms.slice.ts` → `countdownMs`, `isTicking` |
| Countdown formatting | `src/shared/lib/time/time.contracts.ts` → `FormatCountdownFn` |
| Room FSM terminal | `src/features/rooms/rooms.fsm.ts` → `isTerminalStatus` |
| Post-fire lifecycle | `src/features/alarms/alarms.orchestrator.ts` (documented) |

## 10. Failure Modes

| Aspect | Location |
|--------|----------|
| Comprehensive catalog | `docs/failure-modes.md` |
| Disconnect handling | Per-feature README edge cases sections |
| DST edge cases | `src/shared/lib/time/time.dst-edge-cases.ts` |
| Network resilience | `src/shared/constants/app.constants.ts` → `NETWORK` |
| Result type | `src/shared/types/common.ts` → `Result<T, E>` |

## Cross-Cutting Concerns

| Concern | Location |
|---------|----------|
| Domain type barrel | `src/shared/types/domain.ts` |
| Event taxonomy | `src/shared/types/events.ts` |
| Time utilities | `src/shared/lib/time/` |
| Environment config | `src/config/env.ts` |
| Feature flags | `src/config/feature-flags.ts` |
| Firebase init | `src/shared/lib/firebase/firebase.config.ts` |
