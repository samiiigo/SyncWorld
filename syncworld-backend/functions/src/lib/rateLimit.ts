import { HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from './firebaseAdmin';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function assertWithinRateLimit(uid: string, key: string, maxRequests: number): Promise<void> {
  const rateLimitRef = firebaseAdminFirestore.collection('rate_limits').doc(`${uid}:${key}`);

  await firebaseAdminFirestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const now = Date.now();

    if (!snapshot.exists) {
      transaction.set(rateLimitRef, {
        windowStartMs: now,
        count: 1,
        updatedAt: Timestamp.now(),
      });
      return;
    }

    const data = snapshot.data() as { windowStartMs?: number; count?: number };
    const windowStartMs = data.windowStartMs ?? now;
    const count = data.count ?? 0;

    if (now - windowStartMs >= RATE_LIMIT_WINDOW_MS) {
      transaction.set(rateLimitRef, {
        windowStartMs: now,
        count: 1,
        updatedAt: Timestamp.now(),
      });
      return;
    }

    if (count >= maxRequests) {
      throw new HttpsError('resource-exhausted', 'Rate limit exceeded for this action.');
    }

    transaction.update(rateLimitRef, {
      count: count + 1,
      updatedAt: Timestamp.now(),
    });
  });
}
