import functionsTestInit from 'firebase-functions-test';
import { HttpsError } from 'firebase-functions/v2/https';
import { isValidTransition, ROOM_TRANSITIONS, type RoomStatus } from '../lib/roomFsm';
import { transitionRoomStatusInputSchema } from '../lib/validation';

const testEnv = functionsTestInit();

// Mocks for Firestore and RateLimit
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock('../lib/firebaseAdmin', () => {
  return {
    firebaseAdminFirestore: {
      collection: (...args: any[]) => mockCollection(...args),
      doc: (...args: any[]) => mockDoc(...args),
      runTransaction: (cb: any) => mockRunTransaction(cb),
    },
  };
});

jest.mock('../lib/rateLimit', () => ({
  assertWithinRateLimit: jest.fn().mockResolvedValue(true),
}));

import { transitionRoomStatus } from '../callable/transitionRoomStatus';

/** rooms/{id}/members subcollection mock: the caller is (or is not) a member. */
const membersCollection = (isMember: boolean) =>
  jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: isMember }) }) });
import { onProposalWrite } from '../triggers/onProposalWrite';

describe('Room FSM Logic', () => {
  afterAll(() => {
    testEnv.cleanup();
  });

  describe('Transition Matrix & Helper (isValidTransition)', () => {
    it('defines expected transitions in ROOM_TRANSITIONS', () => {
      expect(ROOM_TRANSITIONS.length).toBeGreaterThanOrEqual(6);
    });

    it('permits valid state transitions', () => {
      expect(isValidTransition('OPEN', 'PROPOSING')).toBe(true);
      expect(isValidTransition('PROPOSING', 'VOTING')).toBe(true);
      expect(isValidTransition('VOTING', 'LOCKED')).toBe(true);
      expect(isValidTransition('VOTING', 'OPEN')).toBe(true);
      expect(isValidTransition('LOCKED', 'FIRED')).toBe(true);
      expect(isValidTransition('LOCKED', 'OPEN')).toBe(true);
    });

    it('rejects invalid state transitions', () => {
      expect(isValidTransition('OPEN', 'LOCKED')).toBe(false);
      expect(isValidTransition('OPEN', 'FIRED')).toBe(false);
      expect(isValidTransition('PROPOSING', 'LOCKED')).toBe(false);
      expect(isValidTransition('PROPOSING', 'FIRED')).toBe(false);
      expect(isValidTransition('LOCKED', 'PROPOSING')).toBe(false);
      expect(isValidTransition('FIRED', 'OPEN')).toBe(false);
      expect(isValidTransition('FIRED', 'VOTING')).toBe(false);
    });
  });

  describe('Validation Schemas', () => {
    it('rejects invalid status transitions in input schema', () => {
      const result = transitionRoomStatusInputSchema.safeParse({ roomId: '123', targetStatus: 'INVALID_STATUS' });
      expect(result.success).toBe(false);
    });

    it('accepts valid status transitions in input schema', () => {
      const result = transitionRoomStatusInputSchema.safeParse({ roomId: '123', targetStatus: 'LOCKED' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roomId).toBe('123');
        expect(result.data.targetStatus).toBe('LOCKED');
      }
    });

    it('rejects input with missing roomId', () => {
      const result = transitionRoomStatusInputSchema.safeParse({ targetStatus: 'LOCKED' });
      expect(result.success).toBe(false);
    });
  });

  describe('transitionRoomStatus Callable Function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('throws unauthenticated error when auth context is missing', async () => {
      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
          auth: undefined,
          app: { appId: 'test-app' },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it('throws failed-precondition error when app check is missing', async () => {
      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
          auth: { uid: 'user-1' },
          app: undefined,
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it('throws not-found when room doc does not exist', async () => {
      const mockRoomRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      mockCollection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRoomRef),
      });

      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'nonexistent-room', targetStatus: 'PROPOSING' },
          auth: { uid: 'user-1' },
          app: { appId: 'test-app' },
        } as any)
      ).rejects.toThrow('Room not found.');
    });

    it('throws failed-precondition on invalid status transition', async () => {
      const mockRoomRef = {
        collection: membersCollection(true),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'OPEN', memberCount: 2 }),
        }),
      };
      mockCollection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRoomRef),
      });

      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'room-1', targetStatus: 'LOCKED' },
          auth: { uid: 'user-1' },
          app: { appId: 'test-app' },
        } as any)
      ).rejects.toThrow(/Invalid room transition/);
    });

    it('throws failed-precondition if transitioning to PROPOSING with memberCount < 2', async () => {
      const mockRoomRef = {
        collection: membersCollection(true),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'OPEN', memberCount: 1 }),
        }),
      };
      mockCollection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRoomRef),
      });

      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
          auth: { uid: 'user-1' },
          app: { appId: 'test-app' },
        } as any)
      ).rejects.toThrow('At least two members are required to open proposing.');
    });

    it('throws permission-denied when client attempts transition to FIRED', async () => {
      const mockRoomRef = {
        collection: membersCollection(true),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'LOCKED', memberCount: 2 }),
        }),
      };
      mockCollection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRoomRef),
      });

      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'room-1', targetStatus: 'FIRED' },
          auth: { uid: 'user-1' },
          app: { appId: 'test-app' },
        } as any)
      ).rejects.toThrow('Room firing is reserved for the scheduled alarm pipeline.');
    });

    it('throws permission-denied when the caller is not a room member', async () => {
      const mockRoomRef = {
        collection: membersCollection(false),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'LOCKED', memberCount: 2 }),
        }),
      };
      mockCollection.mockReturnValue({ doc: jest.fn().mockReturnValue(mockRoomRef) });

      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'room-1', targetStatus: 'OPEN' },
          auth: { uid: 'outsider' },
          app: { appId: 'test-app' },
        } as any)
      ).rejects.toThrow('Only room members can change the room status.');
      expect(mockRunTransaction).not.toHaveBeenCalled();
    });

    it('treats PROPOSING -> PROPOSING as an idempotent retry', async () => {
      const mockRoomRef = {
        collection: membersCollection(true),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'PROPOSING', memberCount: 2 }),
        }),
      };
      mockCollection.mockReturnValue({ doc: jest.fn().mockReturnValue(mockRoomRef) });

      const wrapped = testEnv.wrap(transitionRoomStatus);
      await expect(
        wrapped({
          data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
          auth: { uid: 'user-1' },
          app: { appId: 'test-app' },
        } as any)
      ).resolves.toEqual({ roomId: 'room-1', status: 'PROPOSING' });
      expect(mockRunTransaction).not.toHaveBeenCalled();
    });

    it('transitions successfully from OPEN to PROPOSING when valid', async () => {
      const mockRoomRef = {
        collection: membersCollection(true),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'OPEN', memberCount: 3 }),
        }),
      };
      mockCollection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRoomRef),
      });

      mockRunTransaction.mockImplementation(async (cb: any) => {
        const tx = { update: jest.fn() };
        return cb(tx);
      });

      const wrapped = testEnv.wrap(transitionRoomStatus);
      const result = await wrapped({
        data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
        auth: { uid: 'user-1' },
        app: { appId: 'test-app' },
      } as any);

      expect(result).toEqual({
        roomId: 'room-1',
        status: 'PROPOSING',
      });
      expect(mockRunTransaction).toHaveBeenCalled();
    });
  });

  describe('onProposalWrite Trigger & Consensus Tallying', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('ignores trigger when voteData is absent', async () => {
      const wrapped = testEnv.wrap(onProposalWrite);
      await wrapped({
        params: { roomId: 'room-1', proposalId: 'prop-1', voteId: 'vote-1' },
        data: undefined,
      } as any);
      expect(mockCollection).not.toHaveBeenCalled();
    });

    it('resolves proposal to rejected and resets room to OPEN on any reject vote', async () => {
      const mockProposalUpdate = jest.fn();
      const mockRoomUpdate = jest.fn();

      const mockRoomRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ memberCount: 3, status: 'VOTING' }),
        }),
        update: mockRoomUpdate,
        collection: jest.fn((sub) => {
          if (sub === 'members') {
            return {
              get: jest.fn().mockResolvedValue({ size: 3 }),
            };
          }
          if (sub === 'proposals') {
            return {
              doc: jest.fn().mockReturnValue({
                update: mockProposalUpdate,
                collection: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue({
                    docs: [
                      { data: () => ({ choice: 'accept' }) },
                      { data: () => ({ choice: 'reject' }) },
                    ],
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      mockCollection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRoomRef),
      });

      const snap = testEnv.firestore.makeDocumentSnapshot(
        { choice: 'reject', userId: 'user-2' },
        'rooms/room-1/proposals/prop-1/votes/vote-2'
      );

      const wrapped = testEnv.wrap(onProposalWrite);
      await wrapped({
        params: { roomId: 'room-1', proposalId: 'prop-1', voteId: 'vote-2' },
        data: snap,
      } as any);

      expect(mockProposalUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved_rejected',
        })
      );
      expect(mockRoomUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'OPEN',
        })
      );
    });

    it('resolves proposal to locked and locks room when all members accept (consensus reached)', async () => {
      const mockProposalUpdate = jest.fn();
      const mockRoomUpdate = jest.fn();

      const mockRoomRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ memberCount: 2, status: 'VOTING' }),
        }),
        update: mockRoomUpdate,
        collection: jest.fn((sub) => {
          if (sub === 'members') {
            return {
              get: jest.fn().mockResolvedValue({ size: 2 }),
            };
          }
          if (sub === 'proposals') {
            return {
              doc: jest.fn().mockReturnValue({
                update: mockProposalUpdate,
                collection: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue({
                    docs: [
                      { data: () => ({ choice: 'accept' }) },
                      { data: () => ({ choice: 'accept' }) },
                    ],
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      mockCollection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockRoomRef),
      });

      const snap = testEnv.firestore.makeDocumentSnapshot(
        { choice: 'accept', userId: 'user-2' },
        'rooms/room-1/proposals/prop-1/votes/vote-2'
      );

      const wrapped = testEnv.wrap(onProposalWrite);
      await wrapped({
        params: { roomId: 'room-1', proposalId: 'prop-1', voteId: 'vote-2' },
        data: snap,
      } as any);

      expect(mockProposalUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved_locked',
        })
      );
      expect(mockRoomUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'LOCKED',
        })
      );
    });
  });
});
