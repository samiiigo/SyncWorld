"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseAdminMessaging = exports.firebaseAdminFirestore = exports.firebaseAdminAuth = exports.firebaseAdminApp = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
if (!(0, app_1.getApps)().length) {
    const options = {};
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        options.credential = (0, app_1.cert)(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
    }
    else if (process.env.NODE_ENV === 'test') {
        options.projectId = 'demo-syncworld';
    }
    (0, app_1.initializeApp)(options);
}
exports.firebaseAdminApp = (0, app_1.getApps)()[0];
exports.firebaseAdminAuth = (0, auth_1.getAuth)(exports.firebaseAdminApp);
exports.firebaseAdminFirestore = (0, firestore_1.getFirestore)(exports.firebaseAdminApp);
exports.firebaseAdminMessaging = (0, messaging_1.getMessaging)(exports.firebaseAdminApp);
