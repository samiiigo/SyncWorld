import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { StackScreenHeader } from '@/components/navigation/header/StackScreenHeader';
import { ModePickerOption } from '@/components/navigation/header/ModePickerOption';
import { useTopChromeLayout } from '@/components/navigation/layout/useTopChromeLayout';
import {
  useModePickerStyles,
  useScreenLayoutStyles,
} from '@/components/navigation/layout/screenLayout';
import { SettingsNavigateRow } from '@/components/settings/SettingsNavigateRow';
import { SettingsToggleRow } from '@/components/settings/SettingsToggleRow';
import {
  useSettingsScreen,
  type SettingsSheetId,
} from '@/hooks/settings/useSettingsScreen';
import { useThemePreferenceSettings } from '@/hooks/settings/useThemePreferenceSettings';
import {
  useCreateStyles,
  useResolvedColorScheme,
  useThemedColors,
  Spacing,
  withAppFont,
} from '@/theme';
import type { ColorPalette } from '@/theme/colorPalettes';

const PAGE_TITLE: Record<Exclude<SettingsSheetId, null>, string> = {
  account: 'Account',
  notifications: 'Notifications',
  appearance: 'Appearance',
  privacy: 'Privacy',
  storage: 'Storage & Data',
};

export default function SettingsScreen() {
  const { scrollPaddingTop } = useTopChromeLayout();
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const sl = useScreenLayoutStyles();
  const mp = useModePickerStyles();
  const styles = useCreateStyles(createSettingsScreenStyles);
  const {
    labels,
    settingsSheet,
    settingsToast,
    accountName,
    onAccountNameChange,
    openSheet,
    closeSheet,
    onSignOut,
    use24h,
    setUse24h,
    showCurrentMarker,
    setShowCurrentMarker,
    notifProposals,
    toggleNotifProposals,
    notifInvites,
    toggleNotifInvites,
    notifDigest,
    toggleNotifDigest,
    privacyShowStatus,
    togglePrivacyShowStatus,
    privacyOpenInvite,
    togglePrivacyOpenInvite,
    storageWifiOnly,
    toggleStorageWifiOnly,
    clearCache,
  } = useSettingsScreen();
  const { options, selectPreference } = useThemePreferenceSettings();

  return (
    <View style={sl.container}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <ScrollView
        contentContainerStyle={[sl.scrollContent, { paddingTop: scrollPaddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        {!settingsSheet ? (
          <>
            <Text style={[sl.sectionLabel, styles.firstSectionLabel]}>Account</Text>
            <View style={sl.card}>
              <SettingsNavigateRow
                title="Account"
                value={labels.account}
                icon="person-outline"
                onPress={() => openSheet('account')}
              />
            </View>

            <Text style={sl.sectionLabel}>Preferences</Text>
            <View style={sl.card}>
              <SettingsNavigateRow
                title="Notifications"
                value={labels.notifications}
                icon="notifications-outline"
                onPress={() => openSheet('notifications')}
              />
              <View style={sl.cardDivider} />
              <SettingsNavigateRow
                title="Appearance"
                value={labels.appearance}
                icon="color-palette-outline"
                onPress={() => openSheet('appearance')}
              />
              <View style={sl.cardDivider} />
              <SettingsNavigateRow
                title="Privacy"
                value={labels.privacy}
                icon="shield-outline"
                onPress={() => openSheet('privacy')}
              />
              <View style={sl.cardDivider} />
              <SettingsNavigateRow
                title="Storage & Data"
                value={labels.storage}
                icon="cube-outline"
                onPress={() => openSheet('storage')}
              />
            </View>

            <Text style={sl.sectionLabel}>About</Text>
            <View style={sl.card}>
              <View style={sl.settingsRow}>
                <Text style={sl.settingsRowTitle}>Version</Text>
                <Text style={sl.settingsRowValue}>{labels.version}</Text>
              </View>
            </View>

          </>
        ) : settingsSheet === 'account' ? (
          <>
            <View style={[sl.card, styles.pageTop]}>
              <View style={styles.accountRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(labels.account[0] || 'Y').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.accountFields}>
                  <TextInput
                    value={accountName}
                    onChangeText={onAccountNameChange}
                    placeholder="Your name"
                    placeholderTextColor={colors.subtext}
                    style={styles.accountNameInput}
                  />
                  <Text style={styles.accountEmail}>you@example.com</Text>
                </View>
              </View>
            </View>
            <Pressable onPress={onSignOut} style={[styles.dangerButton, styles.pageCardGap]}>
              <Text style={styles.dangerButtonText}>Sign out</Text>
            </Pressable>
          </>
        ) : settingsSheet === 'notifications' ? (
          <View style={[sl.card, styles.pageTop]}>
            <SettingsToggleRow
              title="Room proposals"
              value={notifProposals}
              onValueChange={() => toggleNotifProposals()}
            />
            <View style={styles.pageDivider} />
            <SettingsToggleRow
              title="Room invites"
              value={notifInvites}
              onValueChange={() => toggleNotifInvites()}
            />
            <View style={styles.pageDivider} />
            <SettingsToggleRow
              title="Daily digest"
              value={notifDigest}
              onValueChange={() => toggleNotifDigest()}
            />
          </View>
        ) : settingsSheet === 'appearance' ? (
          <>
            <Text style={[sl.sectionDescription, styles.pageTop]}>
              Choose how SyncWorld looks. System follows your device light or dark mode.
            </Text>
            <View style={sl.card}>
              {options.map((option, index) => (
                <React.Fragment key={option.option}>
                  <ModePickerOption
                    selected={option.selected}
                    title={option.title}
                    subtitle={option.subtitle}
                    onPress={() => selectPreference(option.option)}
                  />
                  {index !== options.length - 1 ? <View style={mp.optionDivider} /> : null}
                </React.Fragment>
              ))}
            </View>
            <View style={[sl.card, styles.pageCardGap]}>
              <SettingsToggleRow
                title="Use 24-hour time"
                value={use24h}
                onValueChange={setUse24h}
              />
              <View style={styles.pageDivider} />
              <SettingsToggleRow
                title={'Show "currently" marker'}
                value={showCurrentMarker}
                onValueChange={setShowCurrentMarker}
              />
            </View>
          </>
        ) : settingsSheet === 'privacy' ? (
          <>
            <View style={[sl.card, styles.pageTop]}>
              <SettingsToggleRow
                title="Show my status to members"
                value={privacyShowStatus}
                onValueChange={() => togglePrivacyShowStatus()}
              />
              <View style={styles.pageDivider} />
              <SettingsToggleRow
                title="Allow room invites without approval"
                value={privacyOpenInvite}
                onValueChange={() => togglePrivacyOpenInvite()}
              />
            </View>
            <Text style={sl.sectionLabel}>Blocked users</Text>
            <Text style={[sl.sectionDescription, styles.mutedBody]}>No blocked users</Text>
          </>
        ) : (
          <>
            <View style={[sl.card, styles.pageTop]}>
              <SettingsToggleRow
                title="Auto-download on Wi-Fi only"
                value={storageWifiOnly}
                onValueChange={() => toggleStorageWifiOnly()}
              />
              <View style={styles.pageDivider} />
              <View style={sl.settingsRow}>
                <Text style={sl.settingsRowTitle}>Cache size</Text>
                <Text style={sl.settingsRowValue}>{labels.cacheSize}</Text>
              </View>
            </View>
            <Pressable onPress={clearCache} style={[styles.dangerButton, styles.pageCardGap]}>
              <Text style={styles.dangerButtonText}>Clear cache</Text>
            </Pressable>
          </>
        )}

        {settingsToast ? <Text style={styles.toast}>{settingsToast}</Text> : null}
      </ScrollView>

      <StackScreenHeader
        title={settingsSheet ? PAGE_TITLE[settingsSheet] : 'Settings'}
        showBack={Boolean(settingsSheet)}
        onBack={closeSheet}
      />
    </View>
  );
}

function createSettingsScreenStyles(c: ColorPalette) {
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
    pageTop: {
      marginTop: Spacing.sm,
    },
    pageCardGap: {
      marginTop: Spacing.md,
    },
    pageDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: Spacing.md,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: withAppFont({
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    }),
    accountFields: {
      flex: 1,
    },
    accountNameInput: withAppFont({
      color: c.textPrimary,
      fontSize: 17,
      fontWeight: '600',
      padding: 0,
    }),
    accountEmail: withAppFont({
      color: c.subtext,
      fontSize: 13,
      marginTop: 2,
    }),
    dangerButton: {
      height: 48,
      borderRadius: 999,
      backgroundColor: 'rgba(255,59,48,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerButtonText: withAppFont({
      color: c.red,
      fontSize: 15,
      fontWeight: '600',
    }),
    mutedBody: {
      marginBottom: 0,
    },
  });
}
