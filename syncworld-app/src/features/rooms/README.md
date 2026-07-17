# features/rooms/

Room creation, join flow, lobby management, and FSM lifecycle.

## Responsibility

Manages the entire room lifecycle from creation through firing. Owns the room finite state machine (OPEN -> PROPOSING -> VOTING -> LOCKED -> FIRED) and the lobby presence model. This is the central coordination feature — most other features operate within the context of an active room.

## Scope

- Room creation with code generation
- Room join via invite code
- Room code validation
- Lobby member list with presence
- Room status FSM transitions
- Quorum tracking
- Host privilege management
- Room closure and cleanup
- Post-FIRED room lifecycle

## Key State Domains

| State Field | Description |
|-------------|-------------|
| `activeRoomId` | Currently active room |
| `activeRoom` | Full room entity |
| `lobby` | LobbySnapshot with member list and quorum |
| `rooms` | Cache of known rooms |
| `isCreating` / `isJoining` | Loading flags |

## Finite State Machine

```
OPEN ──→ PROPOSING ──→ VOTING ──→ LOCKED ──→ FIRED
              ↑            │
              └────────────┘
         (veto / quorum loss / expiry)
```

### Transition Rules

| From | To | Trigger |
|------|----|---------|
| OPEN | PROPOSING | Scrubber confirmed |
| PROPOSING | VOTING | Proposal created |
| VOTING | LOCKED | Consensus reached |
| VOTING | OPEN | Proposal rejected / expired / quorum lost |
| LOCKED | FIRED | Alarm fired |
| LOCKED | OPEN | Alarm cancelled |

## Inputs / Outputs

**Inputs:**
- User actions (create, join, leave)
- Firestore room document changes (real-time listener)
- Socket.io presence events
- Voting consensus results
- Alarm fire events

**Outputs:**
- Room entity for all downstream features
- LobbySnapshot for presence display
- FSM status for conditional feature activation
- Quorum status for voting eligibility

## Data Dependencies

- `services/firebase` (FirestorePort) — room and member CRUD
- `services/socket` (SocketPort) — presence heartbeat and member events
- `store/rooms.slice` — client-side room and lobby state

## Events / Actions

- `ROOM_CREATED`, `ROOM_JOINED`, `ROOM_LEFT`
- `ROOM_STATUS_CHANGED`, `ROOM_CLOSED`
- `MEMBER_PRESENCE_CHANGED`, `QUORUM_STATUS_CHANGED`

## Edge Cases

- **Simultaneous join** — Firestore transaction ensures member count consistency
- **Host disconnect** — presence tracks; auto-assign new host after timeout
- **Max members reached** — reject join; surface error with room-full message
- **Stale room code** — validate room exists and is OPEN before join
- **Orphaned rooms** — Cloud Function cleanup for rooms with no members after TTL
- **Rapid status transitions** — FSM guard rejects invalid transitions

## Integration Points

- **features/auth** — userId required for room operations
- **features/scrubber** — active only when room is OPEN
- **features/voting** — active only when room is PROPOSING or VOTING
- **features/alarms** — armed only when room is LOCKED
- **services/firebase** — room and member document persistence
- **services/socket** — real-time presence and status events
- **services/notifications** — notify on member join and status changes

## Future Implementation Notes

- Room archival for post-FIRED history viewing
- Room rejoin after disconnect with grace period
- Room settings (e.g., voting threshold override, max members adjustment)
- Spectator mode (non-voting observer)
