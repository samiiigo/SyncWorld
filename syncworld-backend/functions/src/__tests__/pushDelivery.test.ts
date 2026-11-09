import { HttpsError } from 'firebase-functions/v2/https';
import { assertAppCheck } from '../lib/appCheck';
import { deliverAlarm, EXPO_PUSH_URL } from '../lib/pushDelivery';

const message = { title: 'Alarm', body: 'Now', data: { roomId: 'r1', alarmTimeUTC: '1' } };

function fakeFetch(tickets: Array<{ status: string; details?: { error?: string } }>) {
  return jest.fn().mockResolvedValue({ json: async () => ({ data: tickets }) }) as unknown as typeof fetch;
}

describe('deliverAlarm', () => {
  it('sends Expo tokens to the Expo push service and FCM tokens to FCM', async () => {
    const fetchImpl = fakeFetch([{ status: 'ok' }]);
    const messaging = {
      sendEachForMulticast: jest.fn().mockResolvedValue({ responses: [{ success: true }] }),
    };

    const invalid = await deliverAlarm(
      [
        { docId: 'phone', expoPushToken: 'ExponentPushToken[abc]' },
        { docId: 'browser', fcmToken: 'fcm-web-token' },
      ],
      message,
      messaging as any,
      fetchImpl,
    );

    expect(invalid).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledWith(EXPO_PUSH_URL, expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual([expect.objectContaining({ to: 'ExponentPushToken[abc]', title: 'Alarm' })]);
    expect(messaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ['fcm-web-token'] }),
    );
  });

  it('never sends Expo tokens through FCM', async () => {
    const messaging = { sendEachForMulticast: jest.fn() };
    await deliverAlarm([{ docId: 'p', expoPushToken: 'ExponentPushToken[x]' }], message, messaging as any, fakeFetch([{ status: 'ok' }]));
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('reports permanently invalid tokens from both channels', async () => {
    const fetchImpl = fakeFetch([{ status: 'error', details: { error: 'DeviceNotRegistered' } }]);
    const messaging = {
      sendEachForMulticast: jest.fn().mockResolvedValue({
        responses: [
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
          { success: false, error: { code: 'messaging/internal-error' } },
        ],
      }),
    };

    const invalid = await deliverAlarm(
      [
        { docId: 'old-phone', expoPushToken: 'ExponentPushToken[old]' },
        { docId: 'old-browser', fcmToken: 'stale' },
        { docId: 'flaky-browser', fcmToken: 'transient' },
      ],
      message,
      messaging as any,
      fetchImpl,
    );

    expect(invalid.sort()).toEqual(['old-browser', 'old-phone']);
  });

  it('keeps Expo tokens when the push service is unreachable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const invalid = await deliverAlarm([{ docId: 'p', expoPushToken: 'ExponentPushToken[x]' }], message, { sendEachForMulticast: jest.fn() } as any, fetchImpl);
    expect(invalid).toEqual([]);
  });
});

describe('assertAppCheck', () => {
  const original = process.env.FUNCTIONS_EMULATOR;
  afterEach(() => {
    process.env.FUNCTIONS_EMULATOR = original;
  });

  it('requires App Check outside the emulator', () => {
    delete process.env.FUNCTIONS_EMULATOR;
    expect(() => assertAppCheck({ app: undefined } as any)).toThrow(HttpsError);
    expect(() => assertAppCheck({ app: { appId: 'a' } } as any)).not.toThrow();
  });

  it('allows calls without App Check in the Functions emulator only', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    expect(() => assertAppCheck({ app: undefined } as any)).not.toThrow();
  });
});
