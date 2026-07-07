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
