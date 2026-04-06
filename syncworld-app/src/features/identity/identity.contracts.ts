// ──────────────────────────────────────────────
// identity.contracts.ts — Identity feature service contracts
// SRP: identity operation signatures only
// DIP: depends on AuthPort abstraction, not Firebase SDK
// ──────────────────────────────────────────────

import type { UserId, IANATimezone, AsyncResult } from '@types/common';
import type { AuthPort } from '@services/firebase/firebase.contracts';

export type UserProfile = {
  userId: UserId;
  displayName: string | null;
  timezone: IANATimezone;
  createdAt: number;
};

export type IdentityService = {
  bootstrapSession: () => AsyncResult<UserId>;
  getCurrentUserId: () => UserId | null;
  isAuthenticated: () => boolean;
  getProfile: (userId: UserId) => AsyncResult<UserProfile>;
  updateDisplayName: (userId: UserId, name: string) => AsyncResult<void>;
  updateTimezone: (userId: UserId, tz: IANATimezone) => AsyncResult<void>;
  linkProvider: (providerId: string) => AsyncResult<void>;
  detectDeviceTimezone: () => IANATimezone;
};

/**
 * Factory — accepts an AuthPort so the identity feature
 * is decoupled from the concrete Firebase implementation.
 */
export type CreateIdentityService = (deps: {
  authPort: AuthPort;
}) => IdentityService;
