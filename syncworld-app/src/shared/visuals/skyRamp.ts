// ──────────────────────────────────────────────
// skyRamp.ts — the color of the sky at any local hour.
// Used by the Sky Lane (the time scrubber track): one continuous strip of
// your sky across the 48-hour window, instead of flat period blocks.
// ──────────────────────────────────────────────

/** [hour, color] keyframes through a day: deep night, dawn rose, gold sunrise, day sky, dusk, twilight. */
const KEYS: readonly (readonly [number, string])[] = [
  [0, '#0E0C2A'],
  [4.5, '#1D1846'],
  [6, '#B5574A'],
  [7, '#E3A440'],
  [9, '#6AB7E0'],
  [16, '#6AB7E0'],
  [18, '#E08A4E'],
  [19.5, '#6A5BC0'],
  [21, '#1D1846'],
  [24, '#0E0C2A'],
];

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Sky color at a local hour (fractional hours allowed, wraps at 24). */
export function skyColorAtHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [h0, c0] = KEYS[i];
    const [h1, c1] = KEYS[i + 1];
    if (h >= h0 && h <= h1) return mixHex(c0, c1, (h - h0) / (h1 - h0));
  }
  return KEYS[0][1];
}

/** Evenly spaced gradient stops for a window starting at `startHour` local and spanning `hours`. */
export function skyLaneStops(startHour: number, hours: number, steps = 49): { colors: string[]; locations: number[] } {
  const colors: string[] = [];
  const locations: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    colors.push(skyColorAtHour(startHour + t * hours));
    locations.push(t);
  }
  return { colors, locations };
}
