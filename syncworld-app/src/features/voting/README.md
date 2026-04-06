# features/voting/

Proposal creation, vote collection, and consensus resolution.

## Responsibility

Manages the proposal-and-vote cycle that determines whether a scrubber position becomes a locked alarm. Enforces quorum requirements, vote tallying, consensus thresholds, proposal expiry, and veto handling. This feature is active when the room is in PROPOSING or VOTING status.

## Scope

- Proposal creation from confirmed scrubber position
- Vote solicitation to all online members
- Real-time tally tracking
- Quorum enforcement
- Consensus threshold evaluation
- Proposal expiry timeout
- Veto handling (single-member rejection)
- Consensus result resolution (locked / rejected / expired)
- Transition triggers back to OPEN or forward to LOCKED

## Key State Domains

| State Field | Description |
|-------------|-------------|
| `activeProposal` | Currently active Proposal entity |
| `votes` | Array of cast Vote entities |
| `tally` | Live VoteTally with accept/reject/pending counts |
| `consensusResult` | Final ConsensusResult after resolution |
| `hasVoted` | Whether the current user has voted |
| `myChoice` | Current user's vote choice |

## Voting State Machine

```
PROPOSING → (proposal created) → VOTING
VOTING → (consensus: accept) → LOCKED
VOTING → (consensus: reject) → OPEN
VOTING → (proposal expired) → OPEN
VOTING → (quorum lost) → OPEN
VOTING → (veto cast) → OPEN
```

## Inputs / Outputs

**Inputs:**
- Scrubber proposal confirmation (from features/scrubber)
- Individual vote casts from members
- Firestore real-time proposal and vote document changes
- Presence changes affecting quorum

**Outputs:**
- ConsensusResult (triggers room FSM transition)
- Vote notification triggers
- Tally updates for real-time display

## Data Dependencies

- `services/firebase` (FirestorePort) — proposal and vote persistence
- `store/voting.slice` — client-side voting state
- `constants/voting.constants` — thresholds and TTLs

## Events / Actions

- `PROPOSAL_CREATED`
- `VOTE_CAST`
- `CONSENSUS_REACHED`
- `PROPOSAL_EXPIRED`
- `PROPOSAL_VETOED`

## Edge Cases

- **Vote during disconnect** — queue locally; submit on reconnect
- **Quorum lost mid-vote** — auto-reject proposal; reset to OPEN
- **Simultaneous proposals** — only one active per room (enforced by Firestore)
- **Member joins during vote** — late joiner can vote; tally recalculates
- **Member leaves during vote** — reduce totalEligible; re-check quorum
- **Proposal expiry race** — server-side Cloud Function expires; client detects via listener
- **Host override** — host can force-create proposal (feature flag gated)
- **Unanimous reject** — fast-path back to OPEN without waiting for timeout
- **Network partition** — members in different partitions may see different tallies; Firestore is canonical

## Integration Points

- **features/scrubber** — receives proposal from scrubber confirmation
- **features/rooms** — triggers ROOM_STATUS_CHANGED on consensus
- **features/alarm** — consensus LOCKED triggers alarm arming
- **services/firebase** — proposal and vote document CRUD
- **services/notifications** — VOTE_REQUESTED push notification
- **lib/time** — proposal expiry computed from UTCEpochMs

## Future Implementation Notes

- Weighted voting (host vote counts more)
- Vote delegation for away members
- Revote mechanism after rejection
- Anonymous voting mode
- Vote history for room analytics
