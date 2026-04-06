# features/scrubber/

Scrubber synchronization pipeline for shared time selection.

## Responsibility

Manages the real-time shared scrubber that allows room members to collaboratively select an alarm time. The scrubber value is always a UTCEpochMs timestamp. Each member's client converts this to their local timezone for display. Synchronization uses Socket.io for low-latency updates with Firestore as the durable fallback.

## Scope

- Scrubber position broadcasting via Socket.io
- Conflict resolution for simultaneous drag
- Sequence number ordering for eventual consistency
- Debounced emission to reduce network chatter
- Scrubber bounds calculation (min/max/step)
- Proposal confirmation (scrubber -> proposal transition)
- Fallback to Firestore polling when socket is unavailable

## Key State Domains

| State Field | Description |
|-------------|-------------|
| `currentPosition` | Latest scrubber value (UTCEpochMs + metadata) |
| `isDragging` | Whether local user is actively dragging |
| `lastReceivedSeq` | Highest sequence number from remote |
| `lastEmittedSeq` | Highest sequence number sent locally |
| `conflictDetected` | True when local and remote sequences diverge |
| `bounds` | Allowed scrubber range and step size |

## Synchronization Pipeline

```
Local drag → debounce → emit Socket.io frame → server broadcast
                                                      ↓
                                            Remote members receive
                                                      ↓
                                         Apply if seq > lastReceivedSeq
                                                      ↓
                                           Update store + re-render
```

## Inputs / Outputs

**Inputs:**
- User drag gesture (local position changes)
- Socket.io scrubber frames (remote position changes)
- Room status (scrubber active only in OPEN status)

**Outputs:**
- ScrubberPosition for display in all members' timezones
- Proposal submission trigger (transitions room to PROPOSING)

## Data Dependencies

- `services/socket` (SocketPort) — real-time scrubber frames
- `services/firebase` (FirestorePort) — durable position fallback
- `store/scrubber.slice` — local scrubber state
- `lib/time` — UTC ↔ local conversion for display

## Events / Actions

- `SCRUBBER_POSITION_UPDATED`
- `SCRUBBER_CONFLICT_DETECTED`
- `SCRUBBER_PROPOSAL_SUBMITTED`

## Edge Cases

- **Simultaneous drag** — last-writer-wins with sequence numbers; conflict flag surfaces to UI
- **Socket disconnect during drag** — preserve local state; re-sync on reconnect
- **Stale position after reconnect** — fetch latest from Firestore; reconcile with local
- **Scrubber at DST boundary** — checkDSTSafety warns before proposal submission
- **Rapid toggling** — debounce prevents flooding; throttle enforces max emit rate
- **Large member count** — server fan-out; consider relay/mesh for 20+ members

## Integration Points

- **features/rooms** — scrubber active only when room status is OPEN
- **features/voting** — scrubber confirmation triggers proposal creation
- **services/socket** — primary transport for scrubber frames
- **services/firebase** — fallback position persistence
- **lib/time** — DST safety check before proposal submission

## Future Implementation Notes

- Operational transform or CRDT for true collaborative editing
- Haptic feedback on conflict detection
- Historical scrubber position timeline for late joiners
- Bandwidth-adaptive frame rate (reduce on poor connection)
