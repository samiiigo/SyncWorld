import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateStyles, Spacing, CornerRadius, withAppFont } from '@/theme';
import type { ColorPalette } from '@/theme/colorPalettes';

type SettingsSheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** ~78% height for searchable lists. */
  tall?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Bottom-sheet modal used for settings detail panels (Briefly-styled). */
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            tall && styles.sheetTall,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
            contentStyle,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
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
