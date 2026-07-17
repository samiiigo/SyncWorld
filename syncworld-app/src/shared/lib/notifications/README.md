# services/notifications/

Push notification and in-app event notification layer.

## Responsibility

Abstracts push notification registration, permission handling, and notification dispatch behind a `NotificationPort`. Feature modules request notifications through this port without coupling to Expo Notifications or FCM directly (DIP).

## Architecture

```
notifications.contracts.ts  ← NotificationPort definition
notifications.adapter.ts    ← Expo Notifications adapter
notifications.events.ts     ← Notification event catalog
```

## Contracts (NotificationPort)

- `requestPermission()` — prompt user for notification permission
- `getExpoPushToken()` — retrieve device push token
- `scheduleLocal(payload)` — schedule a local notification
- `cancelLocal(id)` — cancel a scheduled local notification
- `onNotificationReceived(handler)` — foreground notification handler
- `onNotificationResponse(handler)` — user tap/interaction handler
- `setBadgeCount(count)` — update app badge

## Notification Events

Defined in `notifications.events.ts`:
- `VOTE_REQUESTED` — prompt member to vote on a proposal
- `ALARM_APPROACHING` — countdown warning before alarm fires
- `ALARM_FIRED` — alarm has triggered
- `ROOM_STATUS_CHANGED` — room moved to a new FSM state
- `MEMBER_JOINED` — new member entered the room

## Integration Points

- **features/voting** — triggers VOTE_REQUESTED notification
- **features/alarm** — triggers ALARM_APPROACHING and ALARM_FIRED
- **features/rooms** — triggers ROOM_STATUS_CHANGED and MEMBER_JOINED
- **services/firebase** — push token sent to Firestore for server-side FCM dispatch
