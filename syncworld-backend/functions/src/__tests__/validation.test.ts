import { HttpsError } from 'firebase-functions/v2/https';
import { joinRoomInputSchema, parseCallableInput, registerPushTokenInputSchema } from '../lib/validation';

describe('registerPushTokenInputSchema', () => {
  it('requires a token for expo/fcm registrations', () => {
    expect(registerPushTokenInputSchema.safeParse({ roomId: 'r', kind: 'fcm', platform: 'web' }).success).toBe(false);
    expect(
      registerPushTokenInputSchema.safeParse({ roomId: 'r', kind: 'expo', token: 'ExponentPushToken[x]', platform: 'ios' })
        .success,
    ).toBe(true);
  });

  it('accepts a token-less local registration (device rings on its own)', () => {
    expect(registerPushTokenInputSchema.safeParse({ roomId: 'r', kind: 'local', platform: 'web' }).success).toBe(true);
  });
});

describe('parseCallableInput', () => {
  it('returns parsed data for valid input', () => {
    const input = parseCallableInput(joinRoomInputSchema, {
      roomCode: 'ABC123',
      timezone: 'Asia/Dubai',
      displayName: 'Hana',
    });
    expect(input.roomCode).toBe('ABC123');
  });

  it('throws invalid-argument (not INTERNAL) naming the bad fields', () => {
    let thrown: unknown;
    try {
      parseCallableInput(joinRoomInputSchema, { code: 'ABC123', timezone: 'UTC', displayName: 'x' });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(HttpsError);
    expect((thrown as HttpsError).code).toBe('invalid-argument');
    expect((thrown as HttpsError).message).toContain('roomCode');
  });

  it('treats missing data as an empty object', () => {
    expect(() => parseCallableInput(joinRoomInputSchema, undefined)).toThrow(HttpsError);
  });
});
