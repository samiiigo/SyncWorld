// Prototype Layout B: one 48h row per member in their own zone, with a shared
// cursor at the scrubber position. Read-only; the TimeScrubber drives it.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MemberView } from '@/context/AppContext';
import { useThemedColors, withAppFont } from '@/shared/theme';
import type { ColorPalette } from '@/shared/theme/colorPalettes';
import { bandsForWindow } from './scrubberBands';

const periodBg = (c: ColorPalette, p: 'sleep' | 'business' | 'evening') =>
  p === 'sleep' ? c.sleepBg : p === 'evening' ? c.eveningBg : c.businessBg;

export function MemberTimelines({
  members,
  windowStart,
  thumbPercent,
}: {
  members: MemberView[];
  windowStart: number;
  thumbPercent: number;
}) {
  const colors = useThemedColors();
  const rows = useMemo(
    () => members.map((m) => ({ member: m, bands: bandsForWindow(windowStart, m.timezone) })),
    [members, windowStart],
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {rows.map(({ member, bands }) => (
        <View
          key={member.id}
          style={styles.row}
          accessible
          accessibilityLabel={`${member.name}, ${member.city}: ${member.dayLabel} ${member.localLabel}${member.lateNight ? ', late night' : ''}`}
        >
          <Text style={[styles.city, { color: colors.textSecondary }]} numberOfLines={1}>
            {member.isYou ? 'You' : member.city}
          </Text>
          <View style={[styles.bar, { borderColor: colors.border }]}>
            {bands.map((b, i) => (
              <View key={i} style={{ flex: b.flex, backgroundColor: periodBg(colors, b.period) }} />
            ))}
            <View style={[styles.cursor, { left: `${thumbPercent}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.time, { color: member.lateNight ? colors.orange : colors.textPrimary }]}>
            {member.localLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 24,
  },
  city: withAppFont({ width: 72, fontSize: 12, fontWeight: '500' }),
  bar: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
  },
  cursor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  time: withAppFont({ width: 68, textAlign: 'right', fontSize: 12, fontWeight: '600' }),
});
