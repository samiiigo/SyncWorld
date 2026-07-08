// ──────────────────────────────────────────────
// rooms.repository.ts — Room data access layer
// SRP: Firestore read/write for room and member documents only
// DIP: depends on FirestorePort abstraction
// ──────────────────────────────────────────────

import type { RoomId, RoomCode, UserId, AsyncResult, Unsubscribe } from '@domain/common';
import type { Room, RoomStatus } from '@domain/room';
import type { Member } from '@domain/member';
import type { FirestorePort } from '@services/firebase/firebase.contracts';

export type RoomRepository = {
  createRoom: (room: Room) => AsyncResult<void>;
  getRoom: (roomId: RoomId) => AsyncResult<Room | null>;
  getRoomByCode: (code: RoomCode) => AsyncResult<Room | null>;
  updateRoomStatus: (roomId: RoomId, status: RoomStatus) => AsyncResult<void>;
  deleteRoom: (roomId: RoomId) => AsyncResult<void>;
  subscribeToRoom: (roomId: RoomId, cb: (room: Room | null) => void) => Unsubscribe;
  addMember: (member: Member) => AsyncResult<void>;
  removeMember: (roomId: RoomId, userId: UserId) => AsyncResult<void>;
  getMembers: (roomId: RoomId) => AsyncResult<Member[]>;
  subscribeToMembers: (roomId: RoomId, cb: (members: Member[]) => void) => Unsubscribe;
  incrementMemberCount: (roomId: RoomId, delta: number) => AsyncResult<void>;
};

export type CreateRoomRepository = (deps: {
  firestorePort: FirestorePort;
}) => RoomRepository;

/**
 * TODO: implement createRoomRepository
 * - rooms collection: 'rooms/{roomId}'
 * - members subcollection: 'rooms/{roomId}/members/{memberId}'
 * - room code index: 'room_codes/{code}' -> roomId (for O(1) code lookup)
 * - use Firestore transactions for join (increment memberCount + add member)
 */
