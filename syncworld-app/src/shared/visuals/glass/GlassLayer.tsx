import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';

import { useResolvedColorScheme, useThemedColors } from '@/shared/theme';

export type GlassLayerProps = {
  radius: number;
  /** Fill color for tinted glass (e.g. the primary button). Defaults to the neutral glass fill. */
  tint?: string;
  /** 'clear' lets more of the sky through; 'regular' is frostier. */
  variant?: 'regular' | 'clear';
};

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * The glass material, drawn as an absolute layer behind a container's
 * children. iOS 26+ uses the system Liquid Glass; older iOS blurs; Android
 * skips blur (the sky behind is already soft, so blur costs frames for no
 * visible gain) and relies on the tint, specular sheen and rim.
 */
export function GlassLayer({ radius, tint, variant = 'regular' }: GlassLayerProps) {
  const c = useThemedColors();
  const scheme = useResolvedColorScheme();

  if (liquidGlass) {
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle={variant}
        tintColor={tint}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={variant === 'clear' ? 18 : 32} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? (variant === 'clear' ? c.glassFill : c.glassFillStrong) }]} />
      {/* Specular sheen across the top-left, like light catching the lens. */}
      <LinearGradient
        colors={[c.glassHighlight, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.35, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.glassBorder }]} />
    </View>
  );
}
