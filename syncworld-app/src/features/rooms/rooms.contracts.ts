// ──────────────────────────────────────────────
// rooms.contracts.ts — Room feature service contracts
// SRP: room operation signatures only
// DIP: depends on FirestorePort and SocketPort abstractions
// ──────────────────────────────────────────────

import type { RoomId, RoomCode, UserId, AsyncResult, Unsubscribe } from '@app-types/common';
import type { Room, RoomSummary, CreateRoomPayload, JoinRoomPayload, RoomStatus } from '@app-types/room';
import type { LobbySnapshot, Member } from '@app-types/member';

export type RoomService = {
  createRoom: (payload: CreateRoomPayload) => AsyncResult<Room>;
  joinRoom: (payload: JoinRoomPayload) => AsyncResult<Room>;
  leaveRoom: (roomId: RoomId, userId: UserId) => AsyncResult<void>;
  getRoom: (roomId: RoomId) => AsyncResult<Room | null>;
  getRoomByCode: (code: RoomCode) => AsyncResult<Room | null>;
  getMembers: (roomId: RoomId) => AsyncResult<Member[]>;
  subscribeToRoom: (roomId: RoomId, cb: (room: Room) => void) => Unsubscribe;
  subscribeToLobby: (roomId: RoomId, cb: (snapshot: LobbySnapshot) => void) => Unsubscribe;
  transitionStatus: (roomId: RoomId, to: RoomStatus) => AsyncResult<void>;
  generateRoomCode: () => RoomCode;
};

export type RoomPresenceService = {
  startHeartbeat: (roomId: RoomId, userId: UserId) => Unsubscribe;
  reportPresence: (roomId: RoomId, userId: UserId, online: boolean) => AsyncResult<void>;
};

export type CreateRoomService = (deps: {
  firestorePort: unknown;
  socketPort: unknown;
}) => RoomService;
