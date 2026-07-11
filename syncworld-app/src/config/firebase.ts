import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { loadEnvConfig } from './env';

const env = loadEnvConfig();

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId,
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const auth = getAuth();
const firestore = getFirestore();
const functions = getFunctions();

if (env.environment === 'development') {
  // In dev, assuming Android emulator (10.0.2.2) or local web/iOS (localhost)
  const host = 'localhost'; 
  
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(firestore, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
  } catch (e) {
    console.warn('Firebase emulators already connected');
  }
}

export { auth, firestore, functions };
