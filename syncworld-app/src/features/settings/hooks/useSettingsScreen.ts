import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { useAppContext } from '@/context/AppContext';
import { useWorldStore } from '@/features/world';
import { themePreferenceTitle } from '@/shared/utils/theme/themePreference';
import { useSettingsStore } from '../state/settings.store';

export const SETTINGS_PAGE_IDS = [
  'account',
  'notifications',
  'appearance',
  'privacy',
  'storage',
] as const;

export type SettingsPageId = (typeof SETTINGS_PAGE_IDS)[number];

export function isSettingsPageId(value: string | undefined): value is SettingsPageId {
  return SETTINGS_PAGE_IDS.includes(value as SettingsPageId);
}

export function useSettingsScreen() {
  const router = useRouter();
  const { displayName, setDisplayName, signOut } = useAppContext();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const s = useWorldStore();

  const accountName = s.accountName.trim() || displayName || 'You';
  const notifOnCount = [s.notifProposals, s.notifInvites, s.notifDigest].filter(Boolean).length;
  const cacheClearedRecently = Date.now() - s.cacheClearedAt < 3000;
  const cacheSizeLabel = cacheClearedRecently ? '0 MB' : '24 MB';

  const labels = useMemo(
    () => ({
      account: accountName,
      notifications: `${notifOnCount} of 3 alerts on`,
      appearance: themePreferenceTitle(themePreference),
      privacy: 'Permissions, blocked users',
      storage: s.storageWifiOnly
        ? `Wi-Fi only · ${cacheSizeLabel}`
        : `Any network · ${cacheSizeLabel}`,
      cacheSize: cacheSizeLabel,
      version: '1.0.0',
    }),
    [accountName, cacheSizeLabel, notifOnCount, s.storageWifiOnly, themePreference],
  );

  const openPage = useCallback(
    (page: SettingsPageId) => {
      router.push(`/(tabs)/settings/${page}`);
    },
    [router],
  );

  const onAccountNameChange = useCallback(
    (value: string) => {
      s.setAccountName(value);
      setDisplayName(value);
    },
    [s, setDisplayName],
  );

  const onSignOut = useCallback(() => {
    signOut();
    s.showSettingsToast('Signed out (demo)');
  }, [s, signOut]);

  return {
    labels,
    settingsToast: s.settingsToast,
    accountName: s.accountName,
    onAccountNameChange,
    openPage,
    onSignOut,
    use24h: s.use24h,
    setUse24h: s.setUse24h,
    showCurrentMarker: s.showCurrentMarker,
    setShowCurrentMarker: s.setShowCurrentMarker,
    notifProposals: s.notifProposals,
    toggleNotifProposals: s.toggleNotifProposals,
    notifInvites: s.notifInvites,
    toggleNotifInvites: s.toggleNotifInvites,
    notifDigest: s.notifDigest,
    toggleNotifDigest: s.toggleNotifDigest,
    privacyShowStatus: s.privacyShowStatus,
    togglePrivacyShowStatus: s.togglePrivacyShowStatus,
    privacyOpenInvite: s.privacyOpenInvite,
    togglePrivacyOpenInvite: s.togglePrivacyOpenInvite,
    storageWifiOnly: s.storageWifiOnly,
    toggleStorageWifiOnly: s.toggleStorageWifiOnly,
    clearCache: s.clearCache,
  };
}
