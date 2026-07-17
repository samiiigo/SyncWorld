// ──────────────────────────────────────────────
// room.ts — Room entity and finite state machine types
// SRP: room structure, status transitions, and room-level metadata only
// ──────────────────────────────────────────────

import type { RoomId, RoomCode, UserId, UTCEpochMs } from './common';

/**
 * Room status FSM:
 *
 *   OPEN → PROPOSING → VOTING → LOCKED → FIRED
 *                ↑         │
 *                └─────────┘  (veto / quorum-loss resets to OPEN)
 */
export type RoomStatus = 'OPEN' | 'PROPOSING' | 'VOTING' | 'LOCKED' | 'FIRED';

/** Allowed transitions — used by the FSM guard to enforce valid moves */
export type RoomStatusTransition = {
  from: RoomStatus;
  to: RoomStatus;
  trigger: string;
};

export type Room = {
  id: RoomId;
  code: RoomCode;
  name: string;
  hostId: UserId;
  status: RoomStatus;
  createdAt: UTCEpochMs;
  updatedAt: UTCEpochMs;
  memberCount: number;
  maxMembers: number;
};

export type RoomSummary = Pick<Room, 'id' | 'code' | 'name' | 'status' | 'memberCount'>;

export type CreateRoomPayload = {
  name: string;
  hostId: UserId;
  maxMembers: number;
};

export type JoinRoomPayload = {
  code: RoomCode;
  userId: UserId;
};
