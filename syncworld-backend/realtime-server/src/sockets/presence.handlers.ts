import type { Server } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { isRoomMember } from './roomMembership.guard';
import { persistenceManager } from '../lib/persistenceManager';
import { PresenceHeartbeatPayloadSchema } from './schemas';

export function registerPresenceHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('presence:heartbeat', async (payload: unknown) => {
      const parsed = PresenceHeartbeatPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid presence heartbeat' });
        return;
      }

      const { roomId, userId, timestamp } = parsed.data;
      const socketUid = socket.data.uid as string | undefined;

      if (socketUid !== userId) {
        socket.emit('error', { message: 'Invalid or spoofed presence heartbeat' });
        return;
      }

      if (!socket.rooms.has(roomId)) {
        socket.emit('error', { message: 'Join the room before sending heartbeats' });
        return;
      }

      // O(1) Memory Check
      if (!isRoomMember(socket, roomId)) {
        socket.emit('error', { message: 'Room membership required' });
        return;
      }

      io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_CHANGED, {
        roomId,
        userId,
        status: 'online',
      });

      // Delegate to high-performance batch manager
      persistenceManager.queuePresenceUpdate(roomId, userId);
    });
  });
}
