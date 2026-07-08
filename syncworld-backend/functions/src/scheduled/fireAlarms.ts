import { Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firebaseAdminFirestore, firebaseAdminMessaging } from '../lib/firebaseAdmin';

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
      const tokens = tokensSnapshot.docs
        .map((doc) => doc.data() as { expoPushToken?: string })
        .map((token) => token.expoPushToken)
        .filter((token): token is string => Boolean(token));

      if (tokens.length > 0) {
        const response = await firebaseAdminMessaging.sendEachForMulticast({
          tokens,
          notification: {
            title: '⏰ SyncWorld Alarm!',
            body: roomData.roomId ? `Time for room ${roomData.roomId}` : 'Time to wake up',
          },
          data: {
            roomId: roomData.roomId ?? roomDoc.id,
            alarmTimeUTC: String(targetTimeUtc),
          },
        });

        await Promise.all(
          response.responses.map(async (sendResult, index) => {
            if (!sendResult.success) {
              const failedTokenDoc = tokensSnapshot.docs[index];
              await failedTokenDoc.ref.delete();
            }
          }),
        );
      }

      await proposalDoc.ref.update({
        status: 'resolved_locked',
        firedAt: Timestamp.now(),
      });

      await roomRef.update({
        status: 'FIRED',
        lastStatusChangeAt: Timestamp.now(),
      });
    }),
  );
});
