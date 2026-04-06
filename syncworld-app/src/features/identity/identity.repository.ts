// ──────────────────────────────────────────────
// identity.repository.ts — Identity data access layer
// SRP: Firestore read/write for user profile documents only
// DIP: depends on FirestorePort abstraction
// ──────────────────────────────────────────────

import type { UserId, IANATimezone, AsyncResult } from '@types/common';
import type { FirestorePort } from '@services/firebase/firebase.contracts';
import type { UserProfile } from './identity.contracts';

export type IdentityRepository = {
  getProfile: (userId: UserId) => AsyncResult<UserProfile | null>;
  createProfile: (profile: UserProfile) => AsyncResult<void>;
  updateDisplayName: (userId: UserId, name: string) => AsyncResult<void>;
  updateTimezone: (userId: UserId, tz: IANATimezone) => AsyncResult<void>;
};

export type CreateIdentityRepository = (deps: {
  firestorePort: FirestorePort;
}) => IdentityRepository;

/**
 * TODO: implement createIdentityRepository
 * - collection path: 'users/{userId}'
 * - profile doc created on first anonymous sign-in
 * - display name and timezone updated independently
 */
