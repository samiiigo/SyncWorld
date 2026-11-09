// ──────────────────────────────────────────────
// alarms.adapter.ts — Platform-specific native alarm adapter
// SRP: maps platform alarm APIs to NativeAlarmPort
// LSP: can be replaced by any NativeAlarmPort implementation
// ──────────────────────────────────────────────

import type { NativeAlarmPort } from './alarms.contracts';

/**
 * Creates a concrete NativeAlarmPort for the current platform.
 *
 * TODO: detect platform (iOS vs Android) via Platform.OS
 * TODO: Android: use expo-alarm or native module wrapping AlarmManager
 * TODO: iOS: use UNUserNotificationCenter with time-interval trigger
 * TODO: implement canScheduleExactAlarms for Android 12+ check
 * TODO: implement getScheduledAlarms by maintaining a local registry
 * TODO: handle BOOT_COMPLETED re-registration on Android
 * TODO: handle battery optimization warnings
 */
export function createNativeAlarmAdapter(): NativeAlarmPort {
  // TODO: implement platform-specific logic
  throw new Error('createNativeAlarmAdapter not implemented');
}
