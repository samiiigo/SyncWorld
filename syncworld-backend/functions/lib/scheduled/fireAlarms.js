"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fireAlarms = void 0;
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebaseAdmin_1 = require("../lib/firebaseAdmin");
exports.fireAlarms = (0, scheduler_1.onSchedule)('every 1 minutes', async () => {
    const now = Date.now();
    const lockedRoomsSnapshot = await firebaseAdmin_1.firebaseAdminFirestore
        .collection('rooms')
        .where('status', '==', 'LOCKED')
        .get();
    await Promise.all(lockedRoomsSnapshot.docs.map(async (roomDoc) => {
        const roomRef = roomDoc.ref;
        const roomData = roomDoc.data();
        const proposalSnapshot = await roomRef
            .collection('proposals')
            .where('status', '==', 'resolved_locked')
            .limit(1)
            .get();
        if (proposalSnapshot.empty) {
            return;
        }
        const proposalDoc = proposalSnapshot.docs[0];
        const proposalData = proposalDoc.data();
        const targetTimeUtc = proposalData.targetTimeUtc ?? 0;
        if (targetTimeUtc > now) {
            return;
        }
        const tokensSnapshot = await roomRef.collection('push_tokens').get();
        const tokens = tokensSnapshot.docs
            .map((doc) => doc.data())
            .map((token) => token.expoPushToken)
            .filter((token) => Boolean(token));
        if (tokens.length > 0) {
            const response = await firebaseAdmin_1.firebaseAdminMessaging.sendEachForMulticast({
                tokens,
                notification: {
                    title: '⏰ SyncWorld Alarm!',
                    body: roomData.roomId ? `Time for room ${roomData.roomId}` : 'Time to wake up',
                },
                data: {
                    roomId: roomData.roomId ?? roomDoc.id,
                    alarmTimeUTC: String(targetTimeUtc),
                },
            });
            await Promise.all(response.responses.map(async (sendResult, index) => {
                if (!sendResult.success) {
                    const failedTokenDoc = tokensSnapshot.docs[index];
                    await failedTokenDoc.ref.delete();
                }
            }));
        }
        await proposalDoc.ref.update({
            status: 'fired',
            firedAt: firestore_1.Timestamp.now(),
        });
        await roomRef.update({
            status: 'FIRED',
            lastStatusChangeAt: firestore_1.Timestamp.now(),
        });
    }));
});
