// ──────────────────────────────────────────────
// member.ts — Room member and presence types
// SRP: member entity, presence state, and lobby metadata only
// ──────────────────────────────────────────────

import type { MemberId, UserId, RoomId, IANATimezone, UTCEpochMs } from './common';

export type MemberRole = 'host' | 'participant';

export type PresenceStatus = 'online' | 'away' | 'disconnected';

export type Member = {
  id: MemberId;
  userId: UserId;
  roomId: RoomId;
  displayName: string;
  role: MemberRole;
  timezone: IANATimezone;
  presence: PresenceStatus;
  joinedAt: UTCEpochMs;
  lastSeenAt: UTCEpochMs;
};

export type MemberSummary = Pick<Member, 'id' | 'displayName' | 'role' | 'presence' | 'timezone'>;

export type LobbySnapshot = {
  roomId: RoomId;
  members: MemberSummary[];
  onlineCount: number;
  quorumMet: boolean;
};
