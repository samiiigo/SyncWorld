import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

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

      await roomRef.update({
        status: 'OPEN',
        lastStatusChangeAt: Timestamp.now(),
      });
    }),
  );
});
