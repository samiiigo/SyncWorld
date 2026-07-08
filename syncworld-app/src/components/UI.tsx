import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { CornerRadius } from '../theme/tokens';
import { appFont } from '../theme/fonts';
import type { SyncTheme, ConfettiSeed } from '../context/AppContext';

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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height,
        borderRadius: CornerRadius.md,
        backgroundColor: t.accent,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{label}</Text>
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
      style={({ pressed }) => ({
        height,
        borderRadius: CornerRadius.full,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function SegButton({ label, active, onPress, t }: { label: string; active: boolean; onPress: () => void; t: SyncTheme }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: 30, borderRadius: 8, backgroundColor: active ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : t.textTertiary }}>{label}</Text>
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
        <Text style={{ fontSize: 15, fontWeight: '600', color: actionEnabled ? t.accent : t.textTertiary }}>{action}</Text>
      </Pressable>
    </View>
  );
}
