import type { Socket } from 'socket.io';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

// Original Firestore check, used ONLY when joining
export async function isRoomMemberOriginal(roomId: string, uid: string): Promise<boolean> {
  const memberSnapshot = await firebaseAdminFirestore
    .collection('rooms')
    .doc(roomId)
    .collection('members')
    .doc(uid)
    .get();

  return memberSnapshot.exists;
}

// O(1) in-memory check for high-frequency events
export function isRoomMember(socket: Socket, roomId: string): boolean {
  if (!socket.data.authorizedRooms) {
    return false;
  }
  return socket.data.authorizedRooms.has(roomId);
}
