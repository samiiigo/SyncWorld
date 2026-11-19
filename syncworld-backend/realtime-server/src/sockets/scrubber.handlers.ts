import type { Server } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { isCachedRoomMember } from './roomMembership.guard';
import { persistenceManager } from '../lib/persistenceManager';
import { ScrubberUpdatePayloadSchema } from './schemas';

const MAX_SCRUBBER_RANGE_MS = 48 * 60 * 60 * 1000;

export function registerScrubberHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('scrubber:update', async (payload: unknown) => {
      const parsed = ScrubberUpdatePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid scrubber payload' });
        return;
      }
      
      const { roomId, position } = parsed.data;
      const uid = socket.data.uid as string | undefined;
      const now = Date.now();

      if (!uid) {
        socket.emit('error', { message: 'Unauthenticated socket' });
        return;
      }

      if (position < now || position > now + MAX_SCRUBBER_RANGE_MS) {
        socket.emit('error', { message: 'Scrubber position out of range' });
        return;
      }

      if (!socket.rooms.has(roomId)) {
        socket.emit('error', { message: 'Join the room before scrubbing' });
        return;
      }

      // O(1) Memory check instead of Firestore read
      if (!isCachedRoomMember(socket, roomId)) {
        socket.emit('error', { message: 'Room membership required' });
        return;
      }

      socket.to(roomId).emit(SOCKET_EVENTS.SCRUBBER_UPDATE, parsed.data);

      // Delegate to high-performance batch manager
      persistenceManager.queueScrubberUpdate(roomId, position);
    });
  });
}
