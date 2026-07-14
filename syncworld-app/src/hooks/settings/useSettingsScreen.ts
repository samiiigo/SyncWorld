import { useCallback, useMemo } from 'react';

import { useAppContext } from '@/context/AppContext';
import { useWorldStore } from '@/features/world/world.store';
import { themePreferenceTitle } from '@/utils/theme/themePreference';
import { useSettingsStore } from '@/context/useSettingsStore';

export type SettingsSheetId =
  | null
  | 'account'
  | 'notifications'
  | 'appearance'
  | 'privacy'
  | 'storage';

export function useSettingsScreen() {
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

  const openSheet = useCallback(
    (sheet: Exclude<SettingsSheetId, null>) => s.setSettingsSheet(sheet),
    [s],
  );
  const closeSheet = useCallback(() => s.setSettingsSheet(null), [s]);

  const onAccountNameChange = useCallback(
    (value: string) => {
      s.setAccountName(value);
      setDisplayName(value);
    },
    [s, setDisplayName],
  );

  const onSignOut = useCallback(() => {
    s.setSettingsSheet(null);
    signOut();
    s.showSettingsToast('Signed out (demo)');
  }, [s, signOut]);

  return {
    labels,
    settingsSheet: s.settingsSheet as SettingsSheetId,
    settingsToast: s.settingsToast,
    accountName: s.accountName,
    onAccountNameChange,
    openSheet,
    closeSheet,
    onSignOut,
    // appearance
    use24h: s.use24h,
    setUse24h: s.setUse24h,
    showCurrentMarker: s.showCurrentMarker,
    setShowCurrentMarker: s.setShowCurrentMarker,
    // notifications
    notifProposals: s.notifProposals,
    toggleNotifProposals: s.toggleNotifProposals,
    notifInvites: s.notifInvites,
    toggleNotifInvites: s.toggleNotifInvites,
    notifDigest: s.notifDigest,
    toggleNotifDigest: s.toggleNotifDigest,
    // privacy
    privacyShowStatus: s.privacyShowStatus,
    togglePrivacyShowStatus: s.togglePrivacyShowStatus,
    privacyOpenInvite: s.privacyOpenInvite,
    togglePrivacyOpenInvite: s.togglePrivacyOpenInvite,
    // storage
    storageWifiOnly: s.storageWifiOnly,
    toggleStorageWifiOnly: s.toggleStorageWifiOnly,
    clearCache: s.clearCache,
  };
}
