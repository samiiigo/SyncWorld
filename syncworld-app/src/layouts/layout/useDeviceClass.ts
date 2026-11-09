// ──────────────────────────────────────────────
// useDeviceClass.ts — one source of truth for "what kind of screen is this?"
//
// SyncWorld targets iOS/Android phones and tablets, plus Windows and Mac via
// the web build. Layout decisions key off width class, not platform, so an
// iPad, a resized desktop browser window and a foldable all behave the same.
// ──────────────────────────────────────────────

import { Platform, useWindowDimensions } from 'react-native';

/** Material 3 window size classes (compact < 600 ≤ medium < 1024 ≤ expanded). */
export type WidthClass = 'compact' | 'medium' | 'expanded';

export const WIDTH_BREAKPOINTS = {
  medium: 600,
  expanded: 1024,
} as const;

/** Max width for single-column content on wide screens (forms, sheets, lists). */
export const READABLE_MAX_WIDTH = 640;
/** Max width for the whole app frame on very wide desktop windows. */
export const APP_MAX_WIDTH = 1280;

export type DeviceClass = {
  width: number;
  height: number;
  widthClass: WidthClass;
  isCompact: boolean;
  /** medium or expanded — use split layouts, centered dialogs, side navigation. */
  isWide: boolean;
  isLandscape: boolean;
  platform: typeof Platform.OS;
  /** Web build (Windows/Mac/desktop browsers, or installed PWA). */
  isWeb: boolean;
  /**
   * Best-effort: true on native, and on web when the primary pointer is coarse.
   * Desktop gets hover states, pointer cursors and keyboard shortcuts instead.
   */
  isTouch: boolean;
};

export function widthClassFor(width: number): WidthClass {
  if (width >= WIDTH_BREAKPOINTS.expanded) return 'expanded';
  if (width >= WIDTH_BREAKPOINTS.medium) return 'medium';
  return 'compact';
}

function detectTouch(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

const IS_TOUCH = detectTouch();

export function useDeviceClass(): DeviceClass {
  const { width, height } = useWindowDimensions();
  const widthClass = widthClassFor(width);
  return {
    width,
    height,
    widthClass,
    isCompact: widthClass === 'compact',
    isWide: widthClass !== 'compact',
    isLandscape: width > height,
    platform: Platform.OS,
    isWeb: Platform.OS === 'web',
    isTouch: IS_TOUCH,
  };
}
