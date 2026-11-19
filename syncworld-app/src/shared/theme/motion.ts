// ──────────────────────────────────────────────
// motion.ts — motion tokens (values from Emil Kowalski's animation audit,
// via the improve-animations skill). One place for curves and durations.
// ──────────────────────────────────────────────
import { Easing, Platform, type ViewStyle } from 'react-native';

/** Strong ease-out for UI: starts fast, lands softly. cubic-bezier(0.23, 1, 0.32, 1). */
export const EASE_OUT_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
/** On-screen movement. cubic-bezier(0.77, 0, 0.175, 1). */
export const easeInOut = Easing.bezier(0.77, 0, 0.175, 1);
/** iOS-like sheets and drawers. cubic-bezier(0.32, 0.72, 0, 1). */
export const easeDrawer = Easing.bezier(0.32, 0.72, 0, 1);

export const Durations = {
  /** Button press feedback (100–160ms). */
  press: 160,
  /** Small popovers and tooltips. */
  popover: 180,
  /** Dropdowns and selects. */
  menu: 220,
  /** Modals, sheets and drawers (up to 500ms). */
  sheet: 360,
} as const;

/** Subtle press scale (0.95–0.98); never squish full-width rows. */
export const PRESS_SCALE = 0.97;

/**
 * Press feedback for buttons: scale only (GPU-friendly transform). On web the
 * change is eased with a 160ms strong ease-out; native Pressable redraws per
 * frame anyway, and the scale is small enough not to need a tween.
 */
export function pressFeedback(pressed: boolean): ViewStyle {
  const style: ViewStyle = { transform: [{ scale: pressed ? PRESS_SCALE : 1 }] };
  if (Platform.OS === 'web') {
    Object.assign(style, {
      transitionProperty: 'transform',
      transitionDuration: `${Durations.press}ms`,
      transitionTimingFunction: EASE_OUT_CSS,
    });
  }
  return style;
}
