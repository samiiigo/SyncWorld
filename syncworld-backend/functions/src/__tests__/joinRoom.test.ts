import functionsTestInit from 'firebase-functions-test';
import { HttpsError } from 'firebase-functions/v2/https';

const testEnv = functionsTestInit();

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

import { joinRoom } from '../callable/joinRoom';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

describe('joinRoom callable function', () => {
  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error if unauthenticated', async () => {
    const wrapped = testEnv.wrap(joinRoom);
    await expect(wrapped({ data: {}, auth: undefined } as any)).rejects.toThrow(HttpsError);
  });

  it('throws an error if app check token is missing', async () => {
    const wrapped = testEnv.wrap(joinRoom);
    await expect(wrapped({ data: {}, auth: { uid: 'user2' }, app: undefined } as any)).rejects.toThrow(HttpsError);
  });

  it('throws not-found if room code does not exist', async () => {
    const wrapped = testEnv.wrap(joinRoom);
    await expect(wrapped({
      data: { roomCode: 'ABCDEF', timezone: 'UTC', displayName: 'Test User' },
      auth: { uid: 'user2' },
      app: { appId: 'my-app' }
    } as any)).rejects.toThrow('Room code not found.');
  });
});
