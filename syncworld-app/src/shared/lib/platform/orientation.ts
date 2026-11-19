// ──────────────────────────────────────────────
// orientation.ts — phones stay portrait; tablets and desktops rotate freely.
// app.json allows every orientation so iPads and Android tablets can rotate
// and use split-screen; phones are locked back to portrait at runtime (spec
// layouts are portrait-only on phones).
// ──────────────────────────────────────────────

import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { WIDTH_BREAKPOINTS } from '@/layouts/layout/useDeviceClass';

/** A phone's shortest side is under 600dp in either orientation. */
export function isPhoneSized(width: number, height: number): boolean {
  return Math.min(width, height) < WIDTH_BREAKPOINTS.medium;
}

export function useOrientationPolicy(): void {
  const { width, height } = useWindowDimensions();
  const phone = isPhoneSized(width, height);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const lock = phone
      ? ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      : ScreenOrientation.unlockAsync();
    lock.catch(() => {
      // Some Android launchers/multi-window modes refuse locks; layout still adapts.
    });
  }, [phone]);
}
