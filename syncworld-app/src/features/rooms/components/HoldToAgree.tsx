// ──────────────────────────────────────────────
// HoldToAgree.tsx — press and hold to vote yes, so a pocket tap can't.
// Screen readers get a plain activate action instead of the hold.
// ──────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { withAppFont } from '@/shared/theme';
import { YOU } from '@/shared/sky/skyColors';

type Props = {
  onAgree: () => void;
  disabled?: boolean;
  /** How long to hold, ms. */
  holdMs?: number;
};

export function HoldToAgree({ onAgree, disabled, holdMs = 600 }: Props) {
  const fill = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    fill.stopAnimation();
    Animated.timing(fill, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const start = () => {
    if (disabled) return;
    Animated.timing(fill, { toValue: 1, duration: holdMs, easing: Easing.linear, useNativeDriver: false }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      onAgree();
    }, holdMs);
  };

  return (
    <Pressable
      onPressIn={start}
      onPressOut={() => {
        if (timer.current) cancel();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Agree to this time"
      accessibilityHint="Press and hold to agree"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (!disabled && e.nativeEvent.actionName === 'activate') onAgree();
      }}
      style={[styles.button, disabled && { opacity: 0.5 }]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={styles.label}>Hold to agree</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(227,164,64,0.28)',
  },
  fill: { height: '100%', backgroundColor: YOU },
  label: withAppFont({ fontSize: 17, fontWeight: '600', color: '#FFF3D6' }),
});
