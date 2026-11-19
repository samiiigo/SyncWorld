import {
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  googleCalendarUrl,
  icsFileName,
  outlookCalendarUrl,
  toIcsUtc,
} from '../calendarEvent';

const START = Date.UTC(2026, 10, 16, 5, 0, 0); // 2026-11-16 05:00 UTC
const event = {
  uid: 'room-abc',
  title: 'Night Owls, raid; night',
  startUtc: START,
  description: 'Code CGFFBG',
  url: 'https://meet.google.com/abc-defg-hij',
  nowUtc: Date.UTC(2026, 10, 15, 12, 0, 0),
};

describe('calendarEvent', () => {
  it('formats UTC times with a Z suffix', () => {
    expect(toIcsUtc(START)).toBe('20261116T050000Z');
  });

  it('escapes commas, semicolons, backslashes and newlines', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('builds a valid VEVENT in UTC with CRLF line endings', () => {
    const ics = buildIcs(event);
    expect(ics).toContain('DTSTART:20261116T050000Z\r\n');
    expect(ics).toContain('DTEND:20261116T053000Z\r\n');
    expect(ics).toContain('DTSTAMP:20261115T120000Z\r\n');
    expect(ics).toContain('UID:room-abc@syncworld.app\r\n');
    expect(ics).toContain('SUMMARY:Night Owls\\, raid\\; night\r\n');
    expect(ics).toContain('TRIGGER:PT0S');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // No bare LF anywhere.
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('folds long lines at 75 octets without splitting characters', () => {
    const long = 'DESCRIPTION:' + 'é'.repeat(80);
    const folded = foldIcsLine(long);
    const enc = new TextEncoder();
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(long);
  });

  it('every line of a real file stays within 75 octets', () => {
    const ics = buildIcs({ ...event, description: 'x'.repeat(300) });
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('builds a Google Calendar link with UTC dates', () => {
    const u = new URL(googleCalendarUrl(event));
    expect(u.hostname).toBe('calendar.google.com');
    expect(u.searchParams.get('dates')).toBe('20261116T050000Z/20261116T053000Z');
    expect(u.searchParams.get('text')).toBe(event.title);
    expect(u.searchParams.get('location')).toBe(event.url);
  });

  it('builds Outlook links for personal and work accounts', () => {
    const personal = new URL(outlookCalendarUrl(event));
    expect(personal.hostname).toBe('outlook.live.com');
    expect(personal.searchParams.get('startdt')).toBe('2026-11-16T05:00:00.000Z');
    expect(new URL(outlookCalendarUrl(event, true)).hostname).toBe('outlook.office.com');
  });

  it('makes a safe file name', () => {
    expect(icsFileName('Night Owls / raid!')).toBe('Night-Owls-raid.ics');
    expect(icsFileName('???')).toBe('syncworld.ics');
  });
});
