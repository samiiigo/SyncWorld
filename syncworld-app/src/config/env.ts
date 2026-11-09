// ──────────────────────────────────────────────
// env.ts — validated, typed access to EXPO_PUBLIC_* environment variables
// SRP: typed env access only — no business logic
//
// Expo inlines EXPO_PUBLIC_* at build time, so each key must be read with a
// literal `process.env.EXPO_PUBLIC_…` expression (no dynamic lookups).
// ──────────────────────────────────────────────

import { z } from 'zod';

const envSchema = z
  .object({
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    /** Run against the in-app simulated backend instead of Firebase + Socket.io. */
    demoMode: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    firebaseApiKey: z.string().min(1).optional(),
    firebaseAuthDomain: z.string().min(1).optional(),
    firebaseProjectId: z.string().min(1).default('demo-syncworld'),
    firebaseStorageBucket: z.string().optional(),
    firebaseMessagingSenderId: z.string().optional(),
    firebaseAppId: z.string().optional(),
    /** Web push (Windows/Mac) VAPID key from Firebase console → Cloud Messaging. */
    firebaseVapidKey: z.string().optional(),
    socketServerUrl: z.string().url().default('http://localhost:3000'),
    /** Host running the Firebase emulators (10.0.2.2 for the Android emulator, LAN IP for devices). */
    emulatorHost: z.string().min(1).default('localhost'),
    /** Override emulator ports when the defaults (firebase.json) are taken. */
    authEmulatorPort: z.coerce.number().int().positive().default(9099),
    firestoreEmulatorPort: z.coerce.number().int().positive().default(8085),
    functionsEmulatorPort: z.coerce.number().int().positive().default(5001),
    useEmulators: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  })
  .transform((env) => {
    const hasRealFirebase = Boolean(env.firebaseApiKey && env.firebaseAppId);
    const useEmulators = env.useEmulators ?? env.environment === 'development';
    return {
      ...env,
      useEmulators,
      // Default to demo mode when there's nothing real to talk to.
      demoMode: env.demoMode ?? (!hasRealFirebase && !useEmulators),
    };
  });

export type EnvConfig = z.output<typeof envSchema>;

let cached: EnvConfig | null = null;

/** Reads and validates environment variables once; throws with the bad keys listed. */
export function loadEnvConfig(): EnvConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT || undefined,
    demoMode: process.env.EXPO_PUBLIC_DEMO_MODE || undefined,
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || undefined,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || undefined,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || undefined,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || undefined,
    firebaseVapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || undefined,
    socketServerUrl: process.env.EXPO_PUBLIC_SOCKET_SERVER_URL || undefined,
    emulatorHost: process.env.EXPO_PUBLIC_EMULATOR_HOST || undefined,
    authEmulatorPort: process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT || undefined,
    firestoreEmulatorPort: process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT || undefined,
    functionsEmulatorPort: process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT || undefined,
    useEmulators: process.env.EXPO_PUBLIC_USE_EMULATORS || undefined,
  });
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid app environment configuration: ${keys}. See syncworld-app/.env.example.`);
  }
  cached = parsed.data;
  return cached;
}
