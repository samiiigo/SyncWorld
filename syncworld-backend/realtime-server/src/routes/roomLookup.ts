import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAdminApp } from '../lib/firebaseAdmin';
import { createUidRateLimiter } from '../middleware/rateLimiter';
import { verifyAuthTokenMiddleware } from '../middleware/verifyAuthToken';

export const roomLookupRouter = Router();

roomLookupRouter.get(
  '/room-lookup',
  verifyAuthTokenMiddleware,
  createUidRateLimiter(60 * 1000, 5),
  async (request, response) => {
    const code = typeof request.query.code === 'string' ? request.query.code.trim().toUpperCase() : '';

    if (!code) {
      response.status(400).json({ error: 'Missing room code' });
      return;
    }

    const roomCodeSnapshot = await getFirestore(firebaseAdminApp).collection('room_codes').doc(code).get();

    if (!roomCodeSnapshot.exists) {
      response.status(404).json({ error: 'Room not found' });
      return;
    }

    const roomData = roomCodeSnapshot.data() as { roomId?: string };
    response.status(200).json({ roomId: roomData.roomId ?? null });
  },
);
