// ──────────────────────────────────────────────
// firebase.auth.adapter.ts — Firebase Auth SDK adapter
// SRP: maps Firebase Auth SDK calls to AuthPort contract
// LSP: can be replaced by any AuthPort implementation
// ──────────────────────────────────────────────

import type { AuthPort } from './firebase.contracts';

/**
 * Creates a concrete AuthPort backed by Firebase Auth.
 *
 * TODO: import { getAuth, signInAnonymously, onAuthStateChanged, linkWithCredential } from 'firebase/auth';
 * TODO: map SDK responses to Result<AuthUser> shape
 * TODO: handle network errors and auth/invalid-credential errors
 * TODO: handle token refresh lifecycle
 */
export function createFirebaseAuthAdapter(): AuthPort {
  // TODO: initialize with getAuth(firebaseApp)
  throw new Error('createFirebaseAuthAdapter not implemented');
}
