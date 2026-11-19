// ──────────────────────────────────────────────
// dialDrag.ts — turning the sky ring changes the time.
// One full turn = 24 h. Turning clockwise moves the ring forward, so the
// time at the top goes back (the ring shows later hours counter-clockwise).
// ──────────────────────────────────────────────

import { snapToTick } from './skyGeometry';

const MS_PER_DEG = (24 * 3_600_000) / 360;

/** Angle of point (x, y) around centre (cx, cy): 0° at the top, clockwise positive. */
export function pointAngleDeg(x: number, y: number, cx: number, cy: number): number {
  return (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
}

/** Shortest signed step from angle `a` to angle `b`, in (−180, 180]. */
export function angleDelta(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
}

/** Time after turning the ring by `deltaDeg` (accumulated) from `startUtc`, snapped and clamped. */
export function dragToUtc(startUtc: number, deltaDeg: number, minUtc: number, maxUtc: number): number {
  const raw = snapToTick(startUtc - deltaDeg * MS_PER_DEG);
  return Math.max(minUtc, Math.min(maxUtc, raw));
}
