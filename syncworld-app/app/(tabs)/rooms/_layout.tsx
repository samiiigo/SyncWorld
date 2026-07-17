import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { StackActions } from '@react-navigation/native';

import { NavigatorBottomBlur } from '@/layouts/chrome/NavigatorBottomBlur';
import { useThemedColors } from '@/shared/theme';

export default function RoomsLayout() {
  const colors = useThemedColors();
  const navigation = useNavigation();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      animation: 'slide_from_right' as const,
      // Edge swipe only — scrubber uses its own pan on the track.
      gestureEnabled: true,
      gestureDirection: 'horizontal' as const,
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors.background],
  );

  // Native tabs don't pop the nested JS stack; retap Rooms → root list.
  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as never, () => {
      if (navigation.isFocused() && navigation.canGoBack()) {
        navigation.dispatch(StackActions.popToTop());
      }
    });
    return unsub;
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={screenOptions} />
      <NavigatorBottomBlur />
    </View>
  );
}
