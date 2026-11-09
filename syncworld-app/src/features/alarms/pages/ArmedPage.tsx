import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAppContext } from '@/context/AppContext';
import { READABLE_MAX_WIDTH } from '@/layouts/layout/useDeviceClass';
import { ConfettiPiece, SecondaryButton } from '@/shared/components/UI';
import { Toast } from '@/shared/components/Toast';
import { formatLocalTime, formatUtcClock, relativeDayLabel } from '@/shared/lib/time/time.conversions';
import { appFont } from '@/shared/theme/fonts';

export default function ArmedPage() {
  const {
    t,
    colors,
    confetti,
    armedTarget,
    countdownLabel,
    alarmFired,
    members,
    you,
    timezone,
    activeRoom,
    onDisarm,
    onShare,
    toast,
  } = useAppContext();

  const tz = you?.timezone ?? timezone;
  const armedCount = members.filter((m) => m.alarmArmed).length;
  const hasTarget = armedTarget > 0;
  const localTime = hasTarget ? formatLocalTime(armedTarget, tz) : '--:--';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      {confetti.map((seed, i) => (
        <ConfettiPiece key={`c-${i}`} seed={seed} />
      ))}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: 28,
          paddingTop: 40,
          paddingBottom: 24,
          width: '100%',
          maxWidth: READABLE_MAX_WIDTH,
          alignSelf: 'center',
        }}
      >
        <Text
          style={[appFont(13, '600', alarmFired ? t.destructive : t.accent), { letterSpacing: 0.4, marginBottom: 18 }]}
          accessibilityRole="header"
        >
          {alarmFired ? 'IT’S TIME' : 'ALARM ARMED'}
        </Text>
        <Text style={appFont(64, '600', t.text)} accessibilityLabel={`Alarm at ${localTime} your time`}>
          {localTime}
        </Text>
        <Text style={{ fontSize: 13, color: t.textTertiary, marginBottom: 28 }}>
          {hasTarget ? `${relativeDayLabel(armedTarget, tz)} · ${formatUtcClock(armedTarget)}` : ''}
        </Text>

        <View
          style={{ backgroundColor: t.surface2, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 36 }}
          accessibilityLiveRegion="polite"
        >
          <Text style={appFont(17, '600', t.accent)}>{alarmFired ? 'Ringing now on every device' : countdownLabel}</Text>
        </View>

        <View style={{ width: '100%', marginBottom: 28 }}>
          <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, marginBottom: 10 }]}>
            MEMBERS ARMING · {armedCount}/{members.length}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {members.map((m) => (
              <View
                key={m.id}
                style={{ alignItems: 'center', gap: 5, width: 64 }}
                accessible
                accessibilityLabel={`${m.name}: ${m.alarmArmed ? 'armed' : 'arming'}, ${formatLocalTime(armedTarget, m.timezone)} local`}
              >
                <View style={{ width: 40, height: 40 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: t.surface2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.text }}>{m.initials}</Text>
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: m.alarmArmed ? t.success : t.textTertiary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: t.bg,
                    }}
                  >
                    <Text style={{ fontSize: 9, color: colors.onPrimary }}>{m.alarmArmed ? '✔' : '⏳'}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: t.textTertiary }} numberOfLines={1}>
                  {m.alarmArmed ? 'Armed' : 'Arming…'}
                </Text>
                {hasTarget ? (
                  <Text style={{ fontSize: 10, color: t.text }} numberOfLines={1}>
                    {formatLocalTime(armedTarget, m.timezone)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={{ width: '100%', backgroundColor: t.surface2, borderRadius: 18, padding: 14, marginBottom: 'auto' }}>
          <Text style={[appFont(11, '600', t.textTertiary), { letterSpacing: 0.4, marginBottom: 8 }]}>LOCK SCREEN PREVIEW</Text>
          <View
            style={{
              backgroundColor: colors.inverseSurface,
              borderRadius: 14,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: t.accent }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inverseText }} numberOfLines={1}>
                {activeRoom?.name ?? 'SyncWorld'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.inverseText, opacity: 0.7 }}>{countdownLabel}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inverseText }}>{localTime}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 24 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Disarm Alarm" onPress={onDisarm} t={t} tint={t.destructive} height={46} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Share Room" onPress={onShare} t={t} tint={t.accent} height={46} />
          </View>
        </View>
      </ScrollView>
      <Toast message={toast} bottom={90} />
    </SafeAreaView>
  );
}
