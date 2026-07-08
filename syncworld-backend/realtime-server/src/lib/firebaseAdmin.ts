import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const options: any = {};
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    options.credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else if (process.env.NODE_ENV === 'test') {
    options.projectId = 'demo-syncworld';
  }
  initializeApp(options);
}

export const firebaseAdminApp = getApps()[0];
export const firebaseAdminAuth = getAuth(firebaseAdminApp);
export const firebaseAdminFirestore = getFirestore(firebaseAdminApp);
