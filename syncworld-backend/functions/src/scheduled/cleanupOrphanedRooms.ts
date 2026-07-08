import { Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupOrphanedRooms = onSchedule('every 24 hours', async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - ROOM_TTL_MS);
  const staleRoomsSnapshot = await firebaseAdminFirestore
    .collection('rooms')
    .where('memberCount', '==', 0)
    .get();

  const oldRoomsSnapshot = await firebaseAdminFirestore
    .collection('rooms')
    .where('lastActivityAt', '<=', cutoff)
    .get();

  const roomDocs = [...staleRoomsSnapshot.docs, ...oldRoomsSnapshot.docs];
  const uniqueRoomDocs = new Map(roomDocs.map((doc) => [doc.id, doc]));

  await Promise.all(
    Array.from(uniqueRoomDocs.values()).map(async (roomDoc) => {
      await firebaseAdminFirestore.recursiveDelete(roomDoc.ref);

      const code = roomDoc.data().code as string | undefined;
      if (code) {
        await firebaseAdminFirestore.collection('room_codes').doc(code).delete();
      }
    }),
  );
});
