// ──────────────────────────────────────────────
// alarm.contracts.ts — Alarm feature service contracts
// SRP: alarm operation signatures only
// DIP: depends on NativeAlarmPort, NotificationPort, FirestorePort abstractions
// ISP: alarm lifecycle separate from scheduling mechanics
// ──────────────────────────────────────────────

import type { RoomId, UserId, UTCEpochMs, IANATimezone, AsyncResult, Unsubscribe } from '@domain/common';
import type { Alarm, LocalAlarmView, AlarmStatus } from '@domain/alarm';

export type AlarmService = {
  armAlarm: (roomId: RoomId, targetTimeUtc: UTCEpochMs, createdBy: UserId) => AsyncResult<Alarm>;
  getAlarm: (roomId: RoomId) => AsyncResult<Alarm | null>;
  cancelAlarm: (roomId: RoomId) => AsyncResult<void>;
  subscribeToAlarm: (roomId: RoomId, cb: (alarm: Alarm | null) => void) => Unsubscribe;
  getLocalView: (alarm: Alarm, timezone: IANATimezone) => LocalAlarmView;
};

export type CountdownService = {
  startCountdown: (targetUtcMs: UTCEpochMs, onTick: (remainingMs: number) => void) => Unsubscribe;
  getRemaining: (targetUtcMs: UTCEpochMs) => number;
};

export type AlarmSchedulingService = {
  scheduleNativeAlarm: (targetUtcMs: UTCEpochMs, label: string) => AsyncResult<string>;
  cancelNativeAlarm: (platformId: string) => AsyncResult<void>;
  scheduleApproachingNotification: (targetUtcMs: UTCEpochMs, leadTimeMs: number) => AsyncResult<void>;
  scheduleFireNotification: (targetUtcMs: UTCEpochMs) => AsyncResult<void>;
};

export type CreateAlarmService = (deps: {
  firestorePort: unknown;
  nativeAlarmPort: unknown;
  notificationPort: unknown;
}) => AlarmService;
