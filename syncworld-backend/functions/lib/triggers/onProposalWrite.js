"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onProposalWrite = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
exports.onProposalWrite = (0, firestore_2.onDocumentCreated)('rooms/{roomId}/proposals/{proposalId}/votes/{voteId}', async (event) => {
    const roomId = event.params.roomId;
    const proposalId = event.params.proposalId;
    const voteData = event.data?.data();
    if (!voteData) {
        return;
    }
    const roomRef = firebaseAdmin_1.firebaseAdminFirestore.collection('rooms').doc(roomId);
    const proposalRef = roomRef.collection('proposals').doc(proposalId);
    const roomSnapshot = await roomRef.get();
    if (!roomSnapshot.exists) {
        return;
    }
    const roomData = roomSnapshot.data();
    const membersSnapshot = await roomRef.collection('members').get();
    const votesSnapshot = await proposalRef.collection('votes').get();
    const voteDocs = votesSnapshot.docs.map((doc) => doc.data());
    const memberCount = membersSnapshot.size;
    const acceptedVotes = voteDocs.filter((vote) => vote.choice === 'accept').length;
    const rejectedVotes = voteDocs.filter((vote) => vote.choice === 'reject').length;
    if (rejectedVotes > 0) {
        await proposalRef.update({
            status: 'resolved_rejected',
            resolvedAt: firestore_1.Timestamp.now(),
        });
        await roomRef.update({
            status: 'OPEN',
            lastStatusChangeAt: firestore_1.Timestamp.now(),
        });
        return;
    }
    if (acceptedVotes >= memberCount && memberCount >= 2) {
        await proposalRef.update({
            status: 'resolved_locked',
            resolvedAt: firestore_1.Timestamp.now(),
        });
        await roomRef.update({
            status: 'LOCKED',
            lastStatusChangeAt: firestore_1.Timestamp.now(),
        });
    }
});
