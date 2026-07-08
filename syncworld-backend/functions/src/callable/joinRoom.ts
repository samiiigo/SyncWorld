import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { assertWithinRateLimit } from '../lib/rateLimit';
import { joinRoomInputSchema } from '../lib/validation';

type JoinRoomResult = {
  roomId: string;
  roomCode: string;
};

export const joinRoom = onCall(async (request): Promise<JoinRoomResult> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to join a room.');
  }

  if (!request.app) {
    throw new HttpsError('failed-precondition', 'App Check token is required.');
  }

  const input = joinRoomInputSchema.parse(request.data ?? {});
  const uid = request.auth.uid;

  await assertWithinRateLimit(uid, 'join-room', 20);

  const roomCodeRef = firebaseAdminFirestore.collection('room_codes').doc(input.roomCode.toUpperCase());
  const roomCodeSnapshot = await roomCodeRef.get();

  if (!roomCodeSnapshot.exists) {
    throw new HttpsError('not-found', 'Room code not found.');
  }

  const roomId = roomCodeSnapshot.data()?.roomId as string | undefined;

  if (!roomId) {
    throw new HttpsError('not-found', 'Room code index is broken.');
  }

  const roomRef = firebaseAdminFirestore.collection('rooms').doc(roomId);
  const memberRef = roomRef.collection('members').doc(uid);
  const roomSnapshot = await roomRef.get();

  if (!roomSnapshot.exists) {
    throw new HttpsError('not-found', 'Room not found.');
  }

  const roomData = roomSnapshot.data() as { status?: string; memberCount?: number; participantCap?: number | null };

  if (roomData.status === 'FIRED') {
    throw new HttpsError('failed-precondition', 'This room has already fired.');
  }

  if (memberRef.id && roomSnapshot.exists) {
    const existingMemberSnapshot = await memberRef.get();
    if (existingMemberSnapshot.exists) {
      return { roomId, roomCode: input.roomCode.toUpperCase() };
    }
  }

  await firebaseAdminFirestore.runTransaction(async (transaction) => {
    const latestRoomSnapshot = await transaction.get(roomRef);

    if (!latestRoomSnapshot.exists) {
      throw new HttpsError('not-found', 'Room not found.');
    }

    const latestRoomData = latestRoomSnapshot.data() as { memberCount?: number; participantCap?: number | null; status?: string };
    const currentMemberCount = latestRoomData.memberCount ?? 0;
    const participantCap = latestRoomData.participantCap ?? null;

    if (participantCap !== null && currentMemberCount >= participantCap) {
      throw new HttpsError('failed-precondition', 'Room is full.');
    }

    transaction.set(memberRef, {
      uid,
      displayName: input.displayName,
      timezone: input.timezone,
      isOnline: true,
      lastSeenAt: Timestamp.now(),
      joinedAt: Timestamp.now(),
      role: 'member',
    });

    transaction.update(roomRef, {
      memberCount: currentMemberCount + 1,
      lastActivityAt: Timestamp.now(),
    });
  });

  return { roomId, roomCode: input.roomCode.toUpperCase() };
});
