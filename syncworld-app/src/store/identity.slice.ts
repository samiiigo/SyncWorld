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

import { create } from 'zustand';
import { createFirebaseAuthAdapter } from '../services/firebase/firebase.auth.adapter';

const authAdapter = createFirebaseAuthAdapter();

export const useIdentityStore = create<IdentityState & IdentityActions>((set, get) => {
  // Set up auth state listener once during store creation
  authAdapter.onAuthStateChanged((user) => {
    if (user) {
      set({ 
        userId: user.uid, 
        isAuthenticated: !user.isAnonymous,
        isAnonymous: user.isAnonymous,
        displayName: user.displayName,
        isBootstrapping: false
      });
    } else {
      set({ ...IDENTITY_INITIAL_STATE, isBootstrapping: false });
    }
  });

  return {
    ...IDENTITY_INITIAL_STATE,
    bootstrapAnonymousSession: async () => {
      set({ isBootstrapping: true, error: null });
      
      // Attempt anonymous sign-in if no user is present
      const currentUser = authAdapter.getCurrentUser();
      if (!currentUser) {
        const result = await authAdapter.signInAnonymously();
        if (!result.ok) {
          set({ error: result.error, isBootstrapping: false });
          return;
        }
      }

      // Automatically capture timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone as IANATimezone;
      set({ timezone: tz });
    },
    linkAuthProvider: async (_provider) => { /* TODO */ },
    setDisplayName: (name) => {
      set({ displayName: name });
    },
    setTimezone: (tz) => { 
      set({ timezone: tz });
    },
    clearSession: async () => { 
      await authAdapter.signOut();
      set({ ...IDENTITY_INITIAL_STATE, isBootstrapping: false });
    },
  };
});
