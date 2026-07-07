import type { Server } from 'socket.io';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { isRoomMember } from './roomMembership.guard';

type PresenceHeartbeatPayload = {
  roomId: string;
  userId: string;
  timestamp: number;
};

const pendingPresenceWrites = new Map<string, NodeJS.Timeout>();
const PRESENCE_PERSIST_DEBOUNCE_MS = 1000;

export function registerPresenceHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('presence:heartbeat', async (payload: PresenceHeartbeatPayload) => {
      const roomId = payload?.roomId;
      const userId = payload?.userId;
      const timestamp = payload?.timestamp;
      const socketUid = socket.data.uid as string | undefined;

      if (!roomId || !userId || socketUid !== userId || !Number.isFinite(timestamp)) {
        socket.emit('error', { message: 'Invalid presence heartbeat' });
        return;
      }

      if (!socket.rooms.has(roomId)) {
        socket.emit('error', { message: 'Join the room before sending heartbeats' });
        return;
      }

      const memberAllowed = await isRoomMember(roomId, userId);
      if (!memberAllowed) {
        socket.emit('error', { message: 'Room membership required' });
        return;
      }

      const pendingKey = `${roomId}:${userId}`;
      const existingTimer = pendingPresenceWrites.get(pendingKey);

      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        await firebaseAdminFirestore.collection('rooms').doc(roomId).collection('members').doc(userId).update({
          isOnline: true,
          lastSeenAt: Timestamp.now(),
        });

        io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_CHANGED, {
          roomId,
          userId,
          status: 'online',
        });

        pendingPresenceWrites.delete(pendingKey);
      }, PRESENCE_PERSIST_DEBOUNCE_MS);

      pendingPresenceWrites.set(pendingKey, timer);
    });
  });
}
