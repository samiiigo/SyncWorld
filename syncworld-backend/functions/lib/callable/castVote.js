"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.castVote = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
const validation_1 = require("../lib/validation");
exports.castVote = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to vote.');
    }
    if (!request.app) {
        throw new https_1.HttpsError('failed-precondition', 'App Check token is required.');
    }
    const input = validation_1.castVoteInputSchema.parse(request.data ?? {});
    const uid = request.auth.uid;
    const roomRef = firebaseAdmin_1.firebaseAdminFirestore.collection('rooms').doc(input.roomId);
    const proposalRef = roomRef.collection('proposals').doc(input.proposalId);
    const voteRef = proposalRef.collection('votes').doc(uid);
    const result = await firebaseAdmin_1.firebaseAdminFirestore.runTransaction(async (transaction) => {
        const roomSnapshot = await transaction.get(roomRef);
        if (!roomSnapshot.exists) {
            throw new https_1.HttpsError('not-found', 'Room not found.');
        }
        const memberSnapshot = await transaction.get(roomRef.collection('members').doc(uid));
        if (!memberSnapshot.exists) {
            throw new https_1.HttpsError('permission-denied', 'You must be a room member to vote.');
        }
        const proposalSnapshot = await transaction.get(proposalRef);
        if (!proposalSnapshot.exists) {
            throw new https_1.HttpsError('not-found', 'Proposal not found.');
        }
        const proposalData = proposalSnapshot.data();
        if (proposalData.status !== 'active') {
            throw new https_1.HttpsError('failed-precondition', 'This proposal is no longer active.');
        }
        if (proposalData.expiresAt && proposalData.expiresAt.toMillis() <= Date.now()) {
            throw new https_1.HttpsError('failed-precondition', 'This proposal has expired.');
        }
        const existingVoteSnapshot = await transaction.get(voteRef);
        if (existingVoteSnapshot.exists) {
            throw new https_1.HttpsError('already-exists', 'You have already voted on this proposal.');
        }
        transaction.set(voteRef, {
            userId: uid,
            choice: input.choice,
            castAt: firestore_1.Timestamp.now(),
        });
        transaction.update(roomRef, {
            lastActivityAt: firestore_1.Timestamp.now(),
        });
        return {
            roomId: input.roomId,
            proposalId: input.proposalId,
            voteId: uid,
            choice: input.choice,
        };
    });
    return result;
});
