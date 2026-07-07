import { firebaseAdminFirestore } from '../lib/firebaseAdmin';

export async function isRoomMember(roomId: string, uid: string): Promise<boolean> {
  const memberSnapshot = await firebaseAdminFirestore
    .collection('rooms')
    .doc(roomId)
    .collection('members')
    .doc(uid)
    .get();

  return memberSnapshot.exists;
}
