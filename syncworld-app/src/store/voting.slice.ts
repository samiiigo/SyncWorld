// ──────────────────────────────────────────────
// voting.slice.ts — Proposal and voting state
// SRP: active proposal, vote tally, and consensus tracking only
// ──────────────────────────────────────────────

import type { UserId } from '@domain/common';
import type { Proposal, Vote, VoteTally, ConsensusResult, VoteChoice } from '@domain/vote';

// ── State Shape ──

export type VotingState = {
  activeProposal: Proposal | null;
  votes: Vote[];
  tally: VoteTally | null;
  consensusResult: ConsensusResult | null;
  hasVoted: boolean;
  myChoice: VoteChoice | null;
  isSubmitting: boolean;
  error: string | null;
};

// ── Actions ──

export type VotingActions = {
  setActiveProposal: (proposal: Proposal) => void;
  castVote: (userId: UserId, choice: VoteChoice) => Promise<void>;
  updateTally: (tally: VoteTally) => void;
  resolveConsensus: (result: ConsensusResult) => void;
  clearProposal: () => void;
};

// ── Initial State ──

export const VOTING_INITIAL_STATE: VotingState = {
  activeProposal: null,
  votes: [],
  tally: null,
  consensusResult: null,
  hasVoted: false,
  myChoice: null,
  isSubmitting: false,
  error: null,
};

// TODO: export const useVotingStore = create<VotingState & VotingActions>((set, get) => ({
//   ...VOTING_INITIAL_STATE,
//   setActiveProposal: (_proposal) => { /* TODO */ },
//   castVote: async (_userId, _choice) => { /* TODO */ },
//   updateTally: (_tally) => { /* TODO */ },
//   resolveConsensus: (_result) => { /* TODO */ },
//   clearProposal: () => { /* TODO */ },
// }));
