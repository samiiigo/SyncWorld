// ──────────────────────────────────────────────
// alarm.events.ts — Alarm domain events (re-export subset)
// SRP: surfaces only alarm-relevant events
// ──────────────────────────────────────────────

export type { AlarmEvent } from '@app-types/events';

export const ALARM_EVENT_KINDS = [
  'ALARM_ARMED',
  'ALARM_FIRED',
  'ALARM_CANCELLED',
  'ALARM_STATUS_CHANGED',
  'NATIVE_ALARM_SCHEDULED',
  'NATIVE_ALARM_FAILED',
] as const;
