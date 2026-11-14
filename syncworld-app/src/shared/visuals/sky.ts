// ──────────────────────────────────────────────
// sky.ts — the "sky" palette behind every screen.
//
// SyncWorld's concept is that each person lives under their own sky. The
// animated gradient behind the app follows the sky of the time you are
// looking at: your local time by default, or the proposed time while you
// scrub a room. Colors come from the Figma core palette (sunrise gold
// #E3A440, twilight #7468C9, day sky #6AB7E0).
// ──────────────────────────────────────────────
import { create } from 'zustand';

export type SkyPeriod = 'night' | 'dawn' | 'day' | 'dusk';
export type SkyColors = readonly [string, string, string];

export function skyPeriodForHour(hour: number): SkyPeriod {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/** Three stops per period, in the order the shader mixes them (left, right, crest). */
export const SKY_GRADIENTS: Record<'dark' | 'light', Record<SkyPeriod, SkyColors>> = {
  dark: {
    night: ['#080B22', '#2B2463', '#7468C9'],
    dawn: ['#1B1340', '#A9524A', '#E3A440'],
    day: ['#0C2A48', '#3E8CC0', '#E8C27A'],
    dusk: ['#140E33', '#6A5BC0', '#D9714E'],
  },
  light: {
    night: ['#CDD0F2', '#A49BE3', '#ECE8FF'],
    dawn: ['#FBE3C4', '#F0B08E', '#CBC3F2'],
    day: ['#D2ECF9', '#8ECCEB', '#FBE6BF'],
    dusk: ['#E8DFFA', '#C6B6F0', '#F6C8A6'],
  },
};

/**
 * Wash laid over the gradient so body text keeps 4.5:1 against it.
 * Dark: the brightest stop (#E8C27A) under 45% black is ~#7F6B43, and white
 * text on that is 5.1:1. Light: dark text on the palest wash is above 12:1.
 */
export const SKY_SCRIM: Record<'dark' | 'light', string> = {
  dark: 'rgba(0,0,0,0.45)',
  light: 'rgba(255,255,255,0.30)',
};

/** Where the sun is overhead at `ms`: the subsolar point from UTC hour and solar declination. */
export function subsolarPoint(ms: number): { lat: number; lon: number } {
  const d = new Date(ms);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const dayOfYear = (ms - start) / 86_400_000;
  const lat = 23.44 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365);
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60;
  const lon = ((((12 - utcHours) * 15 + 180) % 360) + 360) % 360 - 180;
  return { lat, lon };
}

type SkyState = {
  /** When set, overrides the local-time period (e.g. while scrubbing a room). */
  override: SkyPeriod | null;
  setOverride: (period: SkyPeriod | null) => void;
};

export const useSkyStore = create<SkyState>((set) => ({
  override: null,
  setOverride: (override) => set((s) => (s.override === override ? s : { override })),
}));
