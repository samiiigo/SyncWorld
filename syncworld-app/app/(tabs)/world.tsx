import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  useAppContext,
  localHourFor,
  periodOf,
  periodColors,
  formatLocal,
  MEMBERS,
} from '../../src/context/AppContext';
import { appFont } from '../../src/theme/fonts';

export default function WorldScreen() {
  const { now, t } = useAppContext();
  const utcHour = (now / 3600000) % 24;

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
          <Text style={appFont(17, '600', t.text)}>World</Text>
          <View style={{ width: 44, height: 44 }} />
        </View>

        {/* World Clock List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 10 }}>
          <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4 }]}>WORLD CLOCK</Text>
          <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, overflow: 'hidden' }}>
            {MEMBERS.map((m, i) => {
              const localHour = localHourFor(m.offset, utcHour);
              const period = periodOf(localHour);
              const pc = periodColors(period, t);
              const periodLabel = period === 'sleep' ? 'Night' : period === 'evening' ? 'Evening' : 'Daytime';
              return (
                <View
                  key={m.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: i === MEMBERS.length - 1 ? 0 : 1,
                    borderBottomColor: t.hairline,
                  }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pc.fg }} />
                  <View style={{ flex: 1 }}>
                    <Text style={appFont(16, '500', t.text)}>{m.city}</Text>
                    <Text style={{ fontSize: 12, color: t.textTertiary, marginTop: 1 }}>
                      {m.tzLabel} {'\u00B7'} {periodLabel}
                    </Text>
                  </View>
                  <Text style={appFont(20, '600', t.text)}>{formatLocal(localHour).label}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
