import React, { useEffect, useRef } from 'react';
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

type SettingsSheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** ~78% height for searchable lists. */
  tall?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Bottom sheet: backdrop fades; panel slides up (scrim stays put). */
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
  const translateY = useRef(new Animated.Value(SHEET_SLIDE_DISTANCE)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SHEET_SLIDE_DISTANCE);
      Animated.timing(translateY, {
        toValue: 0,
        duration: SHEET_OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(SHEET_SLIDE_DISTANCE);
    }
  }, [visible, translateY]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      {/* Modal sits outside root GHRV — re-wrap so GH lists inside the sheet get gestures. */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Dismiss" />
        <Animated.View
          style={[
            styles.sheet,
            tall && styles.sheetTall,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
            contentStyle,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
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
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.xs,
    },
    title: withAppFont({
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
    }),
    done: withAppFont({
      fontSize: 15,
      fontWeight: '600',
      color: c.primary,
    }),
  });
}
