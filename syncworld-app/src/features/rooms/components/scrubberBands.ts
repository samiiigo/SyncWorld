import { DateTime, IANAZone } from 'luxon';

import { SCRUBBER_WINDOW_MS, MS_PER_MINUTE } from '@/shared/lib/time/time.constants';
import { periodAt, type DayPeriod } from '@/shared/lib/time/time.conversions';

export type Band = { flex: number; period: DayPeriod };

const STEP_MS = 30 * MS_PER_MINUTE;

/**
 * Sleep / business / evening segments across the 48h scrubber window, in the
 * given member's zone. Consecutive equal periods are merged so the track
 * renders a handful of Views rather than 96.
 */
export function bandsForWindow(windowStart: number, tz: string): Band[] {
  const bands: Band[] = [];
  for (let t = windowStart; t < windowStart + SCRUBBER_WINDOW_MS; t += STEP_MS) {
    const period = periodAt(t + STEP_MS / 2, tz);
    const last = bands[bands.length - 1];
    if (last && last.period === period) last.flex += 1;
    else bands.push({ flex: 1, period });
  }
  return bands;
}

export type DayMark = { percent: number; label: string };

/** Local midnights inside the window (0–100% of the track) with weekday labels. */
export function midnightsInWindow(windowStart: number, tz: string): DayMark[] {
  const zone = IANAZone.isValidZone(tz) ? tz : 'UTC';
  const end = windowStart + SCRUBBER_WINDOW_MS;
  const marks: DayMark[] = [];
  let day = DateTime.fromMillis(windowStart, { zone }).startOf('day').plus({ days: 1 });
  while (day.toMillis() < end) {
    marks.push({ percent: ((day.toMillis() - windowStart) / SCRUBBER_WINDOW_MS) * 100, label: day.toFormat('ccc') });
    day = day.plus({ days: 1 });
  }
  return marks;
}
