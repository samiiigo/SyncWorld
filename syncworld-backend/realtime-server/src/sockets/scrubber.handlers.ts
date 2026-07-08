import type { Server } from 'socket.io';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { isRoomMember } from './roomMembership.guard';

type ScrubberUpdatePayload = {
  roomId: string;
  position: number;
};

const MAX_SCRUBBER_RANGE_MS = 48 * 60 * 60 * 1000;
const SCRUBBER_PERSIST_DEBOUNCE_MS = 500;

const pendingScrubberWrites = new Map<string, { position: number; timer: NodeJS.Timeout }>();

export function registerScrubberHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('scrubber:update', async (payload: ScrubberUpdatePayload) => {
      const roomId = payload?.roomId;
      const position = payload?.position;
      const uid = socket.data.uid as string | undefined;
      const now = Date.now();

      if (!uid || typeof roomId !== 'string' || !Number.isFinite(position)) {
        socket.emit('error', { message: 'Invalid scrubber payload' });
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

      const memberAllowed = await isRoomMember(roomId, uid);
      if (!memberAllowed) {
        socket.emit('error', { message: 'Room membership required' });
        return;
      }

      socket.to(roomId).emit(SOCKET_EVENTS.SCRUBBER_UPDATE, payload);

      const pendingKey = roomId;
      const pendingWrite = pendingScrubberWrites.get(pendingKey);

      if (pendingWrite) {
        clearTimeout(pendingWrite.timer);
      }

      const timer = setTimeout(async () => {
        await firebaseAdminFirestore.collection('rooms').doc(roomId).update({
          scrubberPosition: position,
          lastActivityAt: Timestamp.now(),
        });
        pendingScrubberWrites.delete(pendingKey);
      }, SCRUBBER_PERSIST_DEBOUNCE_MS);

      pendingScrubberWrites.set(pendingKey, { position, timer });
    });
  });
}
