// ──────────────────────────────────────────────
// calendarEvent.ts — turn an agreed room time into a calendar event that
// works in any calendar app: an RFC 5545 .ics file (Apple, Outlook desktop,
// Thunderbird, Proton…) plus "add event" links for Google and Outlook web.
// Pure functions, no platform code; see addToCalendar.ts for the actions.
// ──────────────────────────────────────────────

export type CalendarEventInput = {
  /** Stable id, e.g. the room id. Re-importing replaces the event instead of duplicating it. */
  uid: string;
  title: string;
  /** Agreed moment, UTC epoch ms. */
  startUtc: number;
  durationMin?: number;
  description?: string;
  /** Meeting link (Meet, Zoom, Teams…) or the room invite link. */
  url?: string;
  /** Override "now" for DTSTAMP (tests). */
  nowUtc?: number;
};

export const DEFAULT_DURATION_MIN = 30;

const pad = (n: number) => String(n).padStart(2, '0');

/** 20261116T050000Z, the UTC basic format used by .ics and Google. */
export function toIcsUtc(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape TEXT values (RFC 5545 §3.3.11). */
export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1), never splitting a UTF-8 character. */
export function foldIcsLine(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    // The first line holds 75 octets; continuation lines start with a space, so 74.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function endUtc(e: CalendarEventInput): number {
  return e.startUtc + (e.durationMin ?? DEFAULT_DURATION_MIN) * 60_000;
}

function fullDescription(e: CalendarEventInput): string {
  return [e.description, e.url].filter(Boolean).join('\n\n');
}

/** A complete .ics file. The VALARM makes the calendar ring as a second, independent alarm. */
export function buildIcs(e: CalendarEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SyncWorld//Room//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}@syncworld.app`,
    `DTSTAMP:${toIcsUtc(e.nowUtc ?? Date.now())}`,
    `DTSTART:${toIcsUtc(e.startUtc)}`,
    `DTEND:${toIcsUtc(endUtc(e))}`,
    `SUMMARY:${escapeIcsText(e.title)}`,
  ];
  const desc = fullDescription(e);
  if (desc) lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
  if (e.url) {
    lines.push(`URL:${e.url}`);
    lines.push(`LOCATION:${escapeIcsText(e.url)}`);
  }
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(e.title)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/** Google Calendar "add event" page, prefilled. Works signed in to any Google account. */
export function googleCalendarUrl(e: CalendarEventInput): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toIcsUtc(e.startUtc)}/${toIcsUtc(endUtc(e))}`,
  });
  const desc = fullDescription(e);
  if (desc) q.set('details', desc);
  if (e.url) q.set('location', e.url);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Outlook on the web compose page. `work` targets Microsoft 365 accounts instead of outlook.com. */
export function outlookCalendarUrl(e: CalendarEventInput, work = false): string {
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: new Date(e.startUtc).toISOString(),
    enddt: new Date(endUtc(e)).toISOString(),
  });
  const desc = fullDescription(e);
  if (desc) q.set('body', desc);
  if (e.url) q.set('location', e.url);
  const host = work ? 'https://outlook.office.com' : 'https://outlook.live.com';
  return `${host}/calendar/0/deeplink/compose?${q.toString()}`;
}

/** File name for the .ics download: letters and digits only. */
export function icsFileName(title: string): string {
  const base = title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'syncworld';
  return `${base}.ics`;
}
