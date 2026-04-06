# Feature Map

Comprehensive mapping of all SyncWorld product areas to their blueprint locations.

## 1. Identity and Anonymous Session Bootstrap

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/identity/README.md` |
| Service contracts | `src/features/identity/identity.contracts.ts` |
| Events | `src/features/identity/identity.events.ts` |
| State shape | `src/store/identity.slice.ts` |
| Repository | `src/features/identity/identity.repository.ts` |
| Orchestrator | `src/features/identity/identity.orchestrator.ts` |
| Auth port | `src/services/firebase/firebase.contracts.ts` → `AuthPort` |
| Domain types | `src/types/common.ts` → `UserId`, `SessionId`, `IANATimezone` |

## 2. Room Creation and Join Flow

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/rooms/README.md` |
| Service contracts | `src/features/rooms/rooms.contracts.ts` |
| Events | `src/features/rooms/rooms.events.ts` |
| State shape | `src/store/rooms.slice.ts` |
| Repository | `src/features/rooms/rooms.repository.ts` |
| FSM guard | `src/features/rooms/rooms.fsm.ts` |
| Orchestrator | `src/features/rooms/rooms.orchestrator.ts` |
| Constants | `src/constants/room.constants.ts` |
| Domain types | `src/types/room.ts`, `src/types/member.ts` |

## 3. Lobby and Presence Model

| Aspect | Location |
|--------|----------|
| Presence types | `src/types/member.ts` → `PresenceStatus`, `LobbySnapshot` |
| Presence service | `src/features/rooms/rooms.contracts.ts` → `RoomPresenceService` |
| Presence events | `src/types/events.ts` → `PresenceEvent` |
| Socket events | `src/services/socket/socket.events.ts` → presence events |
| Heartbeat config | `src/constants/app.constants.ts` → `PRESENCE` |

## 4. Scrubber Synchronization Pipeline

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/scrubber/README.md` |
| Service contracts | `src/features/scrubber/scrubber.contracts.ts` |
| Events | `src/features/scrubber/scrubber.events.ts` |
| State shape | `src/store/scrubber.slice.ts` |
| Sync pipeline | `src/features/scrubber/scrubber.pipeline.ts` |
| Orchestrator | `src/features/scrubber/scrubber.orchestrator.ts` |
| Socket events | `src/services/socket/socket.events.ts` → scrubber events |
| Domain types | `src/types/scrubber.ts` |
| Time bounds | `src/lib/time/time.constants.ts` |

## 5. Proposal and Voting State Machine

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/voting/README.md` |
| Service contracts | `src/features/voting/voting.contracts.ts` |
| Events | `src/features/voting/voting.events.ts` |
| State shape | `src/store/voting.slice.ts` |
| Repository | `src/features/voting/voting.repository.ts` |
| Orchestrator | `src/features/voting/voting.orchestrator.ts` |
| Constants | `src/constants/voting.constants.ts` |
| Domain types | `src/types/vote.ts` |

## 6. Consensus Locking and Alarm Arming Flow

| Aspect | Location |
|--------|----------|
| Feature README | `src/features/alarm/README.md` |
| Service contracts | `src/features/alarm/alarm.contracts.ts` |
| Events | `src/features/alarm/alarm.events.ts` |
| State shape | `src/store/alarm.slice.ts` |
| Repository | `src/features/alarm/alarm.repository.ts` |
| Orchestrator | `src/features/alarm/alarm.orchestrator.ts` |
| Constants | `src/constants/alarm.constants.ts` |
| Domain types | `src/types/alarm.ts` |

## 7. Push Notification / Event Planning

| Aspect | Location |
|--------|----------|
| Service README | `src/services/notifications/README.md` |
| Port contract | `src/services/notifications/notifications.contracts.ts` |
| Event catalog | `src/services/notifications/notifications.events.ts` |
| Adapter | `src/services/notifications/notifications.adapter.ts` |

## 8. Native Alarm Scheduling Abstraction

| Aspect | Location |
|--------|----------|
| Service README | `src/services/alarms/README.md` |
| Port contract | `src/services/alarms/alarms.contracts.ts` |
| Adapter | `src/services/alarms/alarms.adapter.ts` |
| Domain types | `src/types/alarm.ts` → `NativeAlarmHandle` |

## 9. Countdown and Post-Lock Room Lifecycle

| Aspect | Location |
|--------|----------|
| Countdown service | `src/features/alarm/alarm.contracts.ts` → `CountdownService` |
| Countdown state | `src/store/alarm.slice.ts` → `countdownMs`, `isTicking` |
| Countdown formatting | `src/lib/time/time.contracts.ts` → `FormatCountdownFn` |
| Room FSM terminal | `src/features/rooms/rooms.fsm.ts` → `isTerminalStatus` |
| Post-fire lifecycle | `src/features/alarm/alarm.orchestrator.ts` (documented) |

## 10. Failure Modes

| Aspect | Location |
|--------|----------|
| Comprehensive catalog | `docs/failure-modes.md` |
| Disconnect handling | Per-feature README edge cases sections |
| DST edge cases | `src/lib/time/time.dst-edge-cases.ts` |
| Network resilience | `src/constants/app.constants.ts` → `NETWORK` |
| Result type | `src/types/common.ts` → `Result<T, E>` |

## Cross-Cutting Concerns

| Concern | Location |
|---------|----------|
| Domain type barrel | `src/types/domain.ts` |
| Event taxonomy | `src/types/events.ts` |
| Time utilities | `src/lib/time/` |
| Environment config | `src/config/env.ts` |
| Feature flags | `src/config/feature-flags.ts` |
| Firebase init | `src/services/firebase/firebase.config.ts` |
