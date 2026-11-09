// ──────────────────────────────────────────────
// alarm.constants.ts — Alarm domain constants
// SRP: alarm timing constraints and platform limits only
// ──────────────────────────────────────────────

export const ALARM_DEFAULTS = {
  /** Minimum lead time before alarm fires (1 minute) */
  MIN_LEAD_TIME_MS: 60 * 1000,

  /** Maximum future scheduling window (7 days) */
  MAX_FUTURE_MS: 7 * 24 * 60 * 60 * 1000,

  /** Countdown tick interval for active display (1 second) */
  COUNTDOWN_TICK_MS: 1000,

  /** Native alarm scheduling retry limit */
  NATIVE_SCHEDULE_MAX_RETRIES: 3,

  /** Grace period after fire time for late-joiners (10 seconds) */
  POST_FIRE_GRACE_MS: 10 * 1000,
} as const;
