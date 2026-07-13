import React from 'react';
import { View } from 'react-native';

import { NavigatorBottomBlur } from '@/components/navigation/chrome/NavigatorBottomBlur';
import SettingsScreen from '@/components/features/settings/SettingsScreen';

export default function SettingsTab() {
  return (
    <View style={{ flex: 1 }}>
      <SettingsScreen />
      <NavigatorBottomBlur />
    </View>
  );
}
