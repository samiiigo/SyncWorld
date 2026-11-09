// ──────────────────────────────────────────────
// identity.state.ts — Identity state shape reference
// SRP: documents the canonical state shape for this feature
// ──────────────────────────────────────────────

// The authoritative state type lives in store/identity.slice.ts.
// This file re-exports it for feature-local convenience and
// documents the rationale behind each field.

export type { IdentityState, IdentityActions } from './state/auth.slice';
export { IDENTITY_INITIAL_STATE } from './state/auth.slice';

/**
 * State Design Notes:
 *
 * - `isBootstrapping` starts true and flips false after the first
 *   auth state check completes. This prevents the app from flashing
 *   a sign-in screen before restoring a cached session.
 *
 * - `timezone` is detected on bootstrap and updated on app foreground.
 *   It is the member's IANA timezone identifier stored in Firestore
 *   so other members can see the offset label.
 *
 * - `isAnonymous` and `isAuthenticated` are derived from Firebase
 *   Auth state but stored explicitly to avoid async checks in
 *   synchronous render paths.
 */
