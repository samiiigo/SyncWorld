import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAppContext } from '../../src/context/AppContext';
import { appFont } from '../../src/theme/fonts';
import { BorderRadius } from '../../src/theme/constants';
import type { ThemePreference } from '../../src/utils/theme/themePreference';

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const {
    t,
    displayName,
    setDisplayName,
    rooms,
    themePreference,
    setThemePreference,
    signOut,
  } = useAppContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 4,
            borderBottomWidth: 1,
            borderBottomColor: t.hairline,
            backgroundColor: t.surface,
          }}
        >
          <View style={{ width: 44, height: 44 }} />
          <Text style={appFont(17, '600', t.text)}>Settings</Text>
          <View style={{ width: 44, height: 44 }} />
        </View>

        {/* Settings Body */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 10 }}>
          <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4 }]}>APPEARANCE</Text>
          <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, padding: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6, backgroundColor: t.surface2, borderRadius: 10, padding: 3 }}>
              {THEME_OPTIONS.map((opt) => {
                const active = themePreference === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setThemePreference(opt.key)}
                    style={{ flex: 1, height: 34, borderRadius: 8, backgroundColor: active ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#fff' : t.textTertiary }}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4, marginTop: 12 }]}>PROFILE</Text>
          <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, padding: 16, gap: 8 }}>
            <Text style={[appFont(13, '600', t.textTertiary)]}>Display name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={t.textTertiary}
              style={{ height: 46, borderWidth: 1, borderColor: t.hairline, backgroundColor: t.bg, borderRadius: BorderRadius.md, paddingHorizontal: 14, color: t.text, fontSize: 16 }}
            />
          </View>

          <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4, marginTop: 12 }]}>ROOMS</Text>
          <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.hairline }}>
              <Text style={appFont(16, '400', t.text)}>Joined rooms</Text>
              <Text style={{ fontSize: 15, color: t.textTertiary }}>{rooms.length}</Text>
            </View>
            <Pressable onPress={signOut} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
              <Text style={appFont(16, '600', t.destructive)}>Sign Out</Text>
            </Pressable>
          </View>

          <Text style={{ fontSize: 12, color: t.textTertiary, textAlign: 'center', marginTop: 20 }}>Sync Room {'\u00B7'} v0.0.1</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
