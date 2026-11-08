"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionRoomStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
const roomFsm_1 = require("../lib/roomFsm");
const validation_1 = require("../lib/validation");
exports.transitionRoomStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to transition room status.');
    }
    if (!request.app) {
        throw new https_1.HttpsError('failed-precondition', 'App Check token is required.');
    }
    const input = validation_1.transitionRoomStatusInputSchema.parse(request.data ?? {});
    const roomRef = firebaseAdmin_1.firebaseAdminFirestore.collection('rooms').doc(input.roomId);
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists) {
        throw new https_1.HttpsError('not-found', 'Room not found.');
    }
    const roomData = roomSnapshot.data();
    const currentStatus = roomData.status ?? 'OPEN';
    if (!(0, roomFsm_1.isValidTransition)(currentStatus, input.targetStatus)) {
        throw new https_1.HttpsError('failed-precondition', `Invalid room transition: ${currentStatus} -> ${input.targetStatus}`);
    }
    if (currentStatus === 'OPEN' && input.targetStatus === 'PROPOSING') {
        const memberCount = roomData.memberCount ?? 0;
        if (memberCount < 2) {
            throw new https_1.HttpsError('failed-precondition', 'At least two members are required to open proposing.');
        }
    }
    if (currentStatus === 'VOTING' && input.targetStatus === 'LOCKED') {
        const activeProposalSnapshot = await roomRef
            .collection('proposals')
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (activeProposalSnapshot.empty) {
            throw new https_1.HttpsError('failed-precondition', 'No active proposal found for this room.');
        }
        const activeProposal = activeProposalSnapshot.docs[0];
        const votesSnapshot = await activeProposal.ref.collection('votes').get();
        const memberCount = roomData.memberCount ?? 0;
        const acceptedVotes = votesSnapshot.docs.filter((voteDoc) => voteDoc.data().choice === 'accept').length;
        if (votesSnapshot.size < memberCount || acceptedVotes < memberCount) {
            throw new https_1.HttpsError('failed-precondition', 'Consensus has not been reached.');
        }
        await activeProposal.ref.update({
            status: 'resolved_locked',
            resolvedAt: firestore_1.Timestamp.now(),
        });
    }
    if (input.targetStatus === 'FIRED') {
        throw new https_1.HttpsError('permission-denied', 'Room firing is reserved for the scheduled alarm pipeline.');
    }
    await firebaseAdmin_1.firebaseAdminFirestore.runTransaction(async (transaction) => {
        transaction.update(roomRef, {
            status: input.targetStatus,
            lastStatusChangeAt: firestore_1.Timestamp.now(),
        });
    });
    return {
        roomId: input.roomId,
        status: input.targetStatus,
    };
});
