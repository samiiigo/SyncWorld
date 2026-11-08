"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_test_1 = __importDefault(require("firebase-functions-test"));
const https_1 = require("firebase-functions/v2/https");
const roomFsm_1 = require("../lib/roomFsm");
const validation_1 = require("../lib/validation");
const testEnv = (0, firebase_functions_test_1.default)();
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
            collection: (...args) => mockCollection(...args),
            doc: (...args) => mockDoc(...args),
            runTransaction: (cb) => mockRunTransaction(cb),
        },
    };
});
jest.mock('../lib/rateLimit', () => ({
    assertWithinRateLimit: jest.fn().mockResolvedValue(true),
}));
const transitionRoomStatus_1 = require("../callable/transitionRoomStatus");
const onProposalWrite_1 = require("../triggers/onProposalWrite");
describe('Room FSM Logic', () => {
    afterAll(() => {
        testEnv.cleanup();
    });
    describe('Transition Matrix & Helper (isValidTransition)', () => {
        it('defines expected transitions in ROOM_TRANSITIONS', () => {
            expect(roomFsm_1.ROOM_TRANSITIONS.length).toBeGreaterThanOrEqual(6);
        });
        it('permits valid state transitions', () => {
            expect((0, roomFsm_1.isValidTransition)('OPEN', 'PROPOSING')).toBe(true);
            expect((0, roomFsm_1.isValidTransition)('PROPOSING', 'VOTING')).toBe(true);
            expect((0, roomFsm_1.isValidTransition)('VOTING', 'LOCKED')).toBe(true);
            expect((0, roomFsm_1.isValidTransition)('VOTING', 'OPEN')).toBe(true);
            expect((0, roomFsm_1.isValidTransition)('LOCKED', 'FIRED')).toBe(true);
            expect((0, roomFsm_1.isValidTransition)('LOCKED', 'OPEN')).toBe(true);
        });
        it('rejects invalid state transitions', () => {
            expect((0, roomFsm_1.isValidTransition)('OPEN', 'LOCKED')).toBe(false);
            expect((0, roomFsm_1.isValidTransition)('OPEN', 'FIRED')).toBe(false);
            expect((0, roomFsm_1.isValidTransition)('PROPOSING', 'LOCKED')).toBe(false);
            expect((0, roomFsm_1.isValidTransition)('PROPOSING', 'FIRED')).toBe(false);
            expect((0, roomFsm_1.isValidTransition)('LOCKED', 'PROPOSING')).toBe(false);
            expect((0, roomFsm_1.isValidTransition)('FIRED', 'OPEN')).toBe(false);
            expect((0, roomFsm_1.isValidTransition)('FIRED', 'VOTING')).toBe(false);
        });
    });
    describe('Validation Schemas', () => {
        it('rejects invalid status transitions in input schema', () => {
            const result = validation_1.transitionRoomStatusInputSchema.safeParse({ roomId: '123', targetStatus: 'INVALID_STATUS' });
            expect(result.success).toBe(false);
        });
        it('accepts valid status transitions in input schema', () => {
            const result = validation_1.transitionRoomStatusInputSchema.safeParse({ roomId: '123', targetStatus: 'LOCKED' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.roomId).toBe('123');
                expect(result.data.targetStatus).toBe('LOCKED');
            }
        });
        it('rejects input with missing roomId', () => {
            const result = validation_1.transitionRoomStatusInputSchema.safeParse({ targetStatus: 'LOCKED' });
            expect(result.success).toBe(false);
        });
    });
    describe('transitionRoomStatus Callable Function', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it('throws unauthenticated error when auth context is missing', async () => {
            const wrapped = testEnv.wrap(transitionRoomStatus_1.transitionRoomStatus);
            await expect(wrapped({
                data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
                auth: undefined,
                app: { appId: 'test-app' },
            })).rejects.toThrow(https_1.HttpsError);
        });
        it('throws failed-precondition error when app check is missing', async () => {
            const wrapped = testEnv.wrap(transitionRoomStatus_1.transitionRoomStatus);
            await expect(wrapped({
                data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
                auth: { uid: 'user-1' },
                app: undefined,
            })).rejects.toThrow(https_1.HttpsError);
        });
        it('throws not-found when room doc does not exist', async () => {
            const mockRoomRef = {
                get: jest.fn().mockResolvedValue({ exists: false }),
            };
            mockCollection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockRoomRef),
            });
            const wrapped = testEnv.wrap(transitionRoomStatus_1.transitionRoomStatus);
            await expect(wrapped({
                data: { roomId: 'nonexistent-room', targetStatus: 'PROPOSING' },
                auth: { uid: 'user-1' },
                app: { appId: 'test-app' },
            })).rejects.toThrow('Room not found.');
        });
        it('throws failed-precondition on invalid status transition', async () => {
            const mockRoomRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ status: 'OPEN', memberCount: 2 }),
                }),
            };
            mockCollection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockRoomRef),
            });
            const wrapped = testEnv.wrap(transitionRoomStatus_1.transitionRoomStatus);
            await expect(wrapped({
                data: { roomId: 'room-1', targetStatus: 'LOCKED' },
                auth: { uid: 'user-1' },
                app: { appId: 'test-app' },
            })).rejects.toThrow(/Invalid room transition/);
        });
        it('throws failed-precondition if transitioning to PROPOSING with memberCount < 2', async () => {
            const mockRoomRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ status: 'OPEN', memberCount: 1 }),
                }),
            };
            mockCollection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockRoomRef),
            });
            const wrapped = testEnv.wrap(transitionRoomStatus_1.transitionRoomStatus);
            await expect(wrapped({
                data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
                auth: { uid: 'user-1' },
                app: { appId: 'test-app' },
            })).rejects.toThrow('At least two members are required to open proposing.');
        });
        it('throws permission-denied when client attempts transition to FIRED', async () => {
            const mockRoomRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ status: 'LOCKED', memberCount: 2 }),
                }),
            };
            mockCollection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockRoomRef),
            });
            const wrapped = testEnv.wrap(transitionRoomStatus_1.transitionRoomStatus);
            await expect(wrapped({
                data: { roomId: 'room-1', targetStatus: 'FIRED' },
                auth: { uid: 'user-1' },
                app: { appId: 'test-app' },
            })).rejects.toThrow('Room firing is reserved for the scheduled alarm pipeline.');
        });
        it('transitions successfully from OPEN to PROPOSING when valid', async () => {
            const mockRoomRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ status: 'OPEN', memberCount: 3 }),
                }),
            };
            mockCollection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockRoomRef),
            });
            mockRunTransaction.mockImplementation(async (cb) => {
                const tx = { update: jest.fn() };
                return cb(tx);
            });
            const wrapped = testEnv.wrap(transitionRoomStatus_1.transitionRoomStatus);
            const result = await wrapped({
                data: { roomId: 'room-1', targetStatus: 'PROPOSING' },
                auth: { uid: 'user-1' },
                app: { appId: 'test-app' },
            });
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
            const wrapped = testEnv.wrap(onProposalWrite_1.onProposalWrite);
            await wrapped({
                params: { roomId: 'room-1', proposalId: 'prop-1', voteId: 'vote-1' },
                data: undefined,
            });
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
            const snap = testEnv.firestore.makeDocumentSnapshot({ choice: 'reject', userId: 'user-2' }, 'rooms/room-1/proposals/prop-1/votes/vote-2');
            const wrapped = testEnv.wrap(onProposalWrite_1.onProposalWrite);
            await wrapped({
                params: { roomId: 'room-1', proposalId: 'prop-1', voteId: 'vote-2' },
                data: snap,
            });
            expect(mockProposalUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'resolved_rejected',
            }));
            expect(mockRoomUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'OPEN',
            }));
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
            const snap = testEnv.firestore.makeDocumentSnapshot({ choice: 'accept', userId: 'user-2' }, 'rooms/room-1/proposals/prop-1/votes/vote-2');
            const wrapped = testEnv.wrap(onProposalWrite_1.onProposalWrite);
            await wrapped({
                params: { roomId: 'room-1', proposalId: 'prop-1', voteId: 'vote-2' },
                data: snap,
            });
            expect(mockProposalUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'resolved_locked',
            }));
            expect(mockRoomUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'LOCKED',
            }));
        });
    });
});
