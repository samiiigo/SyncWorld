// ──────────────────────────────────────────────
// domain.ts — Barrel re-export for all domain types
// SRP: single import point for consumer modules
// ──────────────────────────────────────────────

export type { UTCEpochMs, IANATimezone, UserId, RoomId, MemberId, VoteId, AlarmId, SessionId, RoomCode, Result, AsyncResult, Unsubscribe, PaginationCursor } from './common';
export type { RoomStatus, RoomStatusTransition, Room, RoomSummary, CreateRoomPayload, JoinRoomPayload } from './room';
export type { MemberRole, PresenceStatus, Member, MemberSummary, LobbySnapshot } from './member';
export type { VoteChoice, ProposalOrigin, Proposal, Vote, VoteTally, ConsensusResult } from './vote';
export type { AlarmStatus, Alarm, LocalAlarmView, ScheduleAlarmPayload, NativeAlarmHandle } from './alarm';
export type { ScrubberPosition, ScrubberSyncFrame, ScrubberLocalState, ScrubberBounds } from './scrubber';
export type { IdentityEvent, RoomEvent, PresenceEvent, ScrubberEvent, VotingEvent, AlarmEvent, SyncWorldEvent, EventOfKind } from './events';
