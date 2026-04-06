// ──────────────────────────────────────────────
// alarm.slice.ts — Alarm entity and countdown state
// SRP: alarm lifecycle, countdown, and native alarm handle only
// ──────────────────────────────────────────────

import type { RoomId, UTCEpochMs } from '@types/common';
import type { Alarm, LocalAlarmView, NativeAlarmHandle, AlarmStatus } from '@types/alarm';

// ── State Shape ──

export type AlarmState = {
  alarm: Alarm | null;
  localView: LocalAlarmView | null;
  nativeHandle: NativeAlarmHandle | null;
  countdownMs: number;
  isTicking: boolean;
  error: string | null;
};

// ── Actions ──

export type AlarmActions = {
  armAlarm: (roomId: RoomId, targetTimeUtc: UTCEpochMs) => Promise<void>;
  updateCountdown: (ms: number) => void;
  setNativeHandle: (handle: NativeAlarmHandle) => void;
  handleAlarmFired: () => void;
  cancelAlarm: () => Promise<void>;
  updateStatus: (status: AlarmStatus) => void;
  resetAlarm: () => void;
};

// ── Initial State ──

export const ALARM_INITIAL_STATE: AlarmState = {
  alarm: null,
  localView: null,
  nativeHandle: null,
  countdownMs: 0,
  isTicking: false,
  error: null,
};

// TODO: export const useAlarmStore = create<AlarmState & AlarmActions>((set, get) => ({
//   ...ALARM_INITIAL_STATE,
//   armAlarm: async (_roomId, _targetTimeUtc) => { /* TODO */ },
//   updateCountdown: (_ms) => { /* TODO */ },
//   setNativeHandle: (_handle) => { /* TODO */ },
//   handleAlarmFired: () => { /* TODO */ },
//   cancelAlarm: async () => { /* TODO */ },
//   updateStatus: (_status) => { /* TODO */ },
//   resetAlarm: () => { /* TODO */ },
// }));
