import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import type { RoomStatus } from '../lib/roomFsm';

export const onProposalWrite = onDocumentCreated(
  'rooms/{roomId}/proposals/{proposalId}/votes/{voteId}',
  async (event) => {
    const roomId = event.params.roomId as string;
    const proposalId = event.params.proposalId as string;
    const voteData = event.data?.data();

    if (!voteData) {
      return;
    }

    const roomRef = firebaseAdminFirestore.collection('rooms').doc(roomId);
    const proposalRef = roomRef.collection('proposals').doc(proposalId);
    const roomSnapshot = await roomRef.get();

    if (!roomSnapshot.exists) {
      return;
    }

    const roomData = roomSnapshot.data() as { memberCount?: number; status?: RoomStatus };
    const membersSnapshot = await roomRef.collection('members').get();
    const votesSnapshot = await proposalRef.collection('votes').get();
    const voteDocs = votesSnapshot.docs.map((doc) => doc.data() as { choice?: string });
    const memberCount = membersSnapshot.size;
    const acceptedVotes = voteDocs.filter((vote) => vote.choice === 'accept').length;
    const rejectedVotes = voteDocs.filter((vote) => vote.choice === 'reject').length;

    if (rejectedVotes > 0) {
      await proposalRef.update({
        status: 'resolved_rejected',
        resolvedAt: Timestamp.now(),
      });

      // "No, how about +1 h": the earliest suggestion among all votes becomes
      // the next vote, whichever vote's trigger gets here first. A fixed id
      // makes a second trigger (another vote, or a re-delivery) a no-op.
      type VoteDoc = { choice?: string; counterUtcMs?: number; userId?: string; castAt?: { toMillis(): number } };
      const counterVote = (votesSnapshot.docs.map((d) => d.data()) as VoteDoc[])
        .filter((v) => v.choice === 'reject' && typeof v.counterUtcMs === 'number')
        .sort((x, y) => (x.castAt?.toMillis() ?? 0) - (y.castAt?.toMillis() ?? 0))[0];
      if (counterVote) {
        const nextId = `${proposalId}-counter`;
        try {
          await roomRef.collection('proposals').doc(nextId).create({
            proposalId: nextId,
            createdBy: counterVote.userId ?? 'unknown',
            targetTimeUtc: counterVote.counterUtcMs,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(Date.now() + 90 * 1000),
            status: 'active',
          });
        } catch (err) {
          // 6 = ALREADY_EXISTS: another trigger already opened this vote.
          if ((err as { code?: number }).code !== 6) throw err;
        }
        await roomRef.update({
          status: 'VOTING',
          lastStatusChangeAt: Timestamp.now(),
          lastActivityAt: Timestamp.now(),
        });
        return;
      }

      await roomRef.update({
        status: 'OPEN',
        lastStatusChangeAt: Timestamp.now(),
      });

      return;
    }

    if (acceptedVotes >= memberCount && memberCount >= 2) {
      await proposalRef.update({
        status: 'resolved_locked',
        resolvedAt: Timestamp.now(),
      });

      await roomRef.update({
        status: 'LOCKED',
        lastStatusChangeAt: Timestamp.now(),
      });
    }
  },
);
