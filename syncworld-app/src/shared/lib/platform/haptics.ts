// ──────────────────────────────────────────────
// haptics.ts — spec haptics with a silent fallback where unsupported.
// iOS: UISelectionFeedbackGenerator / UINotificationFeedbackGenerator.
// Android: EFFECT_TICK-style selection and one-shot vibrations.
// Web (Windows/Mac): no haptics hardware — every call is a no-op.
// ──────────────────────────────────────────────

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function fire(effect: () => Promise<void>): void {
  if (!supported) return;
  effect().catch(() => {
    // Haptics can be disabled system-wide; never surface that as an error.
  });
}

export const haptics = {
  /** Scrubber tick every 15 minutes while dragging (spec line 238). */
  selection: () => fire(() => Haptics.selectionAsync()),
  /** Consensus reached / alarm armed (spec lines 398, 417). */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Veto or failed action. */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Light tap for button presses that change state. */
  light: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
