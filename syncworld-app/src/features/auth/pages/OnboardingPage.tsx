import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAppContext } from '@/context/AppContext';
import { PrimaryButton } from '@/shared/components/UI';
import { appFont } from '@/shared/theme/fonts';
import { BorderRadius } from '@/shared/theme/constants';

export default function OnboardingPage() {
  const { displayName, setDisplayName, enterApp, t } = useAppContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 }}>
        <View style={{ width: 132, height: 132, marginTop: 24, marginBottom: 36 }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 66, borderWidth: 2, borderColor: t.accent, opacity: 0.9 }} />
          <View style={{ position: 'absolute', left: -14, right: -14, top: 31, height: 70, borderWidth: 1.5, borderColor: t.textTertiary, borderRadius: 40, opacity: 0.5 }} />
          <View style={{ position: 'absolute', top: -10, bottom: -10, left: 31, width: 70, borderWidth: 1.5, borderColor: t.textTertiary, borderRadius: 40, opacity: 0.35 }} />
          <View style={{ position: 'absolute', top: 26, left: 26, right: 26, bottom: 26, borderRadius: 40, backgroundColor: t.accent, opacity: 0.1 }} />
        </View>

        <Text style={[appFont(30, '700', t.text), { letterSpacing: 0.4, marginBottom: 8 }]}>Sync Room</Text>
        <Text style={[appFont(16, '400', t.textTertiary), { textAlign: 'center', marginBottom: 36 }]}>
          One time. Every timezone.
        </Text>

        <View style={{ width: '100%' }}>
          <Text style={[appFont(13, '600', t.textTertiary), { marginBottom: 8 }]}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Jordan"
            placeholderTextColor={t.textTertiary}
            style={{
              height: 46,
              borderWidth: 1,
              borderColor: t.hairline,
              backgroundColor: t.surface,
              borderRadius: BorderRadius.md,
              paddingHorizontal: 14,
              color: t.text,
              fontSize: 16,
            }}
          />
        </View>

        <View style={{ width: '100%', marginTop: 'auto', gap: 12 }}>
          <PrimaryButton label="Continue" disabled={!displayName.trim()} onPress={enterApp} t={t} />
        </View>
      </View>
    </SafeAreaView>
  );
}
