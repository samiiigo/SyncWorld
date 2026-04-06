// ──────────────────────────────────────────────
// alarms.contracts.ts — Native alarm scheduling port
// SRP: alarm scheduling contract only
// DIP: features depend on NativeAlarmPort, not platform APIs
// ISP: separate from notification concerns
// ──────────────────────────────────────────────

import type { AsyncResult, UTCEpochMs } from '@types/common';
import type { NativeAlarmHandle } from '@types/alarm';

export type AlarmPermissionStatus = 'granted' | 'denied' | 'unsupported';

export type ScheduleAlarmOptions = {
  targetUtcMs: UTCEpochMs;
  label: string;
  allowInexact: boolean;
};

export type NativeAlarmPort = {
  scheduleAlarm: (options: ScheduleAlarmOptions) => AsyncResult<NativeAlarmHandle>;
  cancelAlarm: (handle: NativeAlarmHandle) => AsyncResult<void>;
  getScheduledAlarms: () => AsyncResult<NativeAlarmHandle[]>;
  canScheduleExactAlarms: () => AsyncResult<boolean>;
  requestExactAlarmPermission: () => AsyncResult<AlarmPermissionStatus>;
};
