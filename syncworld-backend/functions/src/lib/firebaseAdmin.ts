import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({
    credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : undefined,
  });
}

export const firebaseAdminApp = getApps()[0];
export const firebaseAdminAuth = getAuth(firebaseAdminApp);
export const firebaseAdminFirestore = getFirestore(firebaseAdminApp);
export const firebaseAdminMessaging = getMessaging(firebaseAdminApp);
