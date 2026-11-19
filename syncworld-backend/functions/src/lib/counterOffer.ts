import { HttpsError } from 'firebase-functions/v2/https';

const MIN_AHEAD_MS = 60_000;
const MAX_AHEAD_MS = 7 * 24 * 60 * 60_000;

/**
 * A "No, how about +1 h" vote. Only a reject may carry a counter, and the
 * suggested time must be between one minute and seven days from now.
 * Throws invalid-argument before anything is written.
 */
export function checkCounterOffer(input: { choice: 'accept' | 'reject'; counterUtcMs?: number }, now: number): void {
  if (input.counterUtcMs === undefined) return;
  if (input.choice !== 'reject') {
    throw new HttpsError('invalid-argument', 'Only a No vote can suggest another time.');
  }
  if (input.counterUtcMs < now + MIN_AHEAD_MS || input.counterUtcMs > now + MAX_AHEAD_MS) {
    throw new HttpsError('invalid-argument', 'The suggested time must be within the next 7 days.');
  }
}
