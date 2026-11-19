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
import { useThemedColors } from '@/shared/theme';
import { Globe3D, type GlobePin } from '@/shared/visuals/Globe3D';
import { GlassSurface } from '@/shared/visuals/glass/GlassSurface';
import { SkyBackdrop } from '@/shared/visuals/SkyBackdrop';
import type { IANATimezone, UTCEpochMs } from '@domain/common';

/** A few cities around the world, to show the idea before you have a room. */
const SAMPLE_ZONES = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney', 'Asia/Kolkata'];

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
  const colors = useThemedColors();
  const pins: GlobePin[] = [
    { id: 'you', timezone, isYou: true },
    ...SAMPLE_ZONES.filter((z) => z !== timezone).map((z) => ({ id: z, timezone: z })),
  ];

  const go = (next: () => void) => {
    if (!ready) return;
    enterApp();
    // Open the sheet once the rooms tab is mounted.
    setTimeout(next, 250);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
    <SkyBackdrop />
    <SafeAreaView style={{ flex: 1 }}>
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
            hitSlop={4}
          >
            <GlassSurface radius={22} variant="clear" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.dark ? 'sunny-outline' : 'moon-outline'} size={18} color={t.text} />
            </GlassSurface>
          </Pressable>
        </View>

        {/* Live globe: today's daylight, your zone in gold facing you. */}
        <Globe3D size={220} pins={pins} faceTimezone={timezone} style={{ marginTop: 4, marginBottom: 20 }} />

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
              height: 48,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              backgroundColor: colors.glassFillStrong,
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
    </View>
  );
}
