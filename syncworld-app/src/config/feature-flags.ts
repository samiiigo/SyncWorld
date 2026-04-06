// ──────────────────────────────────────────────
// feature-flags.ts — Feature flag definitions
// SRP: flag declarations only — no evaluation logic
// OCP: add new flags without modifying existing ones
// ──────────────────────────────────────────────

type FeatureFlags = {
  /** Enable Socket.io scrubber sync (false = Firestore polling fallback) */
  enableRealtimeScrubber: boolean;

  /** Enable push notifications for vote prompts */
  enableVoteNotifications: boolean;

  /** Enable native alarm scheduling (false = in-app countdown only) */
  enableNativeAlarms: boolean;

  /** Enable anonymous session auto-creation */
  enableAnonymousAuth: boolean;

  /** Enable host override for proposal creation */
  enableHostOverride: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableRealtimeScrubber: true,
  enableVoteNotifications: true,
  enableNativeAlarms: true,
  enableAnonymousAuth: true,
  enableHostOverride: false,
};

/**
 * Resolves active feature flags from remote config or local defaults.
 * TODO: integrate with Firebase Remote Config or a feature flag service
 */
export function resolveFeatureFlags(): FeatureFlags {
  // TODO: merge remote overrides with DEFAULT_FEATURE_FLAGS
  return { ...DEFAULT_FEATURE_FLAGS };
}
