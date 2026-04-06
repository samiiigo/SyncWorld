# services/alarms/

Native alarm scheduling abstraction.

## Responsibility

Provides a platform-agnostic contract for scheduling OS-level alarms that survive app termination. This is distinct from `services/notifications` which handles push/local notifications — this module specifically targets the native alarm/timer APIs.

## Architecture

```
alarms.contracts.ts  ← NativeAlarmPort definition
alarms.adapter.ts    ← Platform-specific adapter shell
```

## Contracts (NativeAlarmPort)

- `scheduleAlarm(targetUtcMs, label)` — register a native alarm
- `cancelAlarm(handle)` — cancel a previously scheduled alarm
- `getScheduledAlarms()` — list pending alarms
- `canScheduleExactAlarms()` — check platform permission (Android 12+)
- `requestExactAlarmPermission()` — prompt for exact alarm permission

## Platform Considerations

### Android
- Android 12+ requires `SCHEDULE_EXACT_ALARM` permission
- AlarmManager for exact-time alarms
- WorkManager as fallback for inexact scheduling

### iOS
- UNUserNotificationCenter for time-based triggers
- Background fetch as supplementary wake mechanism
- Critical alerts entitlement for alarm-class notifications

## Failure Modes

- **Permission denied** — fallback to inexact alarm + prominent in-app countdown
- **App killed by OS** — native alarm persists; notification triggers re-launch
- **Device reboot** — re-register alarms via BOOT_COMPLETED receiver (Android)
- **Battery optimization** — document user guidance for disabling battery optimization

## Integration Points

- **features/alarm** — primary consumer; arms/cancels native alarms
- **services/notifications** — complementary: notification fires alongside native alarm
