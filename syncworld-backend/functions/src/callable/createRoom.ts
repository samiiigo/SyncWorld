import { randomBytes } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { assertWithinRateLimit } from '../lib/rateLimit';
import { createRoomInputSchema } from '../lib/validation';

type CreateRoomResult = {
  roomId: string;
  code: string;
};

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  return Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join('');
}

export const createRoom = onCall(async (request): Promise<CreateRoomResult> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to create a room.');
  }

  if (!request.app) {
    throw new HttpsError('failed-precondition', 'App Check token is required.');
  }

  const input = createRoomInputSchema.parse(request.data ?? {});
  const uid = request.auth.uid;

  await assertWithinRateLimit(uid, 'create-room', 3);

  const roomRef = firebaseAdminFirestore.collection('rooms').doc();
  const roomId = roomRef.id;
  let generatedRoomCode = '';

  await firebaseAdminFirestore.runTransaction(async (transaction) => {
    let roomCode = generateRoomCode();
    let roomCodeRef = firebaseAdminFirestore.collection('room_codes').doc(roomCode);

    while ((await transaction.get(roomCodeRef)).exists) {
      roomCode = generateRoomCode();
      roomCodeRef = firebaseAdminFirestore.collection('room_codes').doc(roomCode);
    }

    generatedRoomCode = roomCode;

    transaction.set(roomRef, {
      roomId,
      code: roomCode,
      status: 'OPEN',
      hostId: uid,
      memberCount: 1,
      createdAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
      lastStatusChangeAt: Timestamp.now(),
      scrubberPosition: 0,
      roomName: input.roomName,
      participantCap: input.participantCap ?? null,
    });

    transaction.set(roomCodeRef, {
      roomId,
      createdAt: Timestamp.now(),
    });

    transaction.set(roomRef.collection('members').doc(uid), {
      uid,
      displayName: input.displayName ?? null,
      timezone: input.timezone,
      isOnline: true,
      lastSeenAt: Timestamp.now(),
      joinedAt: Timestamp.now(),
      role: 'host',
    });
  });

  return { roomId, code: generatedRoomCode };
});
