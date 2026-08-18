import type { Socket } from 'socket.io';
import { verifyMembershipWithFirestore, isCachedRoomMember } from '../sockets/roomMembership.guard';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

jest.mock('../lib/firebaseAdmin', () => {
  const docGetMock = jest.fn();
  const docMock = jest.fn(() => ({ get: docGetMock }));
  const collectionMock2 = jest.fn(() => ({ doc: docMock }));
  const docMock1 = jest.fn(() => ({ collection: collectionMock2 }));
  const collectionMock1 = jest.fn(() => ({ doc: docMock1 }));

  return {
    firebaseAdminFirestore: {
      collection: collectionMock1,
    },
    __docGetMock: docGetMock, // Export for easy spying
  };
});

const { __docGetMock } = require('../lib/firebaseAdmin');

describe('roomMembership.guard.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyMembershipWithFirestore', () => {
    it('should return false for a non-member attempting read/write', async () => {
      __docGetMock.mockResolvedValueOnce({ exists: false });

      const result = await verifyMembershipWithFirestore('room-123', 'uid-456');
      expect(result).toBe(false);
      expect(firebaseAdminFirestore.collection).toHaveBeenCalledWith('rooms');
    });

    it('should return true for a valid member', async () => {
      __docGetMock.mockResolvedValueOnce({ exists: true });

      const result = await verifyMembershipWithFirestore('room-123', 'uid-456');
      expect(result).toBe(true);
    });
  });

  describe('isCachedRoomMember', () => {
    it('should return false if authorizedRooms is undefined (expired or invalid membership context)', () => {
      const mockSocket = { data: {} } as unknown as Socket;
      const result = isCachedRoomMember(mockSocket, 'room-123');
      expect(result).toBe(false);
    });

    it('should return false if roomId is not in the set (non-member)', () => {
      const mockSocket = { data: { authorizedRooms: new Set(['room-999']) } } as unknown as Socket;
      const result = isCachedRoomMember(mockSocket, 'room-123');
      expect(result).toBe(false);
    });

    it('should return true if roomId is in the set', () => {
      const mockSocket = { data: { authorizedRooms: new Set(['room-123']) } } as unknown as Socket;
      const result = isCachedRoomMember(mockSocket, 'room-123');
      expect(result).toBe(true);
    });
  });

  describe('Cache vs Firestore Disagreement', () => {
    it('should allow cache to say member is present even if Firestore says they are not (e.g. revoked)', async () => {
      // Simulate Firestore revoking the membership
      __docGetMock.mockResolvedValueOnce({ exists: false });
      
      const firestoreResult = await verifyMembershipWithFirestore('room-123', 'uid-456');
      expect(firestoreResult).toBe(false);

      // But if the socket was already joined and authorized, cache still says true
      const mockSocket = { data: { authorizedRooms: new Set(['room-123']) } } as unknown as Socket;
      const cacheResult = isCachedRoomMember(mockSocket, 'room-123');
      expect(cacheResult).toBe(true);
      
      // They disagree because cache is purely memory-based after initial join
      expect(cacheResult).not.toBe(firestoreResult);
    });
  });
});
