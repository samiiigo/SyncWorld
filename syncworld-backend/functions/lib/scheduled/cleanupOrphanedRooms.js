"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOrphanedRooms = void 0;
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
exports.cleanupOrphanedRooms = (0, scheduler_1.onSchedule)('every 24 hours', async () => {
    const cutoff = firestore_1.Timestamp.fromMillis(Date.now() - ROOM_TTL_MS);
    const staleRoomsSnapshot = await firebaseAdmin_1.firebaseAdminFirestore
        .collection('rooms')
        .where('memberCount', '==', 0)
        .get();
    const oldRoomsSnapshot = await firebaseAdmin_1.firebaseAdminFirestore
        .collection('rooms')
        .where('lastActivityAt', '<=', cutoff)
        .get();
    const roomDocs = [...staleRoomsSnapshot.docs, ...oldRoomsSnapshot.docs];
    const uniqueRoomDocs = new Map(roomDocs.map((doc) => [doc.id, doc]));
    await Promise.all(Array.from(uniqueRoomDocs.values()).map(async (roomDoc) => {
        await firebaseAdmin_1.firebaseAdminFirestore.recursiveDelete(roomDoc.ref);
        const code = roomDoc.data().code;
        if (code) {
            await firebaseAdmin_1.firebaseAdminFirestore.collection('room_codes').doc(code).delete();
        }
    }));
});
