import type { IANATimezone, UTCEpochMs } from '@domain/common';
import {
  checkDSTSafety,
  checkLocalWallTime,
  formatCountdown,
  formatLocalTime,
  formatUtcClock,
  getMemberOffsetLabel,
  isLateNight,
  localHourFloat,
  localToUtc,
  periodForHour,
  relativeDayLabel,
  utcToLocal,
  cityFromTimezone,
} from '../time.conversions';

const tz = (s: string) => s as IANATimezone;
const ms = (iso: string) => Date.parse(iso) as UTCEpochMs;
const NY = tz('America/New_York');

describe('utcToLocal', () => {
  it('converts to the local wall time with offset and DST flag', () => {
    const summer = utcToLocal(ms('2026-07-01T18:30:00Z'), NY);
    expect(summer).toMatchObject({ time: '2:30 PM', offsetLabel: 'UTC-4', isDST: true, dayOfWeek: 'Wed' });

    const winter = utcToLocal(ms('2026-01-15T18:30:00Z'), NY);
    expect(winter).toMatchObject({ time: '1:30 PM', offsetLabel: 'UTC-5', isDST: false });
  });

  it('handles half-hour zones and falls back to UTC for unknown zones', () => {
    expect(utcToLocal(ms('2026-03-01T00:00:00Z'), tz('Asia/Kolkata')).offsetLabel).toBe('UTC+5:30');
    expect(utcToLocal(ms('2026-03-01T00:00:00Z'), tz('Not/AZone')).timezone).toBe('UTC');
  });
});

describe('localToUtc', () => {
  it('converts a normal wall time', () => {
    expect(localToUtc(2026, 7, 1, 14, 30, NY)).toBe(ms('2026-07-01T18:30:00Z'));
  });

  it('CASE 2: picks the earlier instant in a fall-back overlap', () => {
    // 2026-11-01 01:30 happens at 05:30Z (EDT) and again at 06:30Z (EST).
    expect(localToUtc(2026, 11, 1, 1, 30, NY)).toBe(ms('2026-11-01T05:30:00Z'));
  });

  it('CASE 1: moves a spring-forward gap time forward', () => {
    // 2026-03-08 02:30 does not exist in New York.
    const result = localToUtc(2026, 3, 8, 2, 30, NY);
    expect(utcToLocal(result, NY).time).toBe('3:30 AM');
  });
});

describe('checkLocalWallTime', () => {
  it('flags skipped and ambiguous wall times', () => {
    expect(checkLocalWallTime(2026, 3, 8, 2, 30, NY)).toMatchObject({ isSkipped: true, isAmbiguous: false });
    expect(checkLocalWallTime(2026, 11, 1, 1, 30, NY)).toMatchObject({ isSkipped: false, isAmbiguous: true });
    expect(checkLocalWallTime(2026, 6, 1, 9, 0, NY)).toMatchObject({ isSkipped: false, isAmbiguous: false, warning: null });
  });

  it('CASE 5: never false-positives in zones without DST', () => {
    for (const zone of ['UTC', 'Asia/Kolkata', 'Asia/Shanghai']) {
      expect(checkLocalWallTime(2026, 3, 8, 2, 30, tz(zone)).warning).toBeNull();
      expect(checkLocalWallTime(2026, 11, 1, 1, 30, tz(zone)).warning).toBeNull();
    }
  });
});

describe('checkDSTSafety (instants)', () => {
  it('marks both instants of a repeated hour as ambiguous', () => {
    const first = checkDSTSafety(ms('2026-11-01T05:30:00Z'), NY);
    const second = checkDSTSafety(ms('2026-11-01T06:30:00Z'), NY);
    expect(first.isAmbiguous && second.isAmbiguous).toBe(true);
    expect(first.warning).toContain('first');
    expect(second.warning).toContain('second');
  });

  it('is clean on ordinary instants', () => {
    expect(checkDSTSafety(ms('2026-07-01T18:30:00Z'), NY).isAmbiguous).toBe(false);
  });
});

describe('CASE 4: multi-region divergence', () => {
  it('shows each member their own offset for the same instant', () => {
    // Between US (Mar 8) and EU (Mar 29) transitions, NY↔London gap is 4h, not 5h.
    const instant = ms('2026-03-15T12:00:00Z');
    expect(getMemberOffsetLabel(NY, instant)).toBe('UTC-4');
    expect(getMemberOffsetLabel(tz('Europe/London'), instant)).toBe('UTC');
  });
});

describe('formatting helpers', () => {
  it('formats countdowns', () => {
    expect(formatCountdown(3 * 3600_000 + 4 * 60_000 + 5_000)).toBe('3h 4m 5s');
    expect(formatCountdown(65_000)).toBe('1m 5s');
    expect(formatCountdown(-10)).toBe('0m 0s');
  });

  it('formats local and UTC clocks', () => {
    const t = ms('2026-07-01T18:30:00Z');
    expect(formatLocalTime(t, 'Asia/Tokyo')).toBe('3:30 AM');
    expect(formatUtcClock(t)).toBe('18:30 UTC');
    expect(localHourFloat(t, 'America/New_York')).toBe(14.5);
  });

  it('labels relative days in the member zone', () => {
    const now = ms('2026-07-01T12:00:00Z');
    expect(relativeDayLabel(ms('2026-07-01T20:00:00Z'), 'UTC', now)).toBe('Today');
    expect(relativeDayLabel(ms('2026-07-02T20:00:00Z'), 'UTC', now)).toBe('Tomorrow');
    // Same instant is already "Tomorrow" in Tokyo.
    expect(relativeDayLabel(ms('2026-07-01T20:00:00Z'), 'Asia/Tokyo', now)).toBe('Tomorrow');
  });

  it('classifies periods and late-night times', () => {
    expect([periodForHour(3), periodForHour(9), periodForHour(19), periodForHour(23)]).toEqual([
      'sleep',
      'business',
      'evening',
      'sleep',
    ]);
    expect(isLateNight(ms('2026-07-01T03:30:00Z'), 'UTC')).toBe(true);
    expect(isLateNight(ms('2026-07-01T22:30:00Z'), 'UTC')).toBe(false);
    expect(isLateNight(ms('2026-07-01T23:00:00Z'), 'UTC')).toBe(true);
  });

  it('derives a city label from the zone id', () => {
    expect(cityFromTimezone('America/New_York')).toBe('New York');
  });
});
