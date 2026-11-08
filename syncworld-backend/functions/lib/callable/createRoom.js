"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = void 0;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
const rateLimit_1 = require("../lib/rateLimit");
const validation_1 = require("../lib/validation");
function generateRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = (0, node_crypto_1.randomBytes)(6);
    return Array.from(bytes)
        .map((byte) => alphabet[byte % alphabet.length])
        .join('');
}
exports.createRoom = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to create a room.');
    }
    if (!request.app) {
        throw new https_1.HttpsError('failed-precondition', 'App Check token is required.');
    }
    const input = validation_1.createRoomInputSchema.parse(request.data ?? {});
    const uid = request.auth.uid;
    await (0, rateLimit_1.assertWithinRateLimit)(uid, 'create-room', 3);
    const roomRef = firebaseAdmin_1.firebaseAdminFirestore.collection('rooms').doc();
    const roomId = roomRef.id;
    let generatedRoomCode = '';
    await firebaseAdmin_1.firebaseAdminFirestore.runTransaction(async (transaction) => {
        let roomCode = generateRoomCode();
        let roomCodeRef = firebaseAdmin_1.firebaseAdminFirestore.collection('room_codes').doc(roomCode);
        while ((await transaction.get(roomCodeRef)).exists) {
            roomCode = generateRoomCode();
            roomCodeRef = firebaseAdmin_1.firebaseAdminFirestore.collection('room_codes').doc(roomCode);
        }
        generatedRoomCode = roomCode;
        transaction.set(roomRef, {
            roomId,
            code: roomCode,
            status: 'OPEN',
            hostId: uid,
            memberCount: 1,
            createdAt: firestore_1.Timestamp.now(),
            lastActivityAt: firestore_1.Timestamp.now(),
            lastStatusChangeAt: firestore_1.Timestamp.now(),
            scrubberPosition: 0,
            roomName: input.roomName,
            participantCap: input.participantCap ?? null,
        });
        transaction.set(roomCodeRef, {
            roomId,
            createdAt: firestore_1.Timestamp.now(),
        });
        transaction.set(roomRef.collection('members').doc(uid), {
            uid,
            displayName: input.displayName ?? null,
            timezone: input.timezone,
            isOnline: true,
            lastSeenAt: firestore_1.Timestamp.now(),
            joinedAt: firestore_1.Timestamp.now(),
            role: 'host',
        });
    });
    return { roomId, code: generatedRoomCode };
});
