"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_test_1 = __importDefault(require("firebase-functions-test"));
const https_1 = require("firebase-functions/v2/https");
const testEnv = (0, firebase_functions_test_1.default)();
jest.mock('../lib/firebaseAdmin', () => {
    return {
        firebaseAdminFirestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockImplementation(() => {
                return {
                    id: 'mocked-doc-id',
                    collection: jest.fn().mockReturnThis(),
                    doc: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ exists: false })
                };
            }),
            runTransaction: jest.fn(async (cb) => {
                const transaction = {
                    get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ memberCount: 1 }) }),
                    set: jest.fn(),
                    update: jest.fn(),
                };
                return cb(transaction);
            }),
        },
    };
});
jest.mock('../lib/rateLimit', () => {
    return {
        assertWithinRateLimit: jest.fn().mockResolvedValue(true),
    };
});
const joinRoom_1 = require("../callable/joinRoom");
describe('joinRoom callable function', () => {
    afterAll(() => {
        testEnv.cleanup();
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('throws an error if unauthenticated', async () => {
        const wrapped = testEnv.wrap(joinRoom_1.joinRoom);
        await expect(wrapped({ data: {}, auth: undefined })).rejects.toThrow(https_1.HttpsError);
    });
    it('throws an error if app check token is missing', async () => {
        const wrapped = testEnv.wrap(joinRoom_1.joinRoom);
        await expect(wrapped({ data: {}, auth: { uid: 'user2' }, app: undefined })).rejects.toThrow(https_1.HttpsError);
    });
    it('throws not-found if room code does not exist', async () => {
        const wrapped = testEnv.wrap(joinRoom_1.joinRoom);
        await expect(wrapped({
            data: { roomCode: 'ABCDEF', timezone: 'UTC', displayName: 'Test User' },
            auth: { uid: 'user2' },
            app: { appId: 'my-app' }
        })).rejects.toThrow('Room code not found.');
    });
});
