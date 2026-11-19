import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';
import { DateTime } from 'luxon';

import { useAppContext } from '@/context/AppContext';
import { AddToCalendarRow } from '@/features/alarms/components/AddToCalendarRow';
import { armedNote, countdownClock, isUp, memberAlarmState } from '@/features/alarms/armedNote';
import { MemberTimeTable } from '@/features/rooms/components/MemberTimeTable';
import { READABLE_MAX_WIDTH } from '@/layouts/layout/useDeviceClass';
import { ConfettiPiece, SecondaryButton } from '@/shared/components/UI';
import { Toast } from '@/shared/components/Toast';
import { formatUtcClock } from '@/shared/lib/time/time.conversions';
import { useWeather, weatherAt } from '@/shared/lib/weather/openMeteo';
import { cityFromZone, SkyDial } from '@/shared/sky/SkyDial';
import { localMinutes } from '@/shared/sky/skyGeometry';
import { INK, YOU } from '@/shared/sky/skyColors';
import { SkyWindow } from '@/shared/sky/SkyWindow';
import { appFont, monoFont } from '@/shared/theme/fonts';
import { pressFeedback } from '@/shared/theme/motion';
import { SkyBackdrop } from '@/shared/visuals/SkyBackdrop';
import { skyPeriodForHour } from '@/shared/visuals/sky';

const DIM = '#8C8F99';
const WEATHER_WORD = { clear: 'Clear', cloud: 'Cloudy', rain: 'Rain', fog: 'Fog' } as const;

