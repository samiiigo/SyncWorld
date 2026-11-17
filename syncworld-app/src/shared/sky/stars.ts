// ──────────────────────────────────────────────
// stars.ts — fixed star positions and how bright the night sky is.
// ──────────────────────────────────────────────

import { nightness } from './skyColors';

export type Star = { x: number; y: number; r: number; phase: number };
type Sky = 'clear' | 'cloud' | 'rain' | 'fog';

/** Same seed, same stars (mulberry32), so they don't jump between renders. */
export function starField(seed: number, count: number, yMin: number, yMax: number, xMin = 58, xMax = 142): Star[] {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: xMin + rnd() * (xMax - xMin),
    y: yMin + rnd() * (yMax - yMin),
    r: 0.25 + rnd() * 0.45,
    phase: rnd(),
  }));
}

const THROUGH: Record<Sky, number> = { clear: 1, cloud: 0.35, rain: 0.1, fog: 0.1 };

/** 0 by day, 1 on a clear night; thinner through cloud, rain or fog. */
export function starOpacity(localMin: number, sky: Sky = 'clear'): number {
  return nightness(localMin) * THROUGH[sky];
}
