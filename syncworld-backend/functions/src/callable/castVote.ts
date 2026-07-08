import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { castVoteInputSchema } from '../lib/validation';

type CastVoteResult = {
  roomId: string;
  proposalId: string;
  voteId: string;
  choice: 'accept' | 'reject';
};

export const castVote = onCall(async (request): Promise<CastVoteResult> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to vote.');
  }

  if (!request.app) {
    throw new HttpsError('failed-precondition', 'App Check token is required.');
  }

  const input = castVoteInputSchema.parse(request.data ?? {});
  const uid = request.auth.uid;
  const roomRef = firebaseAdminFirestore.collection('rooms').doc(input.roomId);
  const proposalRef = roomRef.collection('proposals').doc(input.proposalId);
  const voteRef = proposalRef.collection('votes').doc(uid);

  const result = await firebaseAdminFirestore.runTransaction(async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists) {
      throw new HttpsError('not-found', 'Room not found.');
    }

    const memberSnapshot = await transaction.get(roomRef.collection('members').doc(uid));
    if (!memberSnapshot.exists) {
      throw new HttpsError('permission-denied', 'You must be a room member to vote.');
    }

    const proposalSnapshot = await transaction.get(proposalRef);
    if (!proposalSnapshot.exists) {
      throw new HttpsError('not-found', 'Proposal not found.');
    }

    const proposalData = proposalSnapshot.data() as { status?: string; expiresAt?: FirebaseFirestore.Timestamp };
    if (proposalData.status !== 'active') {
      throw new HttpsError('failed-precondition', 'This proposal is no longer active.');
    }

    if (proposalData.expiresAt && proposalData.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError('failed-precondition', 'This proposal has expired.');
    }

    const existingVoteSnapshot = await transaction.get(voteRef);
    if (existingVoteSnapshot.exists) {
      throw new HttpsError('already-exists', 'You have already voted on this proposal.');
    }

    transaction.set(voteRef, {
      userId: uid,
      choice: input.choice,
      castAt: Timestamp.now(),
    });

    transaction.update(roomRef, {
      lastActivityAt: Timestamp.now(),
    });

    return {
      roomId: input.roomId,
      proposalId: input.proposalId,
      voteId: uid,
      choice: input.choice,
    } satisfies CastVoteResult;
  });

  return result;
});
