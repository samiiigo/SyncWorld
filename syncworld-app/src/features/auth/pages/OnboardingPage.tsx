import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAppContext } from '@/context/AppContext';
import { READABLE_MAX_WIDTH } from '@/layouts/layout/useDeviceClass';
import { PrimaryButton, SecondaryButton } from '@/shared/components/UI';
import { cityFromTimezone, getMemberOffsetLabel } from '@/shared/lib/time/time.conversions';
import { appFont } from '@/shared/theme/fonts';
import { BorderRadius } from '@/shared/theme/constants';
import type { IANATimezone, UTCEpochMs } from '@domain/common';

export default function OnboardingPage() {
  const {
    displayName,
    setDisplayName,
    enterApp,
    onTapCreate,
    onTapJoin,
    timezone,
    t,
    themePreference,
    setThemePreference,
    backendKind,
  } = useAppContext();
  const ready = displayName.trim().length > 0;

  const go = (next: () => void) => {
    if (!ready) return;
    enterApp();
    // Open the sheet once the rooms tab is mounted.
    setTimeout(next, 250);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: 28,
          paddingTop: 24,
          paddingBottom: 32,
          width: '100%',
          maxWidth: READABLE_MAX_WIDTH,
          alignSelf: 'center',
        }}
      >
        <View style={{ alignSelf: 'flex-end' }}>
          <Pressable
            onPress={() => setThemePreference(themePreference === 'light' ? 'dark' : 'light')}
            accessibilityRole="button"
            accessibilityLabel={t.dark ? 'Switch to light mode' : 'Switch to dark mode'}
            hitSlop={10}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface2 }}
          >
            <Ionicons name={t.dark ? 'sunny-outline' : 'moon-outline'} size={18} color={t.text} />
          </Pressable>
        </View>

        <View style={{ width: 132, height: 132, marginTop: 24, marginBottom: 36 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 66, borderWidth: 2, borderColor: t.accent, opacity: 0.9 }} />
          <View style={{ position: 'absolute', left: -14, right: -14, top: 31, height: 70, borderWidth: 1.5, borderColor: t.textTertiary, borderRadius: 40, opacity: 0.5 }} />
          <View style={{ position: 'absolute', top: -10, bottom: -10, left: 31, width: 70, borderWidth: 1.5, borderColor: t.textTertiary, borderRadius: 40, opacity: 0.35 }} />
          <View style={{ position: 'absolute', top: 26, left: 26, right: 26, bottom: 26, borderRadius: 40, backgroundColor: t.accent, opacity: 0.1 }} />
        </View>

        <Text style={[appFont(34, '600', t.text), { letterSpacing: -0.374, marginBottom: 8 }]} accessibilityRole="header">
          SyncWorld
        </Text>
        <Text style={[appFont(17, '400', t.textTertiary), { textAlign: 'center', marginBottom: 36 }]}>
          One time. Every timezone.
        </Text>

        <View style={{ width: '100%' }}>
          <Text style={[appFont(13, '600', t.textTertiary), { marginBottom: 8 }]}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Jordan"
            placeholderTextColor={t.textTertiary}
            maxLength={64}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={() => go(onTapCreate)}
            accessibilityLabel="Display name"
            style={{
              height: 46,
              borderWidth: 1,
              borderColor: t.hairline,
              backgroundColor: t.surface,
              borderRadius: BorderRadius.input,
              paddingHorizontal: 14,
              color: t.text,
              fontSize: 16,
            }}
          />
          <Text style={[appFont(12, '400', t.textTertiary), { marginTop: 8 }]}>
            Your time zone: {cityFromTimezone(timezone)} ({getMemberOffsetLabel(timezone as IANATimezone, Date.now() as UTCEpochMs)}) — detected
            automatically.
          </Text>
        </View>

        <View style={{ width: '100%', marginTop: 'auto', paddingTop: 32, gap: 12 }}>
          <PrimaryButton label="Create Room" disabled={!ready} onPress={() => go(onTapCreate)} t={t} />
          <SecondaryButton label="Join Room" disabled={!ready} onPress={() => go(onTapJoin)} t={t} />
          {backendKind === 'demo' ? (
            <Text style={[appFont(12, '400', t.textTertiary), { textAlign: 'center' }]}>
              Demo mode — rooms and members are simulated on this device.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
