// ──────────────────────────────────────────────
// alarmDevice.ts — this device's side of a shared alarm, on every target.
//
// Spec principle: "Alarms are owned by the device". Once a room locks, each
// device schedules its own alarm at the agreed UTC instant so it fires even
// offline; the backend push (fireAlarms) is the backup and wakes closed apps.
//
// iOS / Android: expo-notifications local notification (DATE trigger, alarm
//                channel on Android) + Expo push token for the backend.
// Web (Windows / Mac): Notification API while the tab is open + FCM web push
//                (service worker) when it is closed. Browsers can't do true OS
//                alarms; this is the closest equivalent.
// ──────────────────────────────────────────────

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { loadEnvConfig } from '@/config/env';
import type { PushRegistration } from '@/features/session/session.types';

const ANDROID_CHANNEL_ID = 'alarms';
const storageKey = (roomId: string) => `syncworld.alarm.${roomId}`;
const webTimers = new Map<string, ReturnType<typeof setTimeout>>();
const isWeb = Platform.OS === 'web';

export type AlarmPermission = 'granted' | 'denied' | 'unsupported';

let handlerInstalled = false;

/** Shows alarm notifications even when the app is in the foreground. */
export function installAlarmNotificationHandler(): void {
  if (isWeb || handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Shared alarms',
    // eslint-disable-next-line import/namespace -- false positive: enum is exported by expo-notifications
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500],
    // eslint-disable-next-line import/namespace -- false positive: enum is exported by expo-notifications
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

/** Ask just before the first create/join, not at launch (spec line 308). */
export async function requestAlarmPermission(): Promise<AlarmPermission> {
  if (isWeb) {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  }
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted ? 'granted' : 'denied';
}

export async function getAlarmPermission(): Promise<AlarmPermission> {
  if (isWeb) {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission === 'granted' ? 'granted' : 'denied';
  }
  return (await Notifications.getPermissionsAsync()).granted ? 'granted' : 'denied';
}

/** Schedules (or reschedules) this device's alarm for a room. */
export async function scheduleLocalAlarm(roomId: string, targetTimeUtc: number, roomName: string): Promise<void> {
  await cancelLocalAlarm(roomId);
  if (targetTimeUtc <= Date.now()) return;
  const title = '⏰ SyncWorld alarm';
  const body = `It's time: ${roomName}`;

  if (isWeb) {
    // setTimeout caps at ~24.8 days; scrubber window is 48h so this is safe.
    const timer = setTimeout(() => {
      webTimers.delete(roomId);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, tag: `syncworld-${roomId}`, requireInteraction: true });
      }
    }, targetTimeUtc - Date.now());
    webTimers.set(roomId, timer);
    return;
  }

  await ensureAndroidChannel();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { roomId, alarmTimeUTC: targetTimeUtc },
      interruptionLevel: 'timeSensitive',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(targetTimeUtc),
      channelId: ANDROID_CHANNEL_ID,
    },
  });
  await AsyncStorage.setItem(storageKey(roomId), id);
}

export async function cancelLocalAlarm(roomId: string): Promise<void> {
  if (isWeb) {
    const timer = webTimers.get(roomId);
    if (timer) clearTimeout(timer);
    webTimers.delete(roomId);
    return;
  }
  const id = await AsyncStorage.getItem(storageKey(roomId));
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    await AsyncStorage.removeItem(storageKey(roomId));
  }
}

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Push registration for the backend's alarm fan-out, or null when this build
 * can't receive remote pushes (Expo Go on Android, web without a VAPID key,
 * no EAS project yet). The local alarm still fires in those cases.
 */
export async function getPushRegistration(): Promise<PushRegistration | null> {
  try {
    if (isWeb) return await getWebPushRegistration();
    const projectId = easProjectId();
    if (!projectId) return null;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data, kind: 'expo', platform: Platform.OS === 'ios' ? 'ios' : 'android' };
  } catch {
    return null;
  }
}

async function getWebPushRegistration(): Promise<PushRegistration | null> {
  const env = loadEnvConfig();
  if (!env.firebaseVapidKey || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  const [{ getMessaging, getToken, isSupported }, { getFirebase }] = await Promise.all([
    import('firebase/messaging'),
    import('@/shared/lib/firebase/firebase.app'),
  ]);
  if (!(await isSupported())) return null;
  const { app } = getFirebase();
  // The service worker can't read build-time env, so pass the public config in the URL.
  const swConfig = encodeURIComponent(JSON.stringify(app.options));
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${swConfig}`);
  const token = await getToken(getMessaging(app), {
    vapidKey: env.firebaseVapidKey,
    serviceWorkerRegistration: registration,
  });
  return token ? { token, kind: 'fcm', platform: 'web' } : null;
}
