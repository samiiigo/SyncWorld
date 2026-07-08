// ──────────────────────────────────────────────
// voting.contracts.ts — Voting feature service contracts
// SRP: voting operation signatures only
// DIP: depends on FirestorePort abstraction
// ISP: separate from room and alarm contracts
// ──────────────────────────────────────────────

import type { RoomId, UserId, UTCEpochMs, AsyncResult, Unsubscribe } from '@app-types/common';
import type { Proposal, Vote, VoteTally, VoteChoice, ConsensusResult } from '@app-types/vote';

export type VotingService = {
  createProposal: (roomId: RoomId, proposedBy: UserId, timeUtc: UTCEpochMs) => AsyncResult<Proposal>;
  getActiveProposal: (roomId: RoomId) => AsyncResult<Proposal | null>;
  castVote: (proposalId: string, userId: UserId, choice: VoteChoice) => AsyncResult<Vote>;
  getTally: (proposalId: string) => AsyncResult<VoteTally>;
  subscribeToTally: (proposalId: string, cb: (tally: VoteTally) => void) => Unsubscribe;
  subscribeToProposal: (roomId: RoomId, cb: (proposal: Proposal | null) => void) => Unsubscribe;
  resolveConsensus: (proposalId: string) => AsyncResult<ConsensusResult>;
  expireProposal: (proposalId: string) => AsyncResult<void>;
};

export type QuorumChecker = {
  isQuorumMet: (onlineCount: number, totalMembers: number) => boolean;
  isConsensusMet: (accepts: number, totalVotes: number) => boolean;
  getRequiredVotes: (totalEligible: number) => number;
};

export type CreateVotingService = (deps: {
  firestorePort: unknown;
}) => VotingService;
