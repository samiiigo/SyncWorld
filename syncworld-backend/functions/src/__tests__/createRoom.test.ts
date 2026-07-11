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

import { createRoom } from '../callable/createRoom';

describe('createRoom callable function', () => {
  afterAll(() => {
    testEnv.cleanup();
  });

  it('throws an error if unauthenticated', async () => {
    const wrapped = testEnv.wrap(createRoom);
    await expect(wrapped({ data: {}, auth: undefined } as any)).rejects.toThrow(HttpsError);
  });

  it('throws an error if app check token is missing', async () => {
    const wrapped = testEnv.wrap(createRoom);
    await expect(wrapped({ data: {}, auth: { uid: 'user1' }, app: undefined } as any)).rejects.toThrow(HttpsError);
  });

  it('creates a room successfully when authenticated and app check is present', async () => {
    const wrapped = testEnv.wrap(createRoom);
    const result = await wrapped({
      data: { roomName: 'Test Room', timezone: 'UTC' },
      auth: { uid: 'user1' },
      app: { appId: 'my-app' }
    } as any);

    expect(result).toHaveProperty('roomId');
    expect(result).toHaveProperty('code');
  });
});
