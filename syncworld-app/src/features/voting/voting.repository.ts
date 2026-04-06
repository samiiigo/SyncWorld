// ──────────────────────────────────────────────
// voting.repository.ts — Voting data access layer
// SRP: Firestore read/write for proposals and votes only
// DIP: depends on FirestorePort abstraction
// ──────────────────────────────────────────────

import type { RoomId, UserId, AsyncResult, Unsubscribe } from '@types/common';
import type { Proposal, Vote, VoteChoice } from '@types/vote';
import type { FirestorePort } from '@services/firebase/firebase.contracts';

export type VotingRepository = {
  createProposal: (proposal: Proposal) => AsyncResult<void>;
  getActiveProposal: (roomId: RoomId) => AsyncResult<Proposal | null>;
  updateProposal: (proposalId: string, partial: Partial<Proposal>) => AsyncResult<void>;
  subscribeToProposal: (roomId: RoomId, cb: (proposal: Proposal | null) => void) => Unsubscribe;
  castVote: (vote: Vote) => AsyncResult<void>;
  getVotes: (proposalId: string) => AsyncResult<Vote[]>;
  getVoteByUser: (proposalId: string, userId: UserId) => AsyncResult<Vote | null>;
  subscribeToVotes: (proposalId: string, cb: (votes: Vote[]) => void) => Unsubscribe;
};

export type CreateVotingRepository = (deps: {
  firestorePort: FirestorePort;
}) => VotingRepository;

/**
 * TODO: implement createVotingRepository
 * - proposals collection: 'rooms/{roomId}/proposals/{proposalId}'
 * - votes subcollection: 'rooms/{roomId}/proposals/{proposalId}/votes/{voteId}'
 * - enforce one vote per user per proposal via Firestore security rules
 * - expire proposals via Cloud Function trigger on expiresAt field
 */
