import type { Server } from 'socket.io';
import { Timestamp } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { isRoomMember } from './roomMembership.guard';
import { ScrubberProposalPayloadSchema } from './schemas';

export function registerProposalHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(SOCKET_EVENTS.SCRUBBER_PROPOSAL, async (payload: unknown) => {
      const parsed = ScrubberProposalPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid proposal payload' });
        return;
      }

      const { roomId, position, proposedBy } = parsed.data;
      const uid = socket.data.uid as string | undefined;

      if (!uid || uid !== proposedBy) {
        socket.emit('error', { message: 'Unauthenticated or spoofed proposedBy' });
        return;
      }

      if (!socket.rooms.has(roomId)) {
        socket.emit('error', { message: 'Join the room before proposing' });
        return;
      }

      // O(1) Memory check
      if (!isRoomMember(socket, roomId)) {
        socket.emit('error', { message: 'Room membership required' });
        return;
      }

      const roomRef = firebaseAdminFirestore.collection('rooms').doc(roomId);
      const proposalRef = roomRef.collection('proposals').doc();

      try {
        await firebaseAdminFirestore.runTransaction(async (transaction) => {
          const roomSnapshot = await transaction.get(roomRef);

          if (!roomSnapshot.exists) {
            throw new Error('Room not found');
          }

          transaction.set(proposalRef, {
            proposalId: proposalRef.id,
            createdBy: uid,
            targetTimeUtc: position,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(Date.now() + 90 * 1000),
            status: 'active',
          });

          transaction.update(roomRef, {
            status: 'VOTING',
            lastStatusChangeAt: Timestamp.now(),
            lastActivityAt: Timestamp.now(),
          });
        });

        io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATUS_CHANGED, {
          roomId,
          from: 'PROPOSING',
          to: 'VOTING',
          timestamp: Date.now(),
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to create proposal' });
      }
    });
  });
}
