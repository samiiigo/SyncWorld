import type { Messaging } from 'firebase-admin/messaging';

export type StoredPushToken = {
  docId: string;
  expoPushToken?: string | null;
  fcmToken?: string | null;
};

export type AlarmMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
};

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

/**
 * Delivers an alarm push to every armed device and returns the token doc ids
 * that are permanently invalid and should be pruned.
 *
 * - Expo push tokens (iOS/Android apps) go through Expo's push service, which
 *   forwards to APNs/FCM. FCM's own API rejects Expo tokens, which is why the
 *   previous sendEachForMulticast-only path could never reach a phone.
 * - FCM registration tokens (web build on Windows/Mac) go through FCM.
 */
export async function deliverAlarm(
  tokens: StoredPushToken[],
  message: AlarmMessage,
  messaging: Pick<Messaging, 'sendEachForMulticast'>,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const invalid: string[] = [];

  const expo = tokens.filter((t) => t.expoPushToken);
  for (let i = 0; i < expo.length; i += EXPO_BATCH_SIZE) {
    const chunk = expo.slice(i, i + EXPO_BATCH_SIZE);
    try {
      const response = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          chunk.map((t) => ({
            to: t.expoPushToken,
            title: message.title,
            body: message.body,
            data: message.data,
            sound: 'default',
            priority: 'high',
            channelId: 'alarms',
            interruptionLevel: 'time-sensitive',
          })),
        ),
      });
      const json = (await response.json()) as { data?: ExpoTicket[] };
      json.data?.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          invalid.push(chunk[index].docId);
        }
      });
    } catch (err) {
      // Network failure: keep the tokens. Native devices also have a local alarm scheduled.
      console.error('Expo push delivery failed', err);
    }
  }

  const fcm = tokens.filter((t) => t.fcmToken);
  if (fcm.length > 0) {
    const response = await messaging.sendEachForMulticast({
      tokens: fcm.map((t) => t.fcmToken as string),
      notification: { title: message.title, body: message.body },
      data: message.data,
      webpush: { headers: { Urgency: 'high' }, notification: { requireInteraction: true } },
    });
    response.responses.forEach((result, index) => {
      const code = result.error?.code;
      if (
        !result.success &&
        (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')
      ) {
        invalid.push(fcm[index].docId);
      }
    });
  }

  return invalid;
}
