// ──────────────────────────────────────────────
// addToCalendar.ts — the three "add to calendar" actions, per platform.
// - Google / Outlook: open the prefilled web page (any account, no sign-in to SyncWorld).
// - Other calendar (.ics): web downloads the file; native writes it to the
//   cache and opens the share sheet, where Calendar / Outlook / Proton etc. import it.
// ──────────────────────────────────────────────

import { Linking, Platform } from 'react-native';

import {
  buildIcs,
  type CalendarEventInput,
  googleCalendarUrl,
  icsFileName,
  outlookCalendarUrl,
} from './calendarEvent';

export type CalendarTarget = 'google' | 'outlook' | 'ics';

async function openUrl(url: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function exportIcs(event: CalendarEventInput): Promise<boolean> {
  const ics = buildIcs(event);
  const name = icsFileName(event.title);

  if (Platform.OS === 'web') {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return true;
  }

  try {
    // Loaded lazily so web bundles never pull the native modules.
    const { File, Paths } = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(ics);
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', UTI: 'com.apple.ical.ics', dialogTitle: event.title });
    return true;
  } catch {
    return false;
  }
}

export async function addToCalendar(target: CalendarTarget, event: CalendarEventInput): Promise<boolean> {
  if (target === 'google') return openUrl(googleCalendarUrl(event));
  if (target === 'outlook') return openUrl(outlookCalendarUrl(event));
  return exportIcs(event);
}
