// ──────────────────────────────────────────────
// rooms.slice.ts — Room entity and FSM state
// SRP: room list, active room, and status transitions only
// ──────────────────────────────────────────────

import type { RoomId } from '@domain/common';
import type { Room, RoomStatus } from '@domain/room';
import type { LobbySnapshot } from '@domain/member';

// ── State Shape ──

export type RoomsState = {
  activeRoomId: RoomId | null;
  activeRoom: Room | null;
  lobby: LobbySnapshot | null;
  rooms: Record<string, Room>;
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
};

// ── Actions ──

export type RoomsActions = {
  createRoom: (name: string, maxMembers: number) => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setActiveRoom: (roomId: RoomId) => void;
  handleStatusTransition: (roomId: RoomId, newStatus: RoomStatus) => void;
  updateLobby: (snapshot: LobbySnapshot) => void;
};

// ── Initial State ──

export const ROOMS_INITIAL_STATE: RoomsState = {
  activeRoomId: null,
  activeRoom: null,
  lobby: null,
  rooms: {},
  isCreating: false,
  isJoining: false,
  error: null,
};

// ── Runtime store ──
// The live implementation moved to the session engine:
//   src/features/session/session.store.ts (persisted profile + rooms)
//   src/features/session/backends/*.backend.ts (Firebase/Socket.io or demo)
// consumed through AppContext. These types remain as the feature contract.
