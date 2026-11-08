"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinRoom = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
const rateLimit_1 = require("../lib/rateLimit");
const validation_1 = require("../lib/validation");
exports.joinRoom = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to join a room.');
    }
    if (!request.app) {
        throw new https_1.HttpsError('failed-precondition', 'App Check token is required.');
    }
    const input = validation_1.joinRoomInputSchema.parse(request.data ?? {});
    const uid = request.auth.uid;
    await (0, rateLimit_1.assertWithinRateLimit)(uid, 'join-room', 20);
    const roomCodeRef = firebaseAdmin_1.firebaseAdminFirestore.collection('room_codes').doc(input.roomCode.toUpperCase());
    const roomCodeSnapshot = await roomCodeRef.get();
    if (!roomCodeSnapshot.exists) {
        throw new https_1.HttpsError('not-found', 'Room code not found.');
    }
    const roomId = roomCodeSnapshot.data()?.roomId;
    if (!roomId) {
        throw new https_1.HttpsError('not-found', 'Room code index is broken.');
    }
    const roomRef = firebaseAdmin_1.firebaseAdminFirestore.collection('rooms').doc(roomId);
    const memberRef = roomRef.collection('members').doc(uid);
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists) {
        throw new https_1.HttpsError('not-found', 'Room not found.');
    }
    const roomData = roomSnapshot.data();
    if (roomData.status === 'FIRED') {
        throw new https_1.HttpsError('failed-precondition', 'This room has already fired.');
    }
    if (memberRef.id && roomSnapshot.exists) {
        const existingMemberSnapshot = await memberRef.get();
        if (existingMemberSnapshot.exists) {
            return { roomId, roomCode: input.roomCode.toUpperCase() };
        }
    }
    await firebaseAdmin_1.firebaseAdminFirestore.runTransaction(async (transaction) => {
        const latestRoomSnapshot = await transaction.get(roomRef);
        if (!latestRoomSnapshot.exists) {
            throw new https_1.HttpsError('not-found', 'Room not found.');
        }
        const latestRoomData = latestRoomSnapshot.data();
        const currentMemberCount = latestRoomData.memberCount ?? 0;
        const participantCap = latestRoomData.participantCap ?? null;
        if (participantCap !== null && currentMemberCount >= participantCap) {
            throw new https_1.HttpsError('failed-precondition', 'Room is full.');
        }
        transaction.set(memberRef, {
            uid,
            displayName: input.displayName,
            timezone: input.timezone,
            isOnline: true,
            lastSeenAt: firestore_1.Timestamp.now(),
            joinedAt: firestore_1.Timestamp.now(),
            role: 'member',
        });
        transaction.update(roomRef, {
            memberCount: currentMemberCount + 1,
            lastActivityAt: firestore_1.Timestamp.now(),
        });
    });
    return { roomId, roomCode: input.roomCode.toUpperCase() };
});
