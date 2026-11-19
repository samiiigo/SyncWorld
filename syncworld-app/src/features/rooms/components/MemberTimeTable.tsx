// ──────────────────────────────────────────────
// MemberTimeTable.tsx — who, their local time at one instant, an
// early/late word, and an optional status (vote or alarm state).
// ──────────────────────────────────────────────

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatLocalTime } from '@/shared/lib/time/time.conversions';
import { localMinutes, oddHour } from '@/shared/sky/skyGeometry';
import { cityFromZone } from '@/shared/sky/SkyDial';
import { INK, ODD, YOU } from '@/shared/sky/skyColors';
import { withAppFont } from '@/shared/theme';
import { withMonoFont } from '@/shared/theme/fonts';

export type TableMember = { id: string; name: string; timezone: string; isYou: boolean };

type Props = {
  members: TableMember[];
  utcMs: number;
  /** Text for the right-hand column, keyed by member id. */
  status?: Record<string, string>;
  /** Status values drawn in the accent colour (e.g. "Agreed", "Ready"). */
  positive?: string[];
};

const DIM = '#8C8F99';

export function MemberTimeTable({ members, utcMs, status, positive = [] }: Props) {
  return (
    <View style={styles.table}>
      {members.map((m, i) => {
        const odd = oddHour(localMinutes(utcMs, m.timezone));
        const time = formatLocalTime(utcMs, m.timezone);
        const st = status?.[m.id];
        return (
          <View
            key={m.id}
            style={[styles.row, i > 0 && styles.divider]}
            accessible
            accessibilityLabel={`${m.name}${m.isYou ? ' (you)' : ''}, ${cityFromZone(m.timezone)}, ${time}${odd ? `, ${odd}` : ''}${st ? `, ${st}` : ''}`}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, m.isYou && { color: YOU }]} numberOfLines={1}>
                {m.name.split(' ')[0]}
                {m.isYou ? ' (you)' : ''}
              </Text>
              <Text style={styles.city} numberOfLines={1}>
                {cityFromZone(m.timezone)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.time, odd && { color: ODD }]}>{time}</Text>
              {odd ? <Text style={styles.odd}>{odd}</Text> : null}
            </View>
            {status ? (
              <Text style={[styles.status, st && positive.includes(st) && { color: YOU }]} numberOfLines={1}>
                {st ?? ''}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(233,230,223,0.16)' },
  name: withAppFont({ fontSize: 15, fontWeight: '600', color: INK }),
  city: withAppFont({ fontSize: 12, color: DIM }),
  time: withMonoFont({ fontSize: 14, fontWeight: '600', color: INK }),
  odd: withAppFont({ fontSize: 12, color: ODD }),
  status: withAppFont({ fontSize: 13, color: DIM, width: 64, textAlign: 'right' }),
});
