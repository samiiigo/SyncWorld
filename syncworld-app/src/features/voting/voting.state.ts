// ──────────────────────────────────────────────
// voting.state.ts — Voting state shape reference
// SRP: documents the canonical voting state shape
// ──────────────────────────────────────────────

export type { VotingState, VotingActions } from './state/voting.slice';
export { VOTING_INITIAL_STATE } from './state/voting.slice';

/**
 * State Design Notes:
 *
 * - `activeProposal` is non-null only when room is in PROPOSING or VOTING.
 *   Cleared on consensus resolution or proposal expiry.
 *
 * - `votes` contains all votes for the active proposal. Updated in
 *   real-time via Firestore listener on the votes subcollection.
 *
 * - `tally` is a derived/denormalized view computed from votes array.
 *   Could be computed on read, but stored for render performance.
 *
 * - `hasVoted` and `myChoice` are derived from votes array filtered
 *   by current userId. Stored for quick access in render.
 *
 * - `consensusResult` is set once and triggers the room FSM transition.
 *   It persists until the proposal is cleared.
 */
