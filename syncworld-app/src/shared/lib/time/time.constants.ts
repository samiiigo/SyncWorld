// ──────────────────────────────────────────────
// time.constants.ts — Time unit constants and bounds
// SRP: numeric time constants only
// ──────────────────────────────────────────────

export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export const SCRUBBER_STEP_MS = 5 * MS_PER_MINUTE;
export const SCRUBBER_MIN_OFFSET_MS = 1 * MS_PER_MINUTE;
export const SCRUBBER_MAX_OFFSET_MS = 7 * MS_PER_DAY;
