import type { VerifyAppCheckTokenResponse } from 'firebase-admin/app-check';
import { getAppCheck } from 'firebase-admin/app-check';
import { firebaseAdminApp } from '../lib/firebaseAdmin';

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export async function verifyAppCheckToken(rawToken: string): Promise<Result<VerifyAppCheckTokenResponse>> {
  try {
    const decodedToken = await getAppCheck(firebaseAdminApp).verifyToken(rawToken);
    return { ok: true, value: decodedToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify Firebase App Check token';
    return { ok: false, error: message };
  }
}
