import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import SettingsDetailScreen from '@/components/features/settings/SettingsDetailScreen';
import {
  isSettingsPageId,
  type SettingsPageId,
} from '@/hooks/settings/useSettingsScreen';

export default function SettingsPageRoute() {
  const router = useRouter();
  const { page } = useLocalSearchParams<{ page: string }>();

  if (!isSettingsPageId(page)) {
    return <Redirect href="/(tabs)/settings" />;
  }

  return (
    <SettingsDetailScreen
      page={page as SettingsPageId}
      onBack={() => router.back()}
    />
  );
}
