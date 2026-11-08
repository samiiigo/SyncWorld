"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireProposals = void 0;
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
exports.expireProposals = (0, scheduler_1.onSchedule)('every 1 minutes', async () => {
    const now = firestore_1.Timestamp.now();
    const activeProposalsSnapshot = await firebaseAdmin_1.firebaseAdminFirestore
        .collectionGroup('proposals')
        .where('status', '==', 'active')
        .where('expiresAt', '<=', now)
        .get();
    await Promise.all(activeProposalsSnapshot.docs.map(async (proposalDoc) => {
        const proposalRef = proposalDoc.ref;
        const roomRef = proposalRef.parent.parent;
        if (!roomRef) {
            return;
        }
        await proposalRef.update({
            status: 'expired',
            resolvedAt: firestore_1.Timestamp.now(),
        });
        await roomRef.update({
            status: 'OPEN',
            lastStatusChangeAt: firestore_1.Timestamp.now(),
        });
    }));
});
