import React, { useEffect, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NavigatorBottomBlur } from '@/components/navigation/chrome/NavigatorBottomBlur';
import { ThemeProvider, useResolvedColorScheme, useThemedColors } from '@/theme';
import { AppProvider } from '@/context/AppContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colors = useThemedColors();
  const stackScreenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      animation: 'slide_from_right' as const,
      ...Platform.select({
        ios: { gestureEnabled: true },
        android: { gestureEnabled: false },
      }),
    }),
    [colors.background],
  );

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen
        name="armed"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
    </Stack>
  );
}

function RootLayoutContent() {
  const colors = useThemedColors();
  const resolvedScheme = useResolvedColorScheme();
  const rootStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: colors.background }),
    [colors.background],
  );

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={rootStyle}>
      <StatusBar style={resolvedScheme === 'light' ? 'dark' : 'light'} />
      <AppProvider>
        <RootLayoutNav />
        <NavigatorBottomBlur scope="root" />
      </AppProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <RootLayoutContent />
          </ThemeProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
