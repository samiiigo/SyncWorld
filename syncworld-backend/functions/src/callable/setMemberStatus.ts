import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { assertAppCheck } from '../lib/appCheck';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { assertWithinRateLimit } from '../lib/rateLimit';
import { setMemberStatusInputSchema } from '../lib/validation';

/**
 * Per-member status the other phones show:
 * - alarmBlocked: this device refused alarm/notification permission (Armed screen note)
 * - wokeUp: "I'm up" on the ringing screen (who's-up strip)
 * Members can't write these fields directly; this callable is the only path.
 */
export const setMemberStatus = onCall(async (request): Promise<{ ok: true }> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  assertAppCheck(request);

  const parsed = setMemberStatusInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid member status.');
  }
  const input = parsed.data;
  const uid = request.auth.uid;
  await assertWithinRateLimit(uid, 'setMemberStatus', 20);

  const memberRef = firebaseAdminFirestore.collection('rooms').doc(input.roomId).collection('members').doc(uid);
  const memberSnapshot = await memberRef.get();
  if (!memberSnapshot.exists) {
    throw new HttpsError('permission-denied', 'You must be a room member.');
  }

  await memberRef.update({
    ...(input.alarmBlocked !== undefined ? { alarmBlocked: input.alarmBlocked } : {}),
    ...(input.wokeUp ? { wokeAt: Timestamp.now() } : {}),
  });
  return { ok: true };
});
