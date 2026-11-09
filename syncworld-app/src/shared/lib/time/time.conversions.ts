// ──────────────────────────────────────────────
// time.conversions.ts — UTC ⇄ local conversions, DST checks and formatting.
//
// UTC epoch milliseconds are the only source of truth (spec "Time Model").
// Everything here converts *for display* using the device's IANA rules via
// Luxon (Intl under the hood), so DST is handled per zone, per instant.
// ──────────────────────────────────────────────

import { DateTime, IANAZone } from 'luxon';

import type { UTCEpochMs, IANATimezone } from '@domain/common';
import type {
  LocalTimeDisplay,
  DSTCheckResult,
  UtcToLocalFn,
  LocalToUtcFn,
  NowUtcFn,
  CountdownMsFn,
  CheckDSTSafetyFn,
  FormatCountdownFn,
  GetMemberOffsetLabelFn,
} from './time.contracts';
import { MS_PER_HOUR, MS_PER_MINUTE } from './time.constants';

const UTC_ZONE = 'UTC';

/** Normalizes an unknown/invalid zone to UTC instead of throwing mid-render. */
function safeZone(tz: string): string {
  return IANAZone.isValidZone(tz) ? tz : UTC_ZONE;
}

/** Offset of `tz` at instant `ms`, in minutes east of UTC. */
export function zoneOffsetMinutes(tz: string, ms: number): number {
  return IANAZone.create(safeZone(tz)).offset(ms);
}

/** The device's IANA zone (spec: stored at onboarding, never a raw offset). */
export function deviceTimezone(): IANATimezone {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (tz && IANAZone.isValidZone(tz) ? tz : UTC_ZONE) as IANATimezone;
  } catch {
    return UTC_ZONE as IANATimezone;
  }
}

export function isValidTimezone(tz: string): boolean {
  return IANAZone.isValidZone(tz);
}

function formatOffset(minutes: number): string {
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

export const utcToLocal: UtcToLocalFn = (utcMs: UTCEpochMs, tz: IANATimezone): LocalTimeDisplay => {
  const zone = safeZone(tz);
  const dt = DateTime.fromMillis(utcMs, { zone });
  return {
    time: dt.toFormat('h:mm a'),
    date: dt.toFormat('LLL d'),
    dayOfWeek: dt.toFormat('ccc'),
    timezone: zone,
    offsetLabel: formatOffset(dt.offset),
    isDST: dt.isInDST,
  };
};

/**
 * Candidate instants for a wall-clock time in `tz`. Zero candidates means the
 * time falls in a spring-forward gap; two means a fall-back overlap.
 */
function wallTimeCandidates(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): number[] {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Offsets in effect around this wall time (any DST transition is < 24h wide).
  const offsets = new Set([
    zoneOffsetMinutes(tz, wallAsUtc - 24 * MS_PER_HOUR),
    zoneOffsetMinutes(tz, wallAsUtc),
    zoneOffsetMinutes(tz, wallAsUtc + 24 * MS_PER_HOUR),
  ]);
  const candidates: number[] = [];
  offsets.forEach((offset) => {
    const instant = wallAsUtc - offset * MS_PER_MINUTE;
    if (zoneOffsetMinutes(tz, instant) === offset) candidates.push(instant);
  });
  return candidates.sort((a, b) => a - b);
}

export const localToUtc: LocalToUtcFn = (year, month, day, hour, minute, tz): UTCEpochMs => {
  const zone = safeZone(tz);
  const candidates = wallTimeCandidates(year, month, day, hour, minute, zone);
  if (candidates.length > 0) {
    // Fall-back overlap: prefer the earlier instant (time.dst-edge-cases CASE 2).
    return candidates[0] as UTCEpochMs;
  }
  // Spring-forward gap: the wall time never exists; move forward past the gap
  // (2:30 AM on spring-forward day becomes 3:30 AM), matching Luxon/ICU behavior.
  return DateTime.fromObject({ year, month, day, hour, minute }, { zone }).toMillis() as UTCEpochMs;
};

/** Checks a local wall-clock time a member picked (e.g. typed "2:30 AM"). */
export function checkLocalWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: IANATimezone,
): DSTCheckResult {
  const zone = safeZone(tz);
  const candidates = wallTimeCandidates(year, month, day, hour, minute, zone);
  if (candidates.length === 0) {
    const suggestedUtc = localToUtc(year, month, day, hour, minute, tz);
    return {
      isAmbiguous: false,
      isSkipped: true,
      suggestedUtc,
      warning: `This time doesn't exist in ${zone} (clocks spring forward). Using ${utcToLocal(suggestedUtc, tz).time} instead.`,
    };
  }
  if (candidates.length > 1) {
    return {
      isAmbiguous: true,
      isSkipped: false,
      suggestedUtc: candidates[0] as UTCEpochMs,
      warning: `This time happens twice in ${zone} (clocks fall back). Using the first occurrence.`,
    };
  }
  return { isAmbiguous: false, isSkipped: false, suggestedUtc: null, warning: null };
}

