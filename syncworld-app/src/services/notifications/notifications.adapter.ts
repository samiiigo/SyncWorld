// ──────────────────────────────────────────────
// notifications.adapter.ts — Expo Notifications adapter
// SRP: maps Expo Notifications API to NotificationPort
// LSP: can be replaced by any NotificationPort implementation
// ──────────────────────────────────────────────

import type { NotificationPort } from './notifications.contracts';

/**
 * Creates a concrete NotificationPort backed by expo-notifications.
 *
 * TODO: import * as Notifications from 'expo-notifications';
 * TODO: implement requestPermission using Notifications.requestPermissionsAsync()
 * TODO: implement getExpoPushToken using Notifications.getExpoPushTokenAsync()
 * TODO: implement scheduleLocal using Notifications.scheduleNotificationAsync()
 * TODO: implement cancelLocal using Notifications.cancelScheduledNotificationAsync()
 * TODO: implement onNotificationReceived using Notifications.addNotificationReceivedListener()
 * TODO: implement onNotificationResponse using Notifications.addNotificationResponseReceivedListener()
 * TODO: configure notification channels for Android
 */
export function createNotificationAdapter(): NotificationPort {
  // TODO: implement
  throw new Error('createNotificationAdapter not implemented');
}
