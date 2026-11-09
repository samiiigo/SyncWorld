import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { useThemedColors, withAppFont } from '@/shared/theme';

/** Inverted pill toast (prototype `toastUp`), announced to screen readers. */
export function Toast({ message, bottom = 110 }: { message: string | null; bottom?: number }) {
  const colors = useThemedColors();
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    rise.setValue(0);
    Animated.spring(rise, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  }, [message, rise]);

  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          bottom,
          backgroundColor: colors.inverseSurface,
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.inverseText }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: 420,
    marginHorizontal: 16,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    zIndex: 50,
  },
  text: withAppFont({ fontSize: 14, fontWeight: '500', textAlign: 'center' }),
});
