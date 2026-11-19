// ──────────────────────────────────────────────
// identity.slice.ts — Identity & session state
// SRP: auth status, user ID, and session lifecycle only
// ──────────────────────────────────────────────

import type { UserId, SessionId, IANATimezone } from '@domain/common';

// ── State Shape ──

export type IdentityState = {
  userId: UserId | null;
  sessionId: SessionId | null;
  isAnonymous: boolean;
  isAuthenticated: boolean;
  displayName: string | null;
  timezone: IANATimezone | null;
  isBootstrapping: boolean;
  error: string | null;
};

// ── Actions ──

export type IdentityActions = {
  bootstrapAnonymousSession: () => Promise<void>;
  linkAuthProvider: (provider: string) => Promise<void>;
  setDisplayName: (name: string) => void;
  setTimezone: (tz: IANATimezone) => void;
  clearSession: () => void;
};

// ── Initial State ──

export const IDENTITY_INITIAL_STATE: IdentityState = {
  userId: null,
  sessionId: null,
  isAnonymous: false,
  isAuthenticated: false,
  displayName: null,
  timezone: null,
  isBootstrapping: true,
  error: null,
};

// ── Runtime store ──
// The live implementation moved to the session engine:
//   src/features/session/session.store.ts (persisted profile + rooms)
//   src/features/session/backends/*.backend.ts (Firebase/Socket.io or demo)
// consumed through AppContext. These types remain as the feature contract.
