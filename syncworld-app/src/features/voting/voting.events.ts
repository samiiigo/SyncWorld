// ──────────────────────────────────────────────
// voting.events.ts — Voting domain events (re-export subset)
// SRP: surfaces only voting-relevant events
// ──────────────────────────────────────────────

export type { VotingEvent } from '@types/events';

export const VOTING_EVENT_KINDS = [
  'PROPOSAL_CREATED',
  'VOTE_CAST',
  'CONSENSUS_REACHED',
  'PROPOSAL_EXPIRED',
  'PROPOSAL_VETOED',
] as const;
