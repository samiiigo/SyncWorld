// ──────────────────────────────────────────────
// time.contracts.ts — Time conversion and formatting contracts
// SRP: function signatures for time operations only
// DIP: consumers depend on these signatures, not on Luxon directly
// ──────────────────────────────────────────────

import type { UTCEpochMs, IANATimezone } from '@types/common';

/** Formatted local time representation */
export type LocalTimeDisplay = {
  time: string;
  date: string;
  dayOfWeek: string;
  timezone: string;
  offsetLabel: string;
  isDST: boolean;
};

/** Result of a DST safety check */
export type DSTCheckResult = {
  isAmbiguous: boolean;
  isSkipped: boolean;
  suggestedUtc: UTCEpochMs | null;
  warning: string | null;
};

// ── Conversion contracts ──

export type UtcToLocalFn = (utcMs: UTCEpochMs, tz: IANATimezone) => LocalTimeDisplay;

export type LocalToUtcFn = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: IANATimezone,
) => UTCEpochMs;

export type NowUtcFn = () => UTCEpochMs;

export type CountdownMsFn = (targetUtc: UTCEpochMs) => number;

export type CheckDSTSafetyFn = (utcMs: UTCEpochMs, tz: IANATimezone) => DSTCheckResult;

export type FormatCountdownFn = (remainingMs: number) => string;

export type GetMemberOffsetLabelFn = (tz: IANATimezone, atUtc: UTCEpochMs) => string;
