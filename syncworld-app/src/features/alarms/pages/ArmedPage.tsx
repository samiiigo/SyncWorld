import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAppContext } from '@/context/AppContext';
import { AddToCalendarRow } from '@/features/alarms/components/AddToCalendarRow';
import { READABLE_MAX_WIDTH } from '@/layouts/layout/useDeviceClass';
import { ConfettiPiece, SecondaryButton } from '@/shared/components/UI';
import { Toast } from '@/shared/components/Toast';
import { formatLocalTime, formatUtcClock, relativeDayLabel } from '@/shared/lib/time/time.conversions';
import { appFont, monoFont } from '@/shared/theme/fonts';
import { SunOrb3D } from '@/shared/visuals/SunOrb3D';
import { Globe3D } from '@/shared/visuals/Globe3D';
import { GlassSurface } from '@/shared/visuals/glass/GlassSurface';
import { SkyBackdrop } from '@/shared/visuals/SkyBackdrop';
import { skyPeriodForHour } from '@/shared/visuals/sky';
import { DateTime } from 'luxon';

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
  // The sky you'll wake up under.
  // While it rings, everyone gets the dawn sky.
  const skyPeriod = alarmFired
    ? 'dawn'
    : hasTarget
      ? skyPeriodForHour(DateTime.fromMillis(armedTarget, { zone: tz }).hour)
      : undefined;
  const pins = members.map((m) => ({ id: m.id, timezone: m.timezone, isYou: m.id === you?.id }));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
    <SkyBackdrop period={skyPeriod} />
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      {confetti.map((seed, i) => (
        <ConfettiPiece key={`c-${i}`} seed={seed} />
      ))}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: 28,
          paddingTop: 16,
          paddingBottom: 24,
          width: '100%',
          maxWidth: READABLE_MAX_WIDTH,
          alignSelf: 'center',
        }}
      >
        {alarmFired ? (
          // Ringing: the waking sun (ShaderGradient sphere), pulsing.
          <SunOrb3D size={200} style={{ marginBottom: 4 }} />
        ) : (
          // Armed: daylight at the alarm moment, and the room's constellation
          // joining every member's pin.
          <Globe3D
            size={190}
            pins={pins}
            at={hasTarget ? armedTarget : undefined}
            faceTimezone={tz}
            constellation
            style={{ marginBottom: 4 }}
          />
        )}
        <Text
          style={[appFont(13, '600', alarmFired ? t.destructive : t.accent), { letterSpacing: 0.4, marginBottom: 18 }]}
          accessibilityRole="header"
        >
          {alarmFired ? 'IT’S TIME' : 'ALARM ARMED'}
        </Text>
        <Text style={[monoFont(60, '600', t.text), { letterSpacing: -2 }]} accessibilityLabel={`Alarm at ${localTime} your time`}>
          {localTime}
        </Text>
        <Text style={[monoFont(13, '500', t.textTertiary), { marginBottom: 28 }]}>
          {hasTarget ? `${relativeDayLabel(armedTarget, tz)} · ${formatUtcClock(armedTarget)}` : ''}
        </Text>

        <GlassSurface
          radius={22}
          style={{ paddingVertical: 10, paddingHorizontal: 20, marginBottom: 32 }}
          accessibilityLiveRegion="polite"
        >
          <Text style={monoFont(17, '600', t.accent)}>{alarmFired ? 'Ringing now on every device' : countdownLabel}</Text>
        </GlassSurface>

        <View style={{ width: '100%', marginBottom: 28 }}>
          <Text style={[appFont(12, '600', t.text), { opacity: 0.72, letterSpacing: 0.4, marginBottom: 10 }]}>
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
                      backgroundColor: colors.glassFillStrong,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={appFont(13, '600', t.text)}>{m.initials}</Text>
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
                    <Ionicons name={m.alarmArmed ? 'checkmark' : 'hourglass-outline'} size={10} color={colors.onPrimary} />
                  </View>
                </View>
                <Text style={appFont(10, '500', t.textTertiary)} numberOfLines={1}>
                  {m.alarmArmed ? 'Armed' : 'Arming…'}
                </Text>
                {hasTarget ? (
                  <Text style={monoFont(10, '500', t.text)} numberOfLines={1}>
                    {formatLocalTime(armedTarget, m.timezone)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <GlassSurface radius={18} style={{ width: '100%', padding: 14, marginBottom: 'auto' }}>
          <Text style={[appFont(11, '600', t.text), { opacity: 0.72, letterSpacing: 0.4, marginBottom: 8 }]}>LOCK SCREEN PREVIEW</Text>
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
              <Text style={appFont(12, '600', colors.inverseText)} numberOfLines={1}>
                {activeRoom?.name ?? 'SyncWorld'}
              </Text>
              <Text style={[monoFont(11, '500', colors.inverseText), { opacity: 0.7 }]}>{countdownLabel}</Text>
            </View>
            <Text style={monoFont(15, '600', colors.inverseText)}>{localTime}</Text>
          </View>
        </GlassSurface>

        <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 24 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Disarm Alarm" onPress={onDisarm} t={t} tint={t.destructive} height={46} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Share Room" onPress={onShare} t={t} tint={t.accent} height={46} />
          </View>
        </View>
        {alarmFired ? null : <AddToCalendarRow />}
      </ScrollView>
      <Toast message={toast} bottom={90} />
    </SafeAreaView>
    </View>
  );
}
