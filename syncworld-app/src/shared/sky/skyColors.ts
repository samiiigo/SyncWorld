// ──────────────────────────────────────────────
// skyColors.ts — real-sky colours by local time (values from the approved dial mockup)
// ──────────────────────────────────────────────

type RGB = [number, number, number];
export type SkyStop = { min: number; rgb: RGB };

/** Horizon colour key frames, minutes after local midnight. */
export const SKY_STOPS: SkyStop[] = [
  { min: 0, rgb: [14, 16, 38] },
  { min: 270, rgb: [20, 22, 52] },
  { min: 330, rgb: [70, 52, 96] },
  { min: 390, rgb: [214, 132, 84] },
  { min: 456, rgb: [128, 176, 212] },
  { min: 720, rgb: [110, 170, 220] },
  { min: 984, rgb: [124, 176, 214] },
  { min: 1068, rgb: [222, 150, 88] },
  { min: 1140, rgb: [110, 64, 100] },
  { min: 1230, rgb: [28, 26, 62] },
  { min: 1440, rgb: [14, 16, 38] },
];

/** Ground below the horizon; the readout sits on it. */
export const GROUND = '#0E1015';
/** Primary text on the dial. */
export const INK = '#E9E6DF';
/** Marks you. */
export const YOU = '#E3A440';
/** Early (before 7 AM) or late (11 PM or later). */
export const ODD = '#FF8A5B';

const ZENITH: RGB = [10, 12, 26];

const wrap = (m: number) => ((m % 1440) + 1440) % 1440;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const css = (c: RGB) => `rgb(${c.join(',')})`;

function horizon(localMin: number): RGB {
  const m = wrap(localMin);
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const a = SKY_STOPS[i];
    const b = SKY_STOPS[i + 1];
    if (m >= a.min && m <= b.min) return mix(a.rgb, b.rgb, (m - a.min) / (b.min - a.min));
  }
  return SKY_STOPS[0].rgb;
}

/** Sky gradient for a local time: `top` is the darker zenith, `bottom` the horizon. `grey` (0–1) dulls it for cloud, rain or fog. */
export function skyAt(localMin: number, grey = 0): { top: string; bottom: string } {
  const g: RGB = nightness(localMin) > 0.5 ? [40, 44, 56] : [150, 156, 168];
  const top = mix(mix(horizon(localMin - 72), ZENITH, 0.35), g, grey);
  const bottom = mix(horizon(localMin), g, grey);
  return { top: css(top), bottom: css(bottom) };
}

/** Solid ring colour for a local time. */
export function ringColor(localMin: number): string {
  return css(horizon(localMin));
}

/** 0 in daylight (7:30 AM–6 PM), 1 in full night (8 PM–5 AM), linear through dawn and dusk. */
export function nightness(localMin: number): number {
  const h = wrap(localMin) / 60;
  if (h >= 7.5 && h <= 18) return 0;
  if (h >= 20 || h <= 5) return 1;
  return h < 7.5 ? (7.5 - h) / 2.5 : (h - 18) / 2;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** WCAG 2 contrast ratio of two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
