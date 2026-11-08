"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWithinRateLimit = assertWithinRateLimit;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("./firebaseAdmin");
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
async function assertWithinRateLimit(uid, key, maxRequests) {
    const rateLimitRef = firebaseAdmin_1.firebaseAdminFirestore.collection('rate_limits').doc(`${uid}:${key}`);
    await firebaseAdmin_1.firebaseAdminFirestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(rateLimitRef);
        const now = Date.now();
        if (!snapshot.exists) {
            transaction.set(rateLimitRef, {
                windowStartMs: now,
                count: 1,
                updatedAt: firestore_1.Timestamp.now(),
            });
            return;
        }
        const data = snapshot.data();
        const windowStartMs = data.windowStartMs ?? now;
        const count = data.count ?? 0;
        if (now - windowStartMs >= RATE_LIMIT_WINDOW_MS) {
            transaction.set(rateLimitRef, {
                windowStartMs: now,
                count: 1,
                updatedAt: firestore_1.Timestamp.now(),
            });
            return;
        }
        if (count >= maxRequests) {
            throw new https_1.HttpsError('resource-exhausted', 'Rate limit exceeded for this action.');
        }
        transaction.update(rateLimitRef, {
            count: count + 1,
            updatedAt: firestore_1.Timestamp.now(),
        });
    });
}
