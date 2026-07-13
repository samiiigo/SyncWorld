import React from 'react';
import { View } from 'react-native';

import { NavigatorBottomBlur } from '@/components/navigation/chrome/NavigatorBottomBlur';
import WorldTimelineScreen from '../../src/screens/WorldTimelineScreen';

export default function WorldScreen() {
  return (
    <View style={{ flex: 1 }}>
      <WorldTimelineScreen />
      <NavigatorBottomBlur />
    </View>
  );
}
