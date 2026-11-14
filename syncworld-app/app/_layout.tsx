import React, { useEffect, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ThemeProvider, useResolvedColorScheme, useThemedColors } from '@/shared/theme';
import { AppProvider } from '@/context/AppContext';
import { useOrientationPolicy } from '@/shared/lib/platform/orientation';
import { BRAND_FONT_ASSETS } from '@/shared/theme/brandFonts';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  // Nested navigators default to the navigation theme's background (light grey
  // on web). Make it transparent so the sky behind the tabs shows through.
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: 'transparent', primary: colors.primary } };
  }, [scheme, colors.primary]);
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
    <NavigationThemeProvider value={navigationTheme}>
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
    </NavigationThemeProvider>
  );
}

function RootLayoutContent() {
  const colors = useThemedColors();
  const resolvedScheme = useResolvedColorScheme();
  const rootStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: colors.background }),
    [colors.background],
  );

  useOrientationPolicy();
  // Embedded at build time on native (expo-font plugin); this loads them on web and in Expo Go.
  const [fontsLoaded, fontError] = useFonts(BRAND_FONT_ASSETS);
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return <View style={rootStyle} />;

  return (
    <View style={rootStyle}>
      <StatusBar style={resolvedScheme === 'light' ? 'dark' : 'light'} />
      <AppProvider>
        <RootLayoutNav />
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
