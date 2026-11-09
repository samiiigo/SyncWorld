import { Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firebaseAdminFirestore, firebaseAdminMessaging } from '../lib/firebaseAdmin';
import { deliverAlarm } from '../lib/pushDelivery';

export const fireAlarms = onSchedule('every 1 minutes', async () => {
  const now = Date.now();
  const lockedRoomsSnapshot = await firebaseAdminFirestore
    .collection('rooms')
    .where('status', '==', 'LOCKED')
    .get();

  await Promise.all(
    lockedRoomsSnapshot.docs.map(async (roomDoc) => {
      const roomRef = roomDoc.ref;
      const roomData = roomDoc.data() as { roomId?: string };
      const proposalSnapshot = await roomRef
        .collection('proposals')
        .where('status', '==', 'resolved_locked')
        .limit(1)
        .get();

      if (proposalSnapshot.empty) {
        return;
      }

      const proposalDoc = proposalSnapshot.docs[0];
      const proposalData = proposalDoc.data() as { targetTimeUtc?: number };
      const targetTimeUtc = proposalData.targetTimeUtc ?? 0;

      if (targetTimeUtc > now) {
        return;
      }

      const tokensSnapshot = await roomRef.collection('push_tokens').get();
      const tokens = tokensSnapshot.docs.map((doc) => {
        const data = doc.data() as { expoPushToken?: string | null; fcmToken?: string | null };
        return { docId: doc.id, expoPushToken: data.expoPushToken, fcmToken: data.fcmToken };
      });

      if (tokens.length > 0) {
        const roomName = (roomData as { roomName?: string }).roomName;
        const invalid = await deliverAlarm(
          tokens,
          {
            title: '⏰ SyncWorld alarm',
            body: roomName ? `It's time: ${roomName}` : "It's time — your room's agreed time is now.",
            data: {
              roomId: roomData.roomId ?? roomDoc.id,
              alarmTimeUTC: String(targetTimeUtc),
            },
          },
          firebaseAdminMessaging,
        );
        await Promise.all(invalid.map((docId) => roomRef.collection('push_tokens').doc(docId).delete()));
      }

      await proposalDoc.ref.update({
        status: 'fired',
        firedAt: Timestamp.now(),
      });

      await roomRef.update({
        status: 'FIRED',
        lastStatusChangeAt: Timestamp.now(),
      });
    }),
  );
});
