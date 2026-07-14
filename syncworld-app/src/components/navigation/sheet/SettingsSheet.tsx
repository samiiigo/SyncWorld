import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateStyles, Spacing, CornerRadius, withAppFont } from '@/theme';
import type { ColorPalette } from '@/theme/colorPalettes';

const SHEET_SLIDE_DISTANCE = 480;
const SHEET_OPEN_MS = 280;
const SHEET_CLOSE_MS = 220;

type SettingsSheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** ~78% height for searchable lists. */
  tall?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Bottom sheet: backdrop fades; panel slides (scrim stays put, no Modal slide). */
export function SettingsSheet({
  title,
  visible,
  onClose,
  children,
  tall,
  contentStyle,
}: SettingsSheetProps) {
  const styles = useCreateStyles(createSettingsSheetStyles);
  const insets = useSafeAreaInsets();
  const [presented, setPresented] = useState(visible);
  const presentedRef = useRef(visible);
  const translateY = useRef(new Animated.Value(SHEET_SLIDE_DISTANCE)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      presentedRef.current = true;
      setPresented(true);
      translateY.setValue(SHEET_SLIDE_DISTANCE);
      scrimOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!presentedRef.current) {
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_SLIDE_DISTANCE,
        duration: SHEET_CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: SHEET_CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return;
      }
      presentedRef.current = false;
      setPresented(false);
    });
  }, [visible, translateY, scrimOpacity]);

  return (
    <Modal visible={presented} animationType="none" transparent onRequestClose={onClose}>
      {/* Modal sits outside root GHRV — re-wrap so GH lists inside the sheet get gestures. */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            tall && styles.sheetTall,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
            contentStyle,
            { transform: [{ translateY }] },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          {tall ? <View style={styles.body}>{children}</View> : children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createSettingsSheetStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: c.surfaceElevated,
      borderTopLeftRadius: CornerRadius.xl,
      borderTopRightRadius: CornerRadius.xl,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    sheetTall: {
      height: '78%',
    },
    body: {
      flex: 1,
      minHeight: 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      marginBottom: Spacing.md,
    },
    title: withAppFont({
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
      lineHeight: 22,
    }),
    done: withAppFont({
      fontSize: 17,
      fontWeight: '600',
      color: c.primary,
      lineHeight: 22,
    }),
  });
}
