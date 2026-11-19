import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

/** After a vote expires the room reopens only if it is still voting on nothing else. */
export function roomAfterExpiry(roomStatus: string | undefined, otherActiveProposals: number): 'OPEN' | null {
  return roomStatus === 'VOTING' && otherActiveProposals === 0 ? 'OPEN' : null;
}

export const expireProposals = onSchedule('every 1 minutes', async () => {
  const now = Timestamp.now();
  const activeProposalsSnapshot = await firebaseAdminFirestore
    .collectionGroup('proposals')
    .where('status', '==', 'active')
    .where('expiresAt', '<=', now)
    .get();

  await Promise.all(
    activeProposalsSnapshot.docs.map(async (proposalDoc) => {
      const proposalRef = proposalDoc.ref;
      const roomRef = proposalRef.parent.parent;

      if (!roomRef) {
        return;
      }

      await proposalRef.update({
        status: 'expired',
        resolvedAt: Timestamp.now(),
      });

      const [roomSnapshot, stillActive] = await Promise.all([
        roomRef.get(),
        roomRef.collection('proposals').where('status', '==', 'active').get(),
      ]);
      const others = stillActive.docs.filter((d) => d.id !== proposalRef.id).length;
      const next = roomAfterExpiry((roomSnapshot.data() as { status?: string } | undefined)?.status, others);
      if (!next) return;

      await roomRef.update({
        status: next,
        lastStatusChangeAt: Timestamp.now(),
      });
    }),
  );
});
