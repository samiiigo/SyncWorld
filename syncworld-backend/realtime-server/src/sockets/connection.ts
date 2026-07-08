import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { verifyAuthToken } from '../middleware/verifyAuthToken';
import { isRoomMember } from './roomMembership.guard';

type JoinRoomPayload = {
  roomId: string;
};

export function registerSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== 'string' || token.length === 0) {
      next(new Error('Missing Firebase ID token'));
      return;
    }

    const verificationResult = await verifyAuthToken(token);

    if (!verificationResult.ok) {
      next(new Error(verificationResult.error));
      return;
    }

    socket.data.uid = verificationResult.value.uid;
    next();
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join-room', async (payload: JoinRoomPayload) => {
      const roomId = payload?.roomId;

      if (typeof roomId !== 'string' || roomId.length === 0) {
        socket.emit('error', { message: 'Missing roomId' });
        return;
      }

      const uid = socket.data.uid as string | undefined;

      if (!uid) {
        socket.emit('error', { message: 'Unauthenticated socket' });
        return;
      }

      const memberAllowed = await isRoomMember(roomId, uid);

      if (!memberAllowed) {
        socket.emit('error', { message: 'Room membership required' });
        return;
      }

      await socket.join(roomId);
      socket.emit(SOCKET_EVENTS.MEMBER_JOINED, {
        roomId,
        userId: uid,
        displayName: uid,
      });
    });
  });
}
