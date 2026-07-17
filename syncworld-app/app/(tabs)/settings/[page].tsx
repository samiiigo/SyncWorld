import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  SettingsDetailScreen,
  isSettingsPageId,
  type SettingsPageId,
} from '@/features/settings';
import { RoutePaths } from '@/routes';

export default function SettingsPageRoute() {
  const router = useRouter();
  const { page } = useLocalSearchParams<{ page: string }>();

  if (!isSettingsPageId(page)) {
    return <Redirect href={RoutePaths.settings} />;
  }

  return (
    <SettingsDetailScreen
      page={page as SettingsPageId}
      onBack={() => router.back()}
    />
  );
}
