import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { StackScreenHeader } from '@/components/navigation/header/StackScreenHeader';
import { useTopChromeLayout } from '@/components/navigation/layout/useTopChromeLayout';
import { useScreenLayoutStyles } from '@/components/navigation/layout/screenLayout';
import { SettingsNavigateRow } from '@/components/settings/SettingsNavigateRow';
import { useSettingsScreen } from '@/hooks/settings/useSettingsScreen';
import {
  useCreateStyles,
  useResolvedColorScheme,
  Spacing,
  withAppFont,
} from '@/theme';
import type { ColorPalette } from '@/theme/colorPalettes';

export function SettingsHomeScreen() {
  const { scrollPaddingTop } = useTopChromeLayout();
  const scheme = useResolvedColorScheme();
  const sl = useScreenLayoutStyles();
  const styles = useCreateStyles(createSettingsHomeStyles);
  const { labels, settingsToast, openPage } = useSettingsScreen();

  return (
    <View style={sl.container}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <ScrollView
        contentContainerStyle={[sl.scrollContent, { paddingTop: scrollPaddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[sl.sectionLabel, styles.firstSectionLabel]}>Account</Text>
        <View style={sl.card}>
          <SettingsNavigateRow
            title="Account"
            value={labels.account}
            icon="person-outline"
            onPress={() => openPage('account')}
          />
        </View>

        <Text style={sl.sectionLabel}>Preferences</Text>
        <View style={sl.card}>
          <SettingsNavigateRow
            title="Notifications"
            value={labels.notifications}
            icon="notifications-outline"
            onPress={() => openPage('notifications')}
          />
          <View style={sl.cardDivider} />
          <SettingsNavigateRow
            title="Appearance"
            value={labels.appearance}
            icon="color-palette-outline"
            onPress={() => openPage('appearance')}
          />
          <View style={sl.cardDivider} />
          <SettingsNavigateRow
            title="Privacy"
            value={labels.privacy}
            icon="shield-outline"
            onPress={() => openPage('privacy')}
          />
          <View style={sl.cardDivider} />
          <SettingsNavigateRow
            title="Storage & Data"
            value={labels.storage}
            icon="cube-outline"
            onPress={() => openPage('storage')}
          />
        </View>

        <Text style={sl.sectionLabel}>About</Text>
        <View style={sl.card}>
          <View style={sl.settingsRow}>
            <Text style={sl.settingsRowTitle}>Version</Text>
            <Text style={sl.settingsRowValue}>{labels.version}</Text>
          </View>
        </View>

        {settingsToast ? <Text style={styles.toast}>{settingsToast}</Text> : null}
      </ScrollView>

      <StackScreenHeader title="Settings" />
    </View>
  );
}

function createSettingsHomeStyles(c: ColorPalette) {
  return StyleSheet.create({
    firstSectionLabel: {
      marginTop: Spacing.sm,
    },
    toast: withAppFont({
      marginTop: Spacing.lg,
      textAlign: 'center',
      color: c.subtext,
      fontSize: 12,
    }),
  });
}
