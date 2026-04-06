# features/alarm/

Consensus-locked alarm arming, countdown, and fire lifecycle.

## Responsibility

Manages the alarm lifecycle after voting consensus is reached. Arms the alarm at the agreed-upon UTCEpochMs, displays a timezone-aware countdown per member, schedules a native OS alarm, and handles the fire event and post-fire room state.

## Scope

- Alarm arming after consensus lock
- Countdown timer (ticking display)
- UTC → local time conversion for each member's display
- Native OS alarm scheduling
- Alarm fire detection and event propagation
- Post-fire room lifecycle (LOCKED → FIRED)
- Alarm cancellation (host privilege)
- Push notification for approaching alarm and fire event

## Key State Domains

| State Field | Description |
|-------------|-------------|
| `alarm` | Alarm entity with targetTimeUtc and status |
| `localView` | LocalAlarmView with member-specific display |
| `nativeHandle` | Platform alarm handle for cancellation |
| `countdownMs` | Remaining milliseconds until fire |
| `isTicking` | Whether countdown is actively updating |

## Alarm Lifecycle

```
LOCKED → arm alarm → countdown ticking → fire → FIRED
                                          ↓
                            native alarm triggers
                            push notification sent
                            room status → FIRED

LOCKED → cancel alarm → disarm → OPEN
```

## Inputs / Outputs

**Inputs:**
- ConsensusResult from voting (targetTimeUtc)
- Timer tick events (countdown)
- Native alarm fire callback
- Host cancellation action

**Outputs:**
- LocalAlarmView per member (timezone-aware display)
- Native alarm scheduling
- Push notifications (approaching + fired)
- Room status transition to FIRED

## Data Dependencies

- `services/firebase` (FirestorePort) — alarm document persistence
- `services/alarms` (NativeAlarmPort) — OS-level alarm scheduling
- `services/notifications` (NotificationPort) — push notifications
- `store/alarm.slice` — client-side alarm state
- `lib/time` — UTC→local conversion, countdown formatting, DST checks

## Events / Actions

- `ALARM_ARMED`
- `ALARM_FIRED`
- `ALARM_CANCELLED`
- `ALARM_STATUS_CHANGED`
- `NATIVE_ALARM_SCHEDULED`
- `NATIVE_ALARM_FAILED`

## Edge Cases

- **App in background at fire time** — native alarm + push notification wake user
- **App killed before fire** — native alarm persists; notification triggers relaunch
- **Device reboot between arm and fire** — BOOT_COMPLETED re-registers alarm (Android)
- **DST transition between arm and fire** — UTC source of truth handles this; display updates
- **Native alarm permission denied** — fallback to push notification + in-app countdown
- **Clock skew** — use server timestamp for arm; native alarm uses device clock
- **Multiple devices same user** — each device schedules its own native alarm
- **Alarm in the past** — reject arm if targetTimeUtc < now + MIN_LEAD_TIME_MS
- **Host cancels after partial fire** — guard against cancel after FIRED status

## Integration Points

- **features/voting** — receives ConsensusResult to trigger arming
- **features/rooms** — triggers ROOM_STATUS_CHANGED (LOCKED→FIRED)
- **services/firebase** — alarm document persistence
- **services/alarms** — native OS alarm scheduling
- **services/notifications** — approaching and fired push notifications
- **lib/time** — countdown, local display, DST safety

## Future Implementation Notes

- Snooze functionality
- Recurring alarm scheduling
- Alarm sound customization
- Gradual volume increase before fire
- Alarm acknowledgment tracking per member
- Post-fire room summary screen data
