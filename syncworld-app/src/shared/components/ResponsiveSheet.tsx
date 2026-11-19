import React, { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { READABLE_MAX_WIDTH, useDeviceClass } from '@/layouts/layout/useDeviceClass';
import { SettingsSheet } from '@/layouts/sheet/SettingsSheet';
import { BorderRadius, Spacing, useThemedColors, withAppFont } from '@/shared/theme';

type Props = {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  tall?: boolean;
};

/**
 * Bottom sheet on phones (iOS detent sheet / Android bottom sheet via
 * SettingsSheet); a centered dialog on tablets and desktop windows, where a
 * full-width sheet would stretch awkwardly. Esc closes it on desktop.
 */
export function ResponsiveSheet({ title, visible, onClose, children, tall }: Props) {
  const { isWide, isWeb } = useDeviceClass();
  const colors = useThemedColors();

  useEffect(() => {
    if (!visible || !isWeb || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, isWeb, onClose]);

  if (!isWide) {
    return (
      <SettingsSheet title={title} visible={visible} onClose={onClose} tall={tall}>
        {children}
      </SettingsSheet>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose} accessibilityLabel="Close">
        <Pressable
          style={[styles.dialog, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => undefined}
          accessibilityViewIsModal
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
              style={({ pressed }) => [styles.close, { backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: READABLE_MAX_WIDTH - 80,
    maxHeight: '90%',
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '3px 5px 30px rgba(0,0,0,0.22)' } as object, default: {} }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: withAppFont({ fontSize: 17, fontWeight: '600' }),
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.lg,
  },
});
