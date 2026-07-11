// ──────────────────────────────────────────────
// firebase.auth.adapter.ts — Firebase Auth SDK adapter
// SRP: maps Firebase Auth SDK calls to AuthPort contract
// LSP: can be replaced by any AuthPort implementation
// ──────────────────────────────────────────────

import { 
  getAuth, 
  signInAnonymously as firebaseSignInAnonymously, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import type { AuthPort, AuthUser, AuthStateCallback } from './firebase.contracts';
import type { AsyncResult, Unsubscribe, UserId } from '@domain/common';
import { auth } from '../../config/firebase';

const mapUser = (firebaseUser: FirebaseUser): AuthUser => ({
  uid: firebaseUser.uid as UserId,
  isAnonymous: firebaseUser.isAnonymous,
  displayName: firebaseUser.displayName,
  email: firebaseUser.email,
  providerId: firebaseUser.providerData[0]?.providerId || 'anonymous',
});

export function createFirebaseAuthAdapter(): AuthPort {
  return {
    signInAnonymously: async (): AsyncResult<AuthUser> => {
      try {
        const credential = await firebaseSignInAnonymously(auth);
        return { ok: true, value: mapUser(credential.user) };
      } catch (error: any) {
        return { ok: false, error: error.message || 'Failed to sign in anonymously' };
      }
    },
    
    onAuthStateChanged: (cb: AuthStateCallback): Unsubscribe => {
      return firebaseOnAuthStateChanged(auth, (user) => {
        cb(user ? mapUser(user) : null);
      });
    },

    linkWithProvider: async (providerId: string): AsyncResult<AuthUser> => {
      // Stub for now, can implement specific providers later
      return { ok: false, error: 'Not implemented' };
    },

    signOut: async (): AsyncResult<void> => {
      try {
        await firebaseSignOut(auth);
        return { ok: true, value: undefined };
      } catch (error: any) {
        return { ok: false, error: error.message || 'Failed to sign out' };
      }
    },

    getCurrentUser: (): AuthUser | null => {
      const user = auth.currentUser;
      return user ? mapUser(user) : null;
    }
  };
}
