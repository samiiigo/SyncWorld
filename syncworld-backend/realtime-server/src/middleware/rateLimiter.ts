import type { NextFunction, Request, Response } from 'express';

type WindowState = {
  windowStartMs: number;
  count: number;
};

// WARNING: Single-instance assumption. This in-memory rate limiter is process-local.
// Under horizontal scaling, it will not be consistent across instances.
// Must be revisited before running multiple realtime server instances.
const uidWindows = new Map<string, WindowState>();

export function createUidRateLimiter(windowMs: number, maxRequests: number) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const uid = response.locals.uid as string | undefined;

    if (!uid) {
      response.status(401).json({ error: 'Missing verified user identity' });
      return;
    }

    const now = Date.now();
    const currentWindow = uidWindows.get(uid);

    if (!currentWindow || now - currentWindow.windowStartMs >= windowMs) {
      uidWindows.set(uid, { windowStartMs: now, count: 1 });
      next();
      return;
    }

    if (currentWindow.count >= maxRequests) {
      response.status(429).json({ error: 'Too many requests' });
      return;
    }

    currentWindow.count += 1;
    uidWindows.set(uid, currentWindow);
    next();
  };
}
