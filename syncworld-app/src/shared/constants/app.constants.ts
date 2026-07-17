// ──────────────────────────────────────────────
// app.constants.ts — Application-wide constants
// SRP: cross-cutting app constants only (no domain logic)
// ──────────────────────────────────────────────

export const APP = {
  NAME: 'SyncWorld',
  VERSION: '0.0.1',
  DEFAULT_LOCALE: 'en-US',
} as const;

export const NETWORK = {
  /** Socket.io reconnection attempts before surfacing an error */
  SOCKET_RECONNECT_ATTEMPTS: 5,

  /** Socket.io reconnection delay base in ms */
  SOCKET_RECONNECT_DELAY_MS: 1000,

  /** Firestore listener debounce window in ms */
  FIRESTORE_DEBOUNCE_MS: 300,

  /** HTTP request timeout for REST calls */
  HTTP_TIMEOUT_MS: 15_000,
} as const;

export const PRESENCE = {
  /** Heartbeat interval to maintain online status */
  HEARTBEAT_INTERVAL_MS: 30_000,

  /** Time after last heartbeat before marking member as disconnected */
  DISCONNECT_THRESHOLD_MS: 90_000,
} as const;
