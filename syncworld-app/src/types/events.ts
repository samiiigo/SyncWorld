// ──────────────────────────────────────────────
// events.ts — Exhaustive event/action union types across all domains
// SRP: event taxonomy only — no handlers, no side effects
// OCP: new events are added to unions without modifying existing entries
// ──────────────────────────────────────────────

import type { UTCEpochMs, UserId, RoomId } from './common';
import type { RoomStatus } from './room';
import type { PresenceStatus } from './member';
import type { VoteChoice, ConsensusResult } from './vote';
import type { ScrubberPosition } from './scrubber';
import type { AlarmStatus } from './alarm';

// ── Identity Events ──

export type IdentityEvent =
  | { kind: 'IDENTITY_ANONYMOUS_SESSION_STARTED'; userId: UserId; timestamp: UTCEpochMs }
  | { kind: 'IDENTITY_AUTH_LINKED'; userId: UserId; provider: string; timestamp: UTCEpochMs }
  | { kind: 'IDENTITY_SESSION_EXPIRED'; userId: UserId; timestamp: UTCEpochMs }
  | { kind: 'IDENTITY_SESSION_RESTORED'; userId: UserId; timestamp: UTCEpochMs };

// ── Room Events ──

export type RoomEvent =
  | { kind: 'ROOM_CREATED'; roomId: RoomId; hostId: UserId; timestamp: UTCEpochMs }
  | { kind: 'ROOM_JOINED'; roomId: RoomId; userId: UserId; timestamp: UTCEpochMs }
  | { kind: 'ROOM_LEFT'; roomId: RoomId; userId: UserId; timestamp: UTCEpochMs }
  | { kind: 'ROOM_STATUS_CHANGED'; roomId: RoomId; from: RoomStatus; to: RoomStatus; timestamp: UTCEpochMs }
  | { kind: 'ROOM_CLOSED'; roomId: RoomId; timestamp: UTCEpochMs };

// ── Presence Events ──

export type PresenceEvent =
  | { kind: 'MEMBER_PRESENCE_CHANGED'; roomId: RoomId; userId: UserId; status: PresenceStatus; timestamp: UTCEpochMs }
  | { kind: 'QUORUM_STATUS_CHANGED'; roomId: RoomId; quorumMet: boolean; timestamp: UTCEpochMs };

// ── Scrubber Events ──

export type ScrubberEvent =
  | { kind: 'SCRUBBER_POSITION_UPDATED'; roomId: RoomId; position: ScrubberPosition; timestamp: UTCEpochMs }
  | { kind: 'SCRUBBER_CONFLICT_DETECTED'; roomId: RoomId; localSeq: number; remoteSeq: number; timestamp: UTCEpochMs }
  | { kind: 'SCRUBBER_PROPOSAL_SUBMITTED'; roomId: RoomId; position: ScrubberPosition; timestamp: UTCEpochMs };

// ── Voting Events ──

export type VotingEvent =
  | { kind: 'PROPOSAL_CREATED'; roomId: RoomId; proposalId: string; proposedTimeUtc: UTCEpochMs; timestamp: UTCEpochMs }
  | { kind: 'VOTE_CAST'; roomId: RoomId; proposalId: string; userId: UserId; choice: VoteChoice; timestamp: UTCEpochMs }
  | { kind: 'CONSENSUS_REACHED'; roomId: RoomId; result: ConsensusResult; timestamp: UTCEpochMs }
  | { kind: 'PROPOSAL_EXPIRED'; roomId: RoomId; proposalId: string; timestamp: UTCEpochMs }
  | { kind: 'PROPOSAL_VETOED'; roomId: RoomId; proposalId: string; vetoedBy: UserId; timestamp: UTCEpochMs };

// ── Alarm Events ──

export type AlarmEvent =
  | { kind: 'ALARM_ARMED'; roomId: RoomId; targetTimeUtc: UTCEpochMs; timestamp: UTCEpochMs }
  | { kind: 'ALARM_FIRED'; roomId: RoomId; timestamp: UTCEpochMs }
  | { kind: 'ALARM_CANCELLED'; roomId: RoomId; timestamp: UTCEpochMs }
  | { kind: 'ALARM_STATUS_CHANGED'; roomId: RoomId; status: AlarmStatus; timestamp: UTCEpochMs }
  | { kind: 'NATIVE_ALARM_SCHEDULED'; roomId: RoomId; platformId: string; timestamp: UTCEpochMs }
  | { kind: 'NATIVE_ALARM_FAILED'; roomId: RoomId; reason: string; timestamp: UTCEpochMs };

// ── Aggregate Union ──

export type SyncWorldEvent =
  | IdentityEvent
  | RoomEvent
  | PresenceEvent
  | ScrubberEvent
  | VotingEvent
  | AlarmEvent;

/** Discriminant extractor — narrows a SyncWorldEvent by its `kind` field */
export type EventOfKind<K extends SyncWorldEvent['kind']> = Extract<SyncWorldEvent, { kind: K }>;
