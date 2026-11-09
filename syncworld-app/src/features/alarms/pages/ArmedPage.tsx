import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAppContext, localHourFor, formatLocal, formatUtc } from '@/context/AppContext';
import { ConfettiPiece, SecondaryButton } from '@/shared/components/UI';
import { appFont } from '@/shared/theme/fonts';

export default function ArmedPage() {
  const {
    t,
    confetti,
    youOffset,
    proposed,
    countdownLabel,
    members,
    armingStatus,
    onDisarm,
    onShare,
  } = useAppContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 40, paddingBottom: 24, overflow: 'hidden' }}>
        {confetti.map((seed, i) => (
          <ConfettiPiece key={`c-${i}`} seed={seed} />
        ))}

        <Text style={[appFont(13, '600', t.accent), { letterSpacing: 0.4, marginBottom: 18 }]}>ALARM ARMED</Text>
        <Text style={appFont(64, '600', t.text)}>{formatLocal(localHourFor(youOffset, proposed)).label}</Text>
        <Text style={{ fontSize: 13, color: t.textTertiary, marginBottom: 28 }}>{formatUtc(proposed)}</Text>

        <View style={{ backgroundColor: t.surface2, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 36 }}>
          <Text style={appFont(17, '600', t.accent)}>{countdownLabel}</Text>
        </View>

        <View style={{ width: '100%', marginBottom: 28 }}>
          <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, marginBottom: 10 }]}>MEMBERS ARMING</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {members.map((m) => {
              const armed = m.isYou ? true : !!armingStatus[m.id];
              return (
                <View key={m.id} style={{ alignItems: 'center', gap: 5, width: 58 }}>
                  <View style={{ width: 40, height: 40 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: t.text }}>{m.initials}</Text>
                    </View>
                    <View style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: armed ? t.success : t.textTertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.bg }}>
                      <Text style={{ fontSize: 9, color: '#fff' }}>{armed ? '\u2714' : '\u23F3'}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: t.textTertiary }} numberOfLines={1}>
                    {armed ? 'Armed' : 'Arming\u2026'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ width: '100%', backgroundColor: t.surface2, borderRadius: 18, padding: 14, marginBottom: 'auto' }}>
          <Text style={[appFont(11, '600', t.textTertiary), { letterSpacing: 0.4, marginBottom: 8 }]}>LOCK SCREEN PREVIEW</Text>
          <View style={{ backgroundColor: t.text, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: t.accent }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: t.bg }}>Sync Room</Text>
              <Text style={{ fontSize: 11, color: t.bg, opacity: 0.7 }}>{countdownLabel}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.bg }}>{formatLocal(localHourFor(youOffset, proposed)).label}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Disarm Alarm" onPress={onDisarm} t={t} tint={t.destructive} height={46} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Share Room" onPress={onShare} t={t} tint={t.accent} height={46} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
