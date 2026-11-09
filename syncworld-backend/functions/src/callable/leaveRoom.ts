import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { assertAppCheck } from '../lib/appCheck';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { leaveRoomInputSchema } from '../lib/validation';

/**
 * Removes the caller from a room. Membership docs are admin-only (Firestore
 * rules), so leaving must go through the backend like joining does.
 * - drops the member doc and the caller's push token (no alarm for them)
 * - hands the host role to the longest-standing remaining member
 * - empty rooms stay at memberCount 0 for cleanupOrphanedRooms
 */
export const leaveRoom = onCall(async (request): Promise<{ roomId: string; left: boolean }> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to leave a room.');
  }
  assertAppCheck(request);

  const parsed = leaveRoomInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'A roomId is required.');
  }
  const { roomId } = parsed.data;
  const uid = request.auth.uid;

  const roomRef = firebaseAdminFirestore.collection('rooms').doc(roomId);
  const memberRef = roomRef.collection('members').doc(uid);
  const tokenRef = roomRef.collection('push_tokens').doc(uid);

  const left = await firebaseAdminFirestore.runTransaction(async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    const memberSnapshot = await transaction.get(memberRef);
    if (!roomSnapshot.exists || !memberSnapshot.exists) {
      return false;
    }

    const roomData = roomSnapshot.data() as { hostId?: string };
    const updates: Record<string, unknown> = {
      memberCount: FieldValue.increment(-1),
      lastActivityAt: Timestamp.now(),
    };

    if (roomData.hostId === uid) {
      const others = await transaction.get(roomRef.collection('members').orderBy('joinedAt', 'asc').limit(2));
      const nextHost = others.docs.find((doc) => doc.id !== uid);
      updates.hostId = nextHost?.id ?? null;
      if (nextHost) {
        transaction.update(nextHost.ref, { role: 'host' });
      }
    }

    transaction.delete(memberRef);
    transaction.delete(tokenRef);
    transaction.update(roomRef, updates);
    return true;
  });

  return { roomId, left };
});
