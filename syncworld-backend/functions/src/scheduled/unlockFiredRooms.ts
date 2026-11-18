import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

const UNLOCK_AFTER_MS = 60 * 60_000;

/** A fired room opens again one hour after its alarm time. */
export function firedRoomExpired(targetTimeUtc: number, now: number): boolean {
  return targetTimeUtc <= now - UNLOCK_AFTER_MS;
}

/**
 * FIRED → OPEN one hour after the alarm, so the room can agree on a new
 * time (fixes "An alarm is already armed" after it rang). Clears each
 * member's armed and woke-up state for the next round.
 */
export const unlockFiredRooms = onSchedule('every 5 minutes', async () => {
  const now = Date.now();
  const firedRooms = await firebaseAdminFirestore.collection('rooms').where('status', '==', 'FIRED').get();

  await Promise.all(
    firedRooms.docs.map(async (roomDoc) => {
      const fired = await roomDoc.ref.collection('proposals').where('status', '==', 'fired').get();
      const latest = Math.max(0, ...fired.docs.map((d) => (d.data() as { targetTimeUtc?: number }).targetTimeUtc ?? 0));
      if (!firedRoomExpired(latest, now)) return;

      const members = await roomDoc.ref.collection('members').get();
      const batch = firebaseAdminFirestore.batch();
      batch.update(roomDoc.ref, { status: 'OPEN', lastStatusChangeAt: Timestamp.now() });
      members.docs.forEach((m) => batch.update(m.ref, { alarmArmed: false, wokeAt: null }));
      await batch.commit();
    }),
  );
});
