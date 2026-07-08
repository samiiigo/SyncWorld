// ──────────────────────────────────────────────
// notifications.contracts.ts — Push notification port definition
// SRP: notification contract only — no SDK coupling
// DIP: features depend on NotificationPort
// ISP: separate from alarm scheduling (services/alarms handles that)
// ──────────────────────────────────────────────

import type { AsyncResult, Unsubscribe } from '@app-types/common';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type LocalNotificationPayload = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  triggerMs?: number;
};

export type NotificationReceivedPayload = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export type NotificationResponsePayload = {
  notificationId: string;
  actionId: string;
  data: Record<string, unknown>;
};

export type NotificationPort = {
  requestPermission: () => AsyncResult<NotificationPermissionStatus>;
  getExpoPushToken: () => AsyncResult<string>;
  scheduleLocal: (payload: LocalNotificationPayload) => AsyncResult<string>;
  cancelLocal: (id: string) => AsyncResult<void>;
  cancelAllLocal: () => AsyncResult<void>;
  onNotificationReceived: (handler: (payload: NotificationReceivedPayload) => void) => Unsubscribe;
  onNotificationResponse: (handler: (payload: NotificationResponsePayload) => void) => Unsubscribe;
  setBadgeCount: (count: number) => AsyncResult<void>;
};
