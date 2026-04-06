// ──────────────────────────────────────────────
// alarm.ts — Alarm entity and scheduling types
// SRP: alarm structure, arm/disarm state, and scheduling metadata only
// ──────────────────────────────────────────────

import type { AlarmId, RoomId, UserId, UTCEpochMs, IANATimezone } from './common';

export type AlarmStatus = 'pending' | 'armed' | 'fired' | 'cancelled';

export type Alarm = {
  id: AlarmId;
  roomId: RoomId;
  targetTimeUtc: UTCEpochMs;
  status: AlarmStatus;
  armedAt: UTCEpochMs | null;
  firedAt: UTCEpochMs | null;
  createdBy: UserId;
};

/** Per-member local alarm representation — derived from Alarm + member timezone */
export type LocalAlarmView = {
  alarmId: AlarmId;
  targetTimeUtc: UTCEpochMs;
  memberTimezone: IANATimezone;
  localDisplayTime: string;
  localDisplayDate: string;
  countdownMs: number;
};

export type ScheduleAlarmPayload = {
  roomId: RoomId;
  targetTimeUtc: UTCEpochMs;
  createdBy: UserId;
};

export type NativeAlarmHandle = {
  platformId: string;
  scheduledAt: UTCEpochMs;
  cancelled: boolean;
};
