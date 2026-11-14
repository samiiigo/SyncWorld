import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { CornerRadius } from '@/shared/theme/tokens';
import { appFont } from '@/shared/theme/fonts';
import { pressFeedback } from '@/shared/theme/motion';
import { useThemedColors } from '@/shared/theme';
import { GlassLayer } from '@/shared/visuals/glass/GlassLayer';
import type { SyncTheme, ConfettiSeed } from '@/context/AppContext';

export function ConfettiPiece({ seed }: { seed: ConfettiSeed }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(fall, {
      toValue: 1,
      duration: seed.duration,
      delay: seed.delay,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fall, seed.delay, seed.duration]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-16, 720] });
  const opacity = fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: `${seed.left}%`,
        width: 8,
        height: 14,
        borderRadius: 2,
        backgroundColor: seed.color,
        transform: [{ translateY }, { rotate: `${seed.rotate}deg` }],
        opacity,
      }}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  t,
  height = 50,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  t: SyncTheme;
  height?: number;
}) {
  const colors = useThemedColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        height,
        borderRadius: CornerRadius.full,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        ...pressFeedback(pressed && !disabled),
      })}
    >
      {/* Gold-tinted liquid glass. */}
      <GlassLayer radius={height / 2} tint={t.accent} />
      <Text style={appFont(16, '600', colors.onPrimary)}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  t,
  tint,
  height = 50,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  t: SyncTheme;
  tint?: string;
  height?: number;
}) {
  const color = tint ?? t.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        height,
        borderRadius: CornerRadius.full,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        ...pressFeedback(pressed && !disabled),
      })}
    >
      <GlassLayer radius={height / 2} variant="clear" />
      <Text style={appFont(16, '600', color)}>{label}</Text>
    </Pressable>
  );
}

export function SegButton({ label, active, onPress, t }: { label: string; active: boolean; onPress: () => void; t: SyncTheme }) {
  const colors = useThemedColors();
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: 30, borderRadius: 8, backgroundColor: active ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={appFont(13, '600', active ? colors.onPrimary : t.textTertiary)}>{label}</Text>
    </Pressable>
  );
}

export function SheetHeader({
  title,
  onClose,
  action,
  actionEnabled,
  onAction,
  t,
}: {
  title: string;
  onClose: () => void;
  action: string;
  actionEnabled: boolean;
  onAction: () => void;
  t: SyncTheme;
}) {
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.hairline }}>
      <Pressable onPress={onClose} style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
        <Text style={{ color: t.text, fontSize: 18 }}>{'\u2715'}</Text>
      </Pressable>
      <Text style={appFont(17, '600', t.text)}>{title}</Text>
      <Pressable onPress={onAction} disabled={!actionEnabled} style={{ width: 60, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={appFont(15, '600', actionEnabled ? t.accent : t.textTertiary)}>{action}</Text>
      </Pressable>
    </View>
  );
}
