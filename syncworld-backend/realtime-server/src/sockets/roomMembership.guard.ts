import type { Socket } from 'socket.io';
import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

/**
 * verifyMembershipWithFirestore — performs a live Firestore read to confirm
 * the user is an active member of the room. Used ONCE at socket join time.
 * Do not call this on high-frequency events; use isCachedRoomMember instead.
 */
export async function verifyMembershipWithFirestore(roomId: string, uid: string): Promise<boolean> {
  const memberSnapshot = await firebaseAdminFirestore
    .collection('rooms')
    .doc(roomId)
    .collection('members')
    .doc(uid)
    .get();

  return memberSnapshot.exists;
}

/**
 * isCachedRoomMember — O(1) in-memory check against the per-socket
 * authorizedRooms Set. Use this on all high-frequency events (scrubber,
 * presence, proposals) after the socket has joined the room.
 */
export function isCachedRoomMember(socket: Socket, roomId: string): boolean {
  if (!socket.data.authorizedRooms) {
    return false;
  }
  return socket.data.authorizedRooms.has(roomId);
}