/**
 * For an instant on the scrubber, flags whether its local reading in `tz` is
 * ambiguous (the same wall time occurs twice). Instants can never be "skipped".
 */
export const checkDSTSafety: CheckDSTSafetyFn = (utcMs: UTCEpochMs, tz: IANATimezone): DSTCheckResult => {
  const zone = safeZone(tz);
  const dt = DateTime.fromMillis(utcMs, { zone });
  const candidates = wallTimeCandidates(dt.year, dt.month, dt.day, dt.hour, dt.minute, zone);
  if (candidates.length > 1) {
    return {
      isAmbiguous: true,
      isSkipped: false,
      suggestedUtc: null,
      warning: `${dt.toFormat('h:mm a')} happens twice in ${zone} that night (clocks fall back). This is the ${
        utcMs === candidates[0] ? 'first' : 'second'
      } one (${formatOffset(dt.offset)}).`,
    };
  }
  return { isAmbiguous: false, isSkipped: false, suggestedUtc: null, warning: null };
};

export const nowUtc: NowUtcFn = (): UTCEpochMs => Date.now() as UTCEpochMs;

export const countdownMs: CountdownMsFn = (targetUtc: UTCEpochMs): number => Math.max(0, targetUtc - nowUtc());

export const formatCountdown: FormatCountdownFn = (remainingMs: number): string => {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
};

export const getMemberOffsetLabel: GetMemberOffsetLabelFn = (tz: IANATimezone, atUtc: UTCEpochMs): string =>
  formatOffset(zoneOffsetMinutes(tz, atUtc));

// ── Display helpers used by the scrubber, member list and armed screen ──

/** Local hour of day as a float (14.5 = 2:30 PM) in `tz` at `utcMs`. */
export function localHourFloat(utcMs: number, tz: string): number {
  const dt = DateTime.fromMillis(utcMs, { zone: safeZone(tz) });
  return dt.hour + dt.minute / 60;
}

export type DayPeriod = 'sleep' | 'business' | 'evening';

/** Prototype bands: sleep 22:00–06:00, business 06:00–18:00, evening 18:00–22:00. */
export function periodForHour(hour: number): DayPeriod {
  const h = ((hour % 24) + 24) % 24;
  if (h < 6 || h >= 22) return 'sleep';
  if (h < 18) return 'business';
  return 'evening';
}

export function periodAt(utcMs: number, tz: string): DayPeriod {
  return periodForHour(localHourFloat(utcMs, tz));
}

/** Spec line 229: warn when a proposed time is 11 PM–6 AM for anyone. */
export function isLateNight(utcMs: number, tz: string): boolean {
  const h = localHourFloat(utcMs, tz);
  return h >= 23 || h < 6;
}

/** "2:30 PM" in `tz`. */
export function formatLocalTime(utcMs: number, tz: string): string {
  return DateTime.fromMillis(utcMs, { zone: safeZone(tz) }).toFormat('h:mm a');
}

/** "14:30 UTC". */
export function formatUtcClock(utcMs: number): string {
  return `${DateTime.fromMillis(utcMs, { zone: UTC_ZONE }).toFormat('HH:mm')} UTC`;
}

/** "Today", "Tomorrow", "Yesterday" or a weekday, relative to `nowMs` in `tz`. */
export function relativeDayLabel(utcMs: number, tz: string, nowMs: number = Date.now()): string {
  const zone = safeZone(tz);
  const target = DateTime.fromMillis(utcMs, { zone }).startOf('day');
  const today = DateTime.fromMillis(nowMs, { zone }).startOf('day');
  const diff = Math.round(target.diff(today, 'days').days);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return target.toFormat('ccc');
}

/** Short city label from an IANA id: "America/New_York" → "New York". */
export function cityFromTimezone(tz: string): string {
  const last = tz.split('/').pop() ?? tz;
  return last.replace(/_/g, ' ');
}

/** Rounds to the nearest `stepMs` (scrubber snaps to 5 minutes). */
export function snapTo(utcMs: number, stepMs: number): number {
  return Math.round(utcMs / stepMs) * stepMs;
}