/** Re-renders every second while mounted (who's-up strip). */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** The sky rises into the alarm moment: 45 minutes of sky over 2.5 s, unless motion is reduced. */
function useSunrise(targetMin: number, active: boolean) {
  const reduced = useReducedMotion();
  const [min, setMin] = useState(active && !reduced ? targetMin - 45 : targetMin);
  useEffect(() => {
    if (!active || reduced) {
      setMin(targetMin);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / 2500);
      setMin(targetMin - 45 * (1 - k * (2 - k)));
      if (k >= 1) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [targetMin, active, reduced]);
  return min;
}

export default function ArmedPage() {
  const { t, confetti, armedTarget, remainingMs, alarmFired, members, you, timezone, activeRoom, onDisarm, onShare, onWakeUp, toast } =
    useAppContext();

  const tz = you?.timezone ?? timezone;
  const hasTarget = armedTarget > 0;
  const local = DateTime.fromMillis(hasTarget ? armedTarget : Date.now(), { zone: tz });
  const weather = useWeather(tz);
  const now = useNow(alarmFired);
  const alarmMin = localMinutes(hasTarget ? armedTarget : Date.now(), tz);
  const skyMin = useSunrise(alarmMin, alarmFired);
  const note = armedNote(members);
  const roomName = activeRoom?.name ?? 'SyncWorld';

  if (alarmFired) {
    const sub = [local.toFormat('a'), local.toFormat('ccc d LLL'), cityFromZone(tz), weather ? `${WEATHER_WORD[weather.kind]} ${weather.tempC}°` : null]
      .filter(Boolean)
      .join(' · ')
      .toUpperCase();
    return (
      <View style={{ flex: 1, backgroundColor: '#0E1015' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1 }}>
          <SkyWindow localMin={skyMin} weather={weather} />
          <SafeAreaView edges={['top']} style={styles.ringTop}>
            <Text style={[appFont(13, '600', YOU), styles.eyebrow]} accessibilityRole="header">
              {roomName.toUpperCase()} · IT’S TIME
            </Text>
            <View style={styles.upStrip} accessible accessibilityLabel={whoIsUpLabel(members, armedTarget, now)}>
              {members.map((m) => {
                const up = isUp(m, armedTarget, now);
                return (
                  <View key={m.id} style={[styles.upDot, up && styles.upDotOn]}>
                    <Text style={appFont(11, '700', up ? '#17120A' : INK)}>{m.initials}</Text>
                  </View>
                );
              })}
            </View>
          </SafeAreaView>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.ground}>
          <Text style={[monoFont(84, '600', INK), { letterSpacing: -3 }]} accessibilityLabel={`It is ${local.toFormat('h:mm a')}`}>
            {local.toFormat('h:mm')}
          </Text>
          <Text style={[monoFont(12, '600', DIM), { marginBottom: 24, textAlign: 'center' }]}>{sub}</Text>
          <Pressable
            onPress={onWakeUp}
            accessibilityRole="button"
            accessibilityLabel="I'm up. Stop the alarm"
            style={({ pressed }) => [styles.upBar, pressFeedback(pressed)]}
          >
            <Text style={appFont(20, '800', '#17120A')}>I’M UP</Text>
          </Pressable>
        </SafeAreaView>
        <Toast message={toast} bottom={90} />
      </View>
    );
  }

  const ticks = members.map((m) => ({
    id: m.id,
    name: m.name,
    timezone: m.timezone,
    isYou: m.isYou,
    tick: memberAlarmState(m) === 'ready' ? ('gold' as const) : ('dashed' as const),
  }));
  const STATUS = { ready: 'Ready', blocked: 'Blocked', waiting: 'Waiting' } as const;
  const status = Object.fromEntries(members.map((m) => [m.id, STATUS[memberAlarmState(m)]]));
  const skyPeriod = hasTarget ? skyPeriodForHour(local.hour) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <SkyBackdrop period={skyPeriod} />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style={t.dark ? 'light' : 'dark'} />
        {confetti.map((seed, i) => (
          <ConfettiPiece key={`c-${i}`} seed={seed} />
        ))}
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[appFont(13, '600', YOU), styles.eyebrow]} accessibilityRole="header">
            ALARM ARMED · {roomName.toUpperCase()}
          </Text>

          <View accessibilityLiveRegion="polite" style={{ width: '100%' }}>
            <SkyDial
              utcMs={hasTarget ? armedTarget : Date.now()}
              youTz={tz}
              members={ticks}
              mode="full"
              weather={weatherAt(weather, armedTarget)}
              readout={{ big: countdownClock(remainingMs), small: 'RINGS IN', small2: local.toFormat('ccc h:mm a').toUpperCase() }}
            />
          </View>
          <Text style={[monoFont(12, '500', DIM), { marginTop: 4, marginBottom: 16 }]}>
            {local.toFormat('cccc d LLLL')} · {hasTarget ? formatUtcClock(armedTarget) : ''}
          </Text>

          <View style={styles.panel}>
            {note ? (
              <View style={styles.noteRow}>
                <Text style={[appFont(14, '500', INK), { flex: 1 }]}>{note}.</Text>
                <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Remind them" hitSlop={8}>
                  <Text style={appFont(14, '700', YOU)}>Remind</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[appFont(14, '500', INK), { marginBottom: 8 }]}>Every phone is set.</Text>
            )}
            <MemberTimeTable members={members} utcMs={hasTarget ? armedTarget : Date.now()} status={status} positive={['Ready']} />
          </View>

          <AddToCalendarRow />
          <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Disarm" onPress={onDisarm} t={t} tint={t.destructive} height={46} />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Share room" onPress={onShare} t={t} tint={t.accent} height={46} />
            </View>
          </View>
        </ScrollView>
        <Toast message={toast} bottom={90} />
      </SafeAreaView>
    </View>
  );
}

function whoIsUpLabel(members: { name: string; isYou: boolean; wokeAt: number | null }[], alarmUtc: number, now: number): string {
  const up = members.filter((m) => isUp(m, alarmUtc, now)).map((m) => m.name.split(' ')[0]);
  return up.length ? `Up: ${up.join(', ')}` : 'Nobody else is up yet';
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    width: '100%',
    maxWidth: READABLE_MAX_WIDTH,
    alignSelf: 'center',
  },
  eyebrow: { letterSpacing: 0.6, marginBottom: 8, textAlign: 'center' },
  panel: {
    width: '100%',
    backgroundColor: '#0D0F14',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(233,230,223,0.16)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 },
  ringTop: { alignItems: 'center', paddingTop: 16, gap: 14 },
  upStrip: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 },
  upDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233,230,223,0.45)',
    backgroundColor: 'rgba(14,16,21,0.55)',
  },
  upDotOn: { backgroundColor: YOU, borderColor: YOU },
  ground: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#0E1015',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(233,230,223,0.35)',
  },
  upBar: {
    width: '100%',
    maxWidth: 420,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFF3D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
