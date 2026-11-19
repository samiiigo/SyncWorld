// ──────────────────────────────────────────────
// firebase.app.ts — lazy Firebase initialization for every target.
//
// Lazy so demo mode never touches Firebase, and so the module can be
// imported on web (Windows/Mac), iOS and Android alike:
// - native: auth persists in AsyncStorage (React Native build of firebase/auth)
// - web: auth persists in IndexedDB (browser default)
// ──────────────────────────────────────────────

import { Platform } from 'react-native';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadEnvConfig } from '@/config/env';

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
};

let services: FirebaseServices | null = null;

function createAuth(app: FirebaseApp): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  // getReactNativePersistence only exists in the react-native build of
  // firebase/auth (Metro resolves it via the "react-native" export condition);
  // the default typings don't declare it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialized (fast refresh).
    return getAuth(app);
  }
}

export function getFirebase(): FirebaseServices {
  if (services) return services;
  const env = loadEnvConfig();

  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: env.firebaseApiKey ?? 'demo-api-key',
        authDomain: env.firebaseAuthDomain ?? `${env.firebaseProjectId}.firebaseapp.com`,
        projectId: env.firebaseProjectId,
        storageBucket: env.firebaseStorageBucket,
        messagingSenderId: env.firebaseMessagingSenderId,
        appId: env.firebaseAppId ?? '1:000000000000:web:demo',
      });

  const auth = createAuth(app);
  const firestore = getFirestore(app);
  const functions = getFunctions(app);

  if (env.useEmulators) {
    const host = env.emulatorHost;
    try {
      connectAuthEmulator(auth, `http://${host}:${env.authEmulatorPort}`, { disableWarnings: true });
      connectFirestoreEmulator(firestore, host, env.firestoreEmulatorPort);
      connectFunctionsEmulator(functions, host, env.functionsEmulatorPort);
    } catch {
      // Already connected (fast refresh).
    }
  }

  services = { app, auth, firestore, functions };
  return services;
}
