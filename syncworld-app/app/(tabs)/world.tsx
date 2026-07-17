import React from 'react';
import { View } from 'react-native';

import { NavigatorBottomBlur } from '@/layouts/chrome/NavigatorBottomBlur';
import { WorldPage } from '@/features/world';

export default function WorldScreen() {
  return (
    <View style={{ flex: 1 }}>
      <WorldPage />
      <NavigatorBottomBlur />
    </View>
  );
}
