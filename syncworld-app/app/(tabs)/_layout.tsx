import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { SkyBackdrop } from '@/shared/visuals/SkyBackdrop';
import { GlassLayer } from '@/shared/visuals/glass/GlassLayer';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, View } from 'react-native';

import { useSettingsStore } from '@/features/settings/state/settings.store';
import { useDeviceClass } from '@/layouts/layout/useDeviceClass';
import { useResolvedColorScheme, useThemedColors } from '@/shared/theme';

function tabBarColors(scheme: 'light' | 'dark', colors: ReturnType<typeof useThemedColors>) {
  return {
    accent: colors.primary,
    muted: colors.textSecondary,
    surface: scheme === 'light' ? colors.surfaceElevated : '#000000',
    border: colors.border,
  };
}

/** Classic JS tabs: retap a tab pops its nested stack to the root list. */
function tabPopToRootListeners({
  navigation,
  route,
}: {
  navigation: { isFocused: () => boolean; navigate: (name: string, params?: object) => void };
  route: { name: string; state?: { index?: number } };
}) {
  return {
    tabPress: () => {
      if (navigation.isFocused() && (route.state?.index ?? 0) > 0) {
        navigation.navigate(route.name, { screen: 'index' });
      }
    },
  };
}

function NativeTabLayout() {
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const tab = tabBarColors(scheme, colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SkyBackdrop />
      <NativeTabs
        key={scheme}
        tintColor={tab.accent}
        backgroundColor={null}
        iconColor={{ default: tab.muted, selected: tab.accent }}
        labelStyle={{
          default: { color: tab.muted },
          selected: { color: tab.accent },
        }}
        blurEffect="systemChromeMaterial"
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger name="rooms">
          <Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
          <Label>Rooms</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="world">
          <Icon sf={{ default: 'globe', selected: 'globe' }} />
          <Label>World</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
          <Label>Settings</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  // Tablets and desktop windows get a side navigation rail instead of a bottom bar.
  const { isWide } = useDeviceClass();
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const tab = tabBarColors(scheme, colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SkyBackdrop />
      <Tabs
        key={scheme}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          // Liquid glass bar / rail over the sky.
          tabBarBackground: () => <GlassLayer radius={0} />,
          tabBarActiveTintColor: tab.accent,
          tabBarInactiveTintColor: tab.muted,
          tabBarPosition: isWide ? 'left' : 'bottom',
          // Wide: Material navigation rail (labels under icons, ~88px). Side-by-side
          // labels would force a 360px sidebar; 'below-icon' in a sidebar is only
          // supported by the material variant.
          tabBarVariant: isWide ? 'material' : 'uikit',
          tabBarLabelPosition: isWide ? 'below-icon' : undefined,
          tabBarStyle: isWide
            ? {
                width: 96,
                paddingTop: 12,
                backgroundColor: 'transparent',
                borderRightWidth: 1,
                borderRightColor: tab.border,
                elevation: 0,
              }
            : {
                position: 'absolute',
                backgroundColor: 'transparent',
                borderTopWidth: 1,
                borderTopColor: tab.border,
                elevation: 0,
                ...(isWeb ? { height: 84 } : {}),
              },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          },
        }}
      >
        <Tabs.Screen
          name="rooms"
          options={{
            title: 'Rooms',
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="bubble.left" tintColor={color} size={24} />
              ) : (
                <Ionicons name="chatbubble-outline" size={24} color={color} />
              ),
          }}
          listeners={tabPopToRootListeners}
        />
        <Tabs.Screen
          name="world"
          options={{
            title: 'World',
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="globe" tintColor={color} size={24} />
              ) : (
                <Ionicons name="earth-outline" size={24} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="gearshape" tintColor={color} size={24} />
              ) : (
                <Ionicons name="settings-outline" size={24} color={color} />
              ),
          }}
          listeners={tabPopToRootListeners}
        />
      </Tabs>
    </View>
  );
}

export default function TabLayout() {
  const themePreference = useSettingsStore((s) => s.themePreference);
  const scheme = useResolvedColorScheme();
  const layoutKey = `${themePreference}-${scheme}`;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout key={layoutKey} />;
  }
  return <ClassicTabLayout key={layoutKey} />;
}
