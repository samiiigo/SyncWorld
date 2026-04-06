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
  // TODO: read from expo-constants or react-native-config
  // TODO: validate all required keys are present
  // TODO: throw descriptive error on missing env vars
  throw new Error('loadEnvConfig not implemented');
}
