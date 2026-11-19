import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useResolvedColorScheme } from '@/shared/theme';
import { ShaderGradient } from './ShaderGradient';
import { SKY_GRADIENTS, SKY_SCRIM, skyPeriodForHour, useSkyStore, type SkyPeriod } from './sky';

/** Stars come out at night (and faintly at dusk); in light mode they'd vanish, so keep them off. */
const STAR_OPACITY: Record<'dark' | 'light', Record<SkyPeriod, number>> = {
  dark: { night: 1, dusk: 0.35, dawn: 0.15, day: 0 },
  light: { night: 0, dusk: 0, dawn: 0, day: 0 },
};

function useLocalPeriod(): SkyPeriod {
  const [period, setPeriod] = useState(() => skyPeriodForHour(new Date().getHours()));
  useEffect(() => {
    const id = setInterval(() => setPeriod(skyPeriodForHour(new Date().getHours())), 60_000);
    return () => clearInterval(id);
  }, []);
  return period;
}

/**
 * Full-bleed animated sky behind a screen. Place it as the first child of a
 * screen's root; it ignores touches. Pass `period` to pin a sky, otherwise it
 * follows the sky override (set while scrubbing a room) or your local time.
 */
export function SkyBackdrop({ period }: { period?: SkyPeriod }) {
  const scheme = useResolvedColorScheme() === 'light' ? 'light' : 'dark';
  const local = useLocalPeriod();
  const override = useSkyStore((s) => s.override);
  const active = period ?? override ?? local;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ShaderGradient colors={SKY_GRADIENTS[scheme][active]} stars={STAR_OPACITY[scheme][active]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: SKY_SCRIM[scheme] }]} />
    </View>
  );
}
