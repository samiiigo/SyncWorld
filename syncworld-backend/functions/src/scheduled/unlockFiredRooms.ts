import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

const UNLOCK_AFTER_MS = 60 * 60_000;

/** A fired room opens again one hour after its alarm time. */
export function firedRoomExpired(targetTimeUtc: number, now: number): boolean {
  return targetTimeUtc <= now - UNLOCK_AFTER_MS;
}

/** Unlock only when the room has a fired proposal and the latest one is an hour old. */
export function unlockDue(firedTargets: number[], now: number): boolean {
  return firedTargets.length > 0 && firedRoomExpired(Math.max(...firedTargets), now);
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
      const targets = fired.docs
        .map((d) => (d.data() as { targetTimeUtc?: number }).targetTimeUtc)
        .filter((t): t is number => typeof t === 'number');
      if (!unlockDue(targets, now)) return;

      const [members, tokens] = await Promise.all([
        roomDoc.ref.collection('members').get(),
        roomDoc.ref.collection('push_tokens').get(),
      ]);
      const batch = firebaseAdminFirestore.batch();
      batch.update(roomDoc.ref, { status: 'OPEN', lastStatusChangeAt: Timestamp.now() });
      members.docs.forEach((m) => batch.update(m.ref, { alarmArmed: false, wokeAt: null }));
      // Each phone registers again when the next time is agreed.
      tokens.docs.forEach((t) => batch.delete(t.ref));
      await batch.commit();
    }),
  );
});
