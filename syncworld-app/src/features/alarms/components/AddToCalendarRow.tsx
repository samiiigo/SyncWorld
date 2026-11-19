import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppContext } from '@/context/AppContext';
import { addToCalendar, type CalendarTarget } from '@/shared/lib/calendar/addToCalendar';
import { appFont } from '@/shared/theme/fonts';
import { pressFeedback } from '@/shared/theme/motion';
import { GlassSurface } from '@/shared/visuals/glass/GlassSurface';

const TARGETS: { id: CalendarTarget; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'google', label: 'Google', icon: 'logo-google' },
  { id: 'outlook', label: 'Outlook', icon: 'mail-outline' },
  { id: 'ics', label: 'Other (.ics)', icon: 'calendar-outline' },
];

/**
 * "Add to calendar" for the agreed time. Works with any calendar and needs no
 * sign-in: Google and Outlook open a prefilled page, everything else imports
 * the .ics file. The .ics carries a reminder at the moment (Apple Calendar and
 * other importers honour it); Google/Outlook links use the user's default reminders.
 */
export function AddToCalendarRow() {
  const { t, armedTarget, activeRoom, showToast } = useAppContext();
  if (!activeRoom || armedTarget <= 0) return null;

  const onPick = async (target: CalendarTarget) => {
    const ok = await addToCalendar(target, {
      uid: `${activeRoom.id}-${armedTarget}`,
      title: activeRoom.name,
      startUtc: armedTarget,
      // No invite URL yet: the share domain is a placeholder and calendar events keep links for years.
      // `url` is reserved for the room's meeting link once that field exists.
      description: `Agreed in SyncWorld. Room code ${activeRoom.code}.`,
    });
    if (!ok) showToast('Could not open the calendar.');
  };

  return (
    <View style={{ width: '100%', marginTop: 20 }}>
      <Text style={[appFont(11, '600', t.text), { opacity: 0.72, letterSpacing: 0.4, marginBottom: 8 }]}>ADD TO CALENDAR</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {TARGETS.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => void onPick(c.id)}
            accessibilityRole="button"
            accessibilityLabel={`Add to ${c.id === 'ics' ? 'another calendar app' : `${c.label} Calendar`}`}
            style={({ pressed }) => [{ flex: 1 }, pressFeedback(pressed)]}
          >
            <GlassSurface
              radius={999}
              style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 }}
            >
              <Ionicons name={c.icon} size={14} color={t.accent} />
              <Text style={appFont(13, '600', t.text)} numberOfLines={1}>
                {c.label}
              </Text>
            </GlassSurface>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
