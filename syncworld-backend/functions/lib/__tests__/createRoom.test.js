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
                    get: jest.fn()
                };
            }),
            runTransaction: jest.fn(async (cb) => {
                const transaction = {
                    get: jest.fn().mockResolvedValue({ exists: false }),
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
const createRoom_1 = require("../callable/createRoom");
describe('createRoom callable function', () => {
    afterAll(() => {
        testEnv.cleanup();
    });
    it('throws an error if unauthenticated', async () => {
        const wrapped = testEnv.wrap(createRoom_1.createRoom);
        await expect(wrapped({ data: {}, auth: undefined })).rejects.toThrow(https_1.HttpsError);
    });
    it('throws an error if app check token is missing', async () => {
        const wrapped = testEnv.wrap(createRoom_1.createRoom);
        await expect(wrapped({ data: {}, auth: { uid: 'user1' }, app: undefined })).rejects.toThrow(https_1.HttpsError);
    });
    it('creates a room successfully when authenticated and app check is present', async () => {
        const wrapped = testEnv.wrap(createRoom_1.createRoom);
        const result = await wrapped({
            data: { roomName: 'Test Room', timezone: 'UTC' },
            auth: { uid: 'user1' },
            app: { appId: 'my-app' }
        });
        expect(result).toHaveProperty('roomId');
        expect(result).toHaveProperty('code');
    });
});
