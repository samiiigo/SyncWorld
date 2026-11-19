import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { assertAppCheck } from '../lib/appCheck';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { disarmAlarmInputSchema, registerPushTokenInputSchema } from '../lib/validation';

async function requireMember(request: CallableRequest, roomId: string) {
  const uid = request.auth!.uid;
  const roomRef = firebaseAdminFirestore.collection('rooms').doc(roomId);
  const memberRef = roomRef.collection('members').doc(uid);
  const memberSnapshot = await memberRef.get();
  if (!memberSnapshot.exists) {
    throw new HttpsError('permission-denied', 'You must be a room member.');
  }
  return { uid, roomRef, memberRef };
}

/**
 * Arms this device for the room's alarm. push_tokens is unreadable and
 * unwritable from clients (Firestore rules), so tokens are stored here with
 * the Admin SDK. Also marks the member as armed so every client can show the
 * "members arming" grid.
 */
export const registerPushToken = onCall(async (request): Promise<{ armed: true }> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  assertAppCheck(request);

  const parsed = registerPushTokenInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid push token payload.');
  }
  const input = parsed.data;
  const { uid, roomRef, memberRef } = await requireMember(request, input.roomId);

  const batch = firebaseAdminFirestore.batch();
  if (input.kind !== 'local') {
    batch.set(roomRef.collection('push_tokens').doc(uid), {
      userId: uid,
      expoPushToken: input.kind === 'expo' ? input.token : null,
      fcmToken: input.kind === 'fcm' ? input.token : null,
      platform: input.platform,
      updatedAt: Timestamp.now(),
    });
  }
  batch.update(memberRef, { alarmArmed: true, alarmArmedAt: Timestamp.now() });
  await batch.commit();

  return { armed: true };
});

/**
 * Disarms the alarm for this member only (spec: each device owns its alarm).
 * Other members keep theirs and see "[Name] has disarmed".
 */
export const disarmAlarm = onCall(async (request): Promise<{ armed: false }> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  assertAppCheck(request);

  const parsed = disarmAlarmInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'A roomId is required.');
  }
  const { uid, roomRef, memberRef } = await requireMember(request, parsed.data.roomId);

  const batch = firebaseAdminFirestore.batch();
  batch.delete(roomRef.collection('push_tokens').doc(uid));
  batch.update(memberRef, { alarmArmed: false, alarmDisarmedAt: Timestamp.now() });
  await batch.commit();

  return { armed: false };
});
