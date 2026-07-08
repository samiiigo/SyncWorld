import type { DecodedIdToken } from 'firebase-admin/auth';
import type { NextFunction, Request, Response } from 'express';
import { firebaseAdminAuth } from '../lib/firebaseAdmin';

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export async function verifyAuthToken(rawToken: string): Promise<Result<DecodedIdToken>> {
  try {
    const decodedToken = await firebaseAdminAuth.verifyIdToken(rawToken);
    return { ok: true, value: decodedToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify Firebase ID token';
    return { ok: false, error: message };
  }
}

export async function verifyAuthTokenMiddleware(request: Request, response: Response, next: NextFunction): Promise<void> {
  const authorizationHeader = request.header('authorization');

  if (!authorizationHeader?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Missing Firebase ID token' });
    return;
  }

  const rawToken = authorizationHeader.slice('Bearer '.length);
  const verificationResult = await verifyAuthToken(rawToken);

  if (!verificationResult.ok) {
    response.status(401).json({ error: (verificationResult as any).error });
    return;
  }

  response.locals.decodedToken = verificationResult.value;
  response.locals.uid = verificationResult.value.uid;
  next();
}
