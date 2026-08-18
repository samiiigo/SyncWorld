import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { verifyAuthToken } from '../middleware/verifyAuthToken';
import { verifyMembershipWithFirestore } from './roomMembership.guard';
import { JoinRoomPayloadSchema } from './schemas';
import { logger } from '../lib/logger';
import { persistenceManager } from '../lib/persistenceManager';

// WARNING: Single-instance assumption. This token bucket rate limiter is process-local.
// Under horizontal scaling with Redis, clients can bypass this by routing to different instances.
// Must be revisited before running multiple realtime server instances.
const rateLimits = new Map<string, { tokens: number; lastRefill: number }>();
const MAX_EVENTS_PER_SEC = 100;

// Single-instance assumption: disconnect grace period timers
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const DISCONNECT_GRACE_PERIOD_MS = 10000;

function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  let limit = rateLimits.get(socketId);
  
  if (!limit) {
    limit = { tokens: MAX_EVENTS_PER_SEC, lastRefill: now };
  } else {
    // Refill tokens (100 per second)
    const timePassed = now - limit.lastRefill;
    const refill = Math.floor(timePassed * (MAX_EVENTS_PER_SEC / 1000));
    if (refill > 0) {
      limit.tokens = Math.min(MAX_EVENTS_PER_SEC, limit.tokens + refill);
      limit.lastRefill = now;
    }
  }

  if (limit.tokens <= 0) {
    return false;
  }
  
  limit.tokens -= 1;
  rateLimits.set(socketId, limit);
  return true;
}

export function registerSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== 'string' || token.length === 0) {
      next(new Error('Missing Firebase ID token'));
      return;
    }

    const verificationResult = await verifyAuthToken(token);

    if (!verificationResult.ok) {
      next(new Error((verificationResult as any).error));
      return;
    }

    socket.data.uid = verificationResult.value.uid;
    socket.data.authorizedRooms = new Set<string>();
    next();
  });

  io.on('connection', (socket: Socket) => {
    // Middleware to enforce rate limiting on ALL events for this socket
    socket.use((event, next) => {
      if (!checkRateLimit(socket.id)) {
        logger.warn({ socketId: socket.id }, 'Socket rate limited');
        socket.disconnect(true);
        return next(new Error('Rate limit exceeded'));
      }
      next();
    });

    socket.on('disconnect', async () => {
      rateLimits.delete(socket.id);
      
      const uid = socket.data.uid as string | undefined;
      const authorizedRooms = socket.data.authorizedRooms as Set<string> | undefined;

      if (uid && authorizedRooms) {
        for (const roomId of authorizedRooms) {
          try {
            const roomSockets = await io.in(roomId).fetchSockets();
            const otherSocketsForUser = roomSockets.filter(
              (s) => s.data.uid === uid && s.id !== socket.id
            );
            
            if (otherSocketsForUser.length > 0) {
              continue; // User is still connected from another device in this room
            }
          } catch (err) {
            logger.error({ err, roomId, uid }, 'Failed to fetch sockets during disconnect multi-device check. Assuming user is still connected elsewhere to prevent spurious disconnect.');
            continue; // Fail toward staying connected
          }

          const timerKey = `${uid}:${roomId}`;
          
          if (!disconnectTimers.has(timerKey)) {
            const timer = setTimeout(() => {
              disconnectTimers.delete(timerKey);
              
              // Broadcast member left
              io.to(roomId).emit(SOCKET_EVENTS.MEMBER_LEFT, {
                roomId,
                userId: uid,
              });
              
              // Queue offline status
              persistenceManager.queueOfflineUpdate(roomId, uid);
            }, DISCONNECT_GRACE_PERIOD_MS);
            
            disconnectTimers.set(timerKey, timer);
          }
        }
      }
    });

    socket.on('join-room', async (payload: unknown) => {
      const parsed = JoinRoomPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid payload' });
        return;
      }
      
      const { roomId } = parsed.data;
      const uid = socket.data.uid as string | undefined;

      if (!uid) {
        socket.emit('error', { message: 'Unauthenticated socket' });
        return;
      }

      // One-time Firestore check upon join
      const memberAllowed = await verifyMembershipWithFirestore(roomId, uid);

      if (!memberAllowed) {
        socket.emit('error', { message: 'Room membership required' });
        return;
      }

      await socket.join(roomId);
      // Cache authorization in memory!
      socket.data.authorizedRooms.add(roomId);

      const timerKey = `${uid}:${roomId}`;
      const existingTimer = disconnectTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
        disconnectTimers.delete(timerKey);
      }

      socket.emit(SOCKET_EVENTS.MEMBER_JOINED, {
        roomId,
        userId: uid,
        displayName: uid,
      });
    });
  });
}
