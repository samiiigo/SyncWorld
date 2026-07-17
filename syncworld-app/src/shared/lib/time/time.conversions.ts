// ──────────────────────────────────────────────
// time.conversions.ts — Stub implementations for time operations
// SRP: conversion logic only — delegates to Luxon under the hood
// ──────────────────────────────────────────────

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

export const utcToLocal: UtcToLocalFn = (_utcMs: UTCEpochMs, _tz: IANATimezone): LocalTimeDisplay => {
  // TODO: use Luxon DateTime.fromMillis(utcMs).setZone(tz)
  // TODO: extract time, date, dayOfWeek using Intl.DateTimeFormat parts
  // TODO: compute isDST from Luxon zone info
  throw new Error('utcToLocal not implemented');
};

export const localToUtc: LocalToUtcFn = (
  _year, _month, _day, _hour, _minute, _tz,
): UTCEpochMs => {
  // TODO: construct Luxon DateTime in the given timezone, convert to UTC millis
  // TODO: handle ambiguous times (fall-back DST) by preferring the earlier offset
  throw new Error('localToUtc not implemented');
};

export const nowUtc: NowUtcFn = (): UTCEpochMs => {
  return Date.now() as UTCEpochMs;
};

export const countdownMs: CountdownMsFn = (targetUtc: UTCEpochMs): number => {
  return Math.max(0, targetUtc - nowUtc());
};

export const checkDSTSafety: CheckDSTSafetyFn = (_utcMs: UTCEpochMs, _tz: IANATimezone): DSTCheckResult => {
  // TODO: use Luxon to detect if the local representation of utcMs in tz
  //       falls in a skipped or ambiguous DST window
  // TODO: if skipped, suggest the nearest valid UTC equivalent
  // TODO: if ambiguous, flag and let the UI disambiguate
  throw new Error('checkDSTSafety not implemented');
};

export const formatCountdown: FormatCountdownFn = (_remainingMs: number): string => {
  // TODO: format as "Xh Ym Zs" or "Xm Zs" depending on magnitude
  throw new Error('formatCountdown not implemented');
};

export const getMemberOffsetLabel: GetMemberOffsetLabelFn = (_tz: IANATimezone, _atUtc: UTCEpochMs): string => {
  // TODO: return e.g. "UTC-5" or "UTC+9" for display next to member names
  throw new Error('getMemberOffsetLabel not implemented');
};
