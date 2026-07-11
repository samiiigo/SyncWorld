// ──────────────────────────────────────────────
// env.ts — Environment variable access with validation
// SRP: typed env access only — no business logic
// DIP: consumers depend on this abstraction, not process.env directly
// ──────────────────────────────────────────────

type EnvConfig = {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  socketServerUrl: string;
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
};

/**
 * Reads and validates environment variables.
 * TODO: implement runtime validation (e.g., zod) to fail fast on missing vars
 */
export function loadEnvConfig(): EnvConfig {
  return {
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-key',
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-syncworld',
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
    socketServerUrl: process.env.EXPO_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3000',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/demo-syncworld/us-central1',
    environment: (process.env.EXPO_PUBLIC_ENVIRONMENT as any) || 'development',
  };
}
