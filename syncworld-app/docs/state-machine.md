# Room Finite State Machine

## Status Definitions

| Status | Description | Active Features |
|--------|-------------|-----------------|
| `OPEN` | Room is accepting scrubber input | Scrubber, Presence |
| `PROPOSING` | Scrubber confirmed, proposal being created | Voting (setup) |
| `VOTING` | Members are casting votes | Voting (active) |
| `LOCKED` | Consensus reached, alarm armed | Alarm (countdown) |
| `FIRED` | Alarm has triggered | Post-fire (terminal) |

## Transition Table

| From | To | Trigger | Guard Conditions |
|------|----|---------|-----------------|
| `OPEN` | `PROPOSING` | Scrubber confirmed | Room has quorum; scrubber position valid |
| `PROPOSING` | `VOTING` | Proposal created | Proposal cooldown elapsed; no active proposal |
| `VOTING` | `LOCKED` | Consensus reached | Votes meet CONSENSUS_THRESHOLD; quorum maintained |
| `VOTING` | `OPEN` | Proposal rejected | Majority reject or explicit veto |
| `VOTING` | `OPEN` | Proposal expired | PROPOSAL_TTL_MS elapsed without consensus |
| `VOTING` | `OPEN` | Quorum lost | Online members drop below QUORUM_THRESHOLD |
| `LOCKED` | `FIRED` | Alarm fired | Countdown reached zero |
| `LOCKED` | `OPEN` | Alarm cancelled | Host initiated cancellation |

## Visual Diagram

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
    ┌────────┐  confirm   ┌───────────┐  create   ┌────────┐
    │  OPEN  │──────────→│ PROPOSING │─────────→│ VOTING │
    │        │            │           │           │        │
    └────────┘            └───────────┘           └────┬───┘
        ▲                                              │
        │         reject / expire / quorum loss        │
        ├──────────────────────────────────────────────┘
        │                                              │
        │              consensus reached               │
        │                                              ▼
        │           cancel              ┌────────┐  fire   ┌────────┐
        └───────────────────────────────│ LOCKED │───────→│ FIRED  │
                                        │        │         │(term.) │
                                        └────────┘         └────────┘
```

## Implementation

The FSM guard logic lives in `src/features/rooms/rooms.fsm.ts`:

- `validateTransition(from, to)` — returns `Result<trigger>` or error
- `getReachableStatuses(from)` — lists valid next statuses
- `isTerminalStatus(status)` — returns true for FIRED

The transition table is defined as a constant in `src/constants/room.constants.ts` → `ROOM_TRANSITIONS`, making it open for extension (add transitions) without modifying the FSM logic (OCP).

## Feature Activation per Status

```
OPEN       → [scrubber: active]  [voting: inactive]  [alarm: inactive]
PROPOSING  → [scrubber: locked]  [voting: setup]     [alarm: inactive]
VOTING     → [scrubber: locked]  [voting: active]    [alarm: inactive]
LOCKED     → [scrubber: locked]  [voting: resolved]  [alarm: countdown]
FIRED      → [scrubber: locked]  [voting: resolved]  [alarm: fired]
```

## Edge Cases

1. **Rapid transition attempts** — FSM guard rejects invalid `from → to` pairs
2. **Concurrent transition writes** — Firestore transaction ensures atomic status update
3. **Stale client status** — real-time listener keeps clients synchronized
4. **Orphaned PROPOSING** — if proposal creation fails, Cloud Function reverts to OPEN
5. **LOCKED without alarm** — should not occur; arm failure triggers revert to OPEN
