import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

/**
 * Requires a verified App Check token on production callables.
 *
 * The Functions emulator never attaches `request.app`, so local development
 * against the emulator suite would otherwise be impossible. FUNCTIONS_EMULATOR
 * is set by the Firebase emulator itself and is never present in deployed
 * functions, so production enforcement is unchanged.
 */
export function assertAppCheck(request: CallableRequest): void {
  if (request.app) return;
  if (process.env.FUNCTIONS_EMULATOR === 'true') return;
  throw new HttpsError('failed-precondition', 'App Check token is required.');
}
