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

/** Scrubber window: now → now + 48h (spec line 226; the realtime server rejects anything outside it). */
export const SCRUBBER_WINDOW_MS = 48 * MS_PER_HOUR;
/** Haptic tick spacing while dragging (spec line 238). */
export const SCRUBBER_TICK_MS = 15 * MS_PER_MINUTE;
/** Max scrubber broadcast rate (spec line 242: no more than every 100ms). */
export const SCRUBBER_THROTTLE_MS = 100;
