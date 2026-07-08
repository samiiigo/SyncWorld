import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/context/AppContext';

const NAV_ITEMS = [
  { key: 'rooms', path: '/(tabs)/rooms', label: 'Rooms', icon: 'alarm', outline: 'alarm-outline' },
  { key: 'world', path: '/(tabs)/world', label: 'World', icon: 'earth', outline: 'earth-outline' },
  { key: 'settings', path: '/(tabs)/settings', label: 'Settings', icon: 'settings', outline: 'settings-outline' },
] as const;

export default function TabLayout() {
  const { t } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: t.hairline,
          backgroundColor: t.surface,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          const color = active ? t.accent : t.textTertiary;
          return (
            <Pressable
              key={item.key}
              onPress={() => router.replace(item.path)}
              style={{ flex: 1, alignItems: 'center', gap: 3 }}
            >
              <Ionicons name={active ? item.icon : item.outline} size={24} color={color} />
              <Text style={{ fontSize: 10, fontWeight: '600', color }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
