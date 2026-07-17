// ──────────────────────────────────────────────
// vote.ts — Voting and proposal types
// SRP: vote entity, ballot structure, and consensus result only
// ──────────────────────────────────────────────

import type { VoteId, UserId, RoomId, UTCEpochMs } from './common';

export type VoteChoice = 'accept' | 'reject';

export type ProposalOrigin = 'scrubber_confirm' | 'host_override';

export type Proposal = {
  id: string;
  roomId: RoomId;
  proposedBy: UserId;
  origin: ProposalOrigin;
  proposedTimeUtc: UTCEpochMs;
  createdAt: UTCEpochMs;
  expiresAt: UTCEpochMs;
};

export type Vote = {
  id: VoteId;
  proposalId: string;
  roomId: RoomId;
  castBy: UserId;
  choice: VoteChoice;
  castAt: UTCEpochMs;
};

export type VoteTally = {
  proposalId: string;
  roomId: RoomId;
  accepts: number;
  rejects: number;
  pending: number;
  totalEligible: number;
  quorumReached: boolean;
  consensusReached: boolean;
};

export type ConsensusResult = {
  proposalId: string;
  outcome: 'locked' | 'rejected' | 'expired';
  finalTally: VoteTally;
  resolvedAt: UTCEpochMs;
};
