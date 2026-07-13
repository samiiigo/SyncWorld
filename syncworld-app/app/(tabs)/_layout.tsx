import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, View } from 'react-native';

import { useSettingsStore } from '@/context/useSettingsStore';
import { useResolvedColorScheme, useThemedColors } from '@/theme';

function tabBarColors(scheme: 'light' | 'dark', colors: ReturnType<typeof useThemedColors>) {
  return {
    accent: colors.primary,
    muted: colors.textSecondary,
    surface: scheme === 'light' ? colors.surfaceElevated : '#000000',
    border: colors.border,
  };
}

function NativeTabLayout() {
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const tab = tabBarColors(scheme, colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const tab = tabBarColors(scheme, colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        key={scheme}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: tab.accent,
          tabBarInactiveTintColor: tab.muted,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: tab.surface,
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
