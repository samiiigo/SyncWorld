import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { isValidTransition, type RoomStatus } from '../lib/roomFsm';
import { transitionRoomStatusInputSchema } from '../lib/validation';

type TransitionRoomStatusResult = {
  roomId: string;
  status: RoomStatus;
};

export const transitionRoomStatus = onCall(async (request): Promise<TransitionRoomStatusResult> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to transition room status.');
  }

  if (!request.app) {
    throw new HttpsError('failed-precondition', 'App Check token is required.');
  }

  const input = transitionRoomStatusInputSchema.parse(request.data ?? {});
  const roomRef = firebaseAdminFirestore.collection('rooms').doc(input.roomId);
  const roomSnapshot = await roomRef.get();

  if (!roomSnapshot.exists) {
    throw new HttpsError('not-found', 'Room not found.');
  }

  const roomData = roomSnapshot.data() as { status?: RoomStatus; memberCount?: number };
  const currentStatus = roomData.status ?? 'OPEN';

  if (!isValidTransition(currentStatus, input.targetStatus)) {
    throw new HttpsError('failed-precondition', `Invalid room transition: ${currentStatus} -> ${input.targetStatus}`);
  }

  if (currentStatus === 'OPEN' && input.targetStatus === 'PROPOSING') {
    const memberCount = roomData.memberCount ?? 0;
    if (memberCount < 2) {
      throw new HttpsError('failed-precondition', 'At least two members are required to open proposing.');
    }
  }

  if (currentStatus === 'VOTING' && input.targetStatus === 'LOCKED') {
    const activeProposalSnapshot = await roomRef
      .collection('proposals')
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (activeProposalSnapshot.empty) {
      throw new HttpsError('failed-precondition', 'No active proposal found for this room.');
    }

    const activeProposal = activeProposalSnapshot.docs[0];
    const votesSnapshot = await activeProposal.ref.collection('votes').get();
    const memberCount = roomData.memberCount ?? 0;
    const acceptedVotes = votesSnapshot.docs.filter((voteDoc) => voteDoc.data().choice === 'accept').length;

    if (votesSnapshot.size < memberCount || acceptedVotes < memberCount) {
      throw new HttpsError('failed-precondition', 'Consensus has not been reached.');
    }

    await activeProposal.ref.update({
      status: 'resolved_locked',
      resolvedAt: Timestamp.now(),
    });
  }

  if (input.targetStatus === 'FIRED') {
    throw new HttpsError('permission-denied', 'Room firing is reserved for the scheduled alarm pipeline.');
  }

  await firebaseAdminFirestore.runTransaction(async (transaction) => {
    transaction.update(roomRef, {
      status: input.targetStatus,
      lastStatusChangeAt: Timestamp.now(),
    });
  });

  return {
    roomId: input.roomId,
    status: input.targetStatus,
  };
});
