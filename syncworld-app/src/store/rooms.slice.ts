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

// TODO: export const useRoomsStore = create<RoomsState & RoomsActions>((set, get) => ({
//   ...ROOMS_INITIAL_STATE,
//   createRoom: async (_name, _maxMembers) => { /* TODO */ },
//   joinRoom: async (_code) => { /* TODO */ },
//   leaveRoom: async () => { /* TODO */ },
//   setActiveRoom: (_roomId) => { /* TODO */ },
//   handleStatusTransition: (_roomId, _newStatus) => { /* TODO */ },
//   updateLobby: (_snapshot) => { /* TODO */ },
// }));
