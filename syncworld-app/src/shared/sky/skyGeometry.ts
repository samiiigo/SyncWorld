// ──────────────────────────────────────────────
// skyGeometry.ts — pure maths for the sky dial (viewBox 200×200)
// ──────────────────────────────────────────────

import { zoneOffsetMinutes } from '../lib/time/time.conversions';

const MIN_PER_DAY = 1440;
const TICK_MS = 15 * 60_000;

/** Local minutes after midnight (0..1439) in `tz` at `utcMs`. */
export function localMinutes(utcMs: number, tz: string): number {
  const utcMin = Math.floor(utcMs / 60_000) + zoneOffsetMinutes(tz, utcMs);
  return ((utcMin % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
}

/** Bezel angle of a member's city relative to you (you sit at 0°, top). Range (−180, 180]. */
export function bezelAngleDeg(memberTz: string, youTz: string, utcMs: number): number {
  const diffMin = zoneOffsetMinutes(memberTz, utcMs) - zoneOffsetMinutes(youTz, utcMs);
  let deg = (diffMin / 60) * 15;
  while (deg > 180) deg -= 360;
  while (deg <= -180) deg += 360;
  return deg;
}

/** Rotation of the 24h sky ring so your current local time sits at the top. */
export function ringRotationDeg(utcMs: number, youTz: string): number {
  return -(localMinutes(utcMs, youTz) / 60) * 15;
}

/** Sun (6 AM–6 PM) or moon (6 PM–6 AM) on the arc that starts and ends below the window. */
export function bodyPosition(localMin: number): { kind: 'sun' | 'moon'; x: number; y: number } {
  const m = ((localMin % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const isSun = m >= 360 && m < 1080;
  const t = isSun ? (m - 360) / 720 : ((m - 1080 + MIN_PER_DAY) % MIN_PER_DAY) / 720;
  return {
    kind: isSun ? 'sun' : 'moon',
    x: 100 - 57 * Math.cos(Math.PI * t),
    y: 116 - 42 * Math.sin(Math.PI * t),
  };
}

/** Before 7 AM is early, 11 PM or later is late. */
export function oddHour(localMin: number): 'early' | 'late' | null {
  if (localMin < 420) return 'early';
  if (localMin >= 1380) return 'late';
  return null;
}

/** Nearest 15-minute tick. */
export function snapToTick(utcMs: number): number {
  return Math.round(utcMs / TICK_MS) * TICK_MS;
}
