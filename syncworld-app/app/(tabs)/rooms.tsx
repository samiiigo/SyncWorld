import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  useAppContext,
  norm,
  localHourFor,
  formatLocal,
  formatUtc,
  initialsOf,
  genCode,
  statusColorFor,
  statusLabelFor,
  withAlpha,
  MEMBERS,
  CAP_OPTIONS,
  type Room,
  type SyncTheme,
} from '../../src/context/AppContext';
import {
  PrimaryButton,
  SecondaryButton,
  SegButton,
  SheetHeader,
} from '../../src/components/UI';
import { appFont } from '../../src/theme/fonts';
import { BorderRadius } from '../../src/theme/constants';

export default function RoomsScreen() {
  const {
    t,
    rooms,
    activeRoom,
    activeRoomId,
    openRoom,
    leaveRoom,
    onTapCreate,
    onTapJoin,
    exitToList,
    layout,
    setLayout,
    thumbPercent,
    scrubberHour,
    pan,
    onTrackLayout,
    ghostMarkers,
    members,
    dragging,
    proposeDisabled,
    onPropose,
    sheetStep,
    closeSheet,
    roomName,
    setRoomName,
    participantCap,
    setParticipantCap,
    onSubmitCreate,
    joinCode,
    setJoinCode,
    onSubmitJoin,
    codeRefs,
    applyPaste,
    voteOpen,
    proposed,
    onVoteYes,
    onVoteNo,
    votedCount,
    remainingSec,
    permissionOpen,
    commitPending,
    toast,
  } = useAppContext();

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
          {activeRoom ? (
            <Pressable onPress={exitToList} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: t.accent, fontSize: 26 }}>{'\u2039'}</Text>
            </Pressable>
          ) : (
            <View style={{ width: 44, height: 44 }} />
          )}
          <Text style={appFont(17, '600', t.text)}>
            {activeRoom ? activeRoom.name : 'Rooms'}
          </Text>
          {!activeRoom ? (
            <Pressable onPress={onTapCreate} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={26} color={t.accent} />
            </Pressable>
          ) : (
            <View style={{ width: 44, height: 44 }} />
          )}
        </View>

        {/* Rooms list or Room detail */}
        {!activeRoom ? (
          <RoomsManager
            rooms={rooms}
            onOpen={openRoom}
            onLeave={leaveRoom}
            onCreate={onTapCreate}
            onJoin={onTapJoin}
            t={t}
          />
        ) : (
          <View style={{ flex: 1 }}>
            {/* Scrubber area */}
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6, backgroundColor: t.surface2, borderRadius: 10, padding: 3, width: 160, marginBottom: 12 }}>
                <SegButton label="Layout A" active={layout === 'A'} onPress={() => setLayout('A')} t={t} />
                <SegButton label="Layout B" active={layout === 'B'} onPress={() => setLayout('B')} t={t} />
              </View>

              {layout === 'A' ? (
                <View>
                  <View style={{ marginTop: 34 }}>
                    {/* Proposed badge */}
                    <View
                      pointerEvents="none"
                      style={{ position: 'absolute', bottom: 68, left: `${thumbPercent}%`, transform: [{ translateX: -50 }], backgroundColor: t.text, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, zIndex: 3 }}
                    >
                      <Text style={{ color: t.bg, fontSize: 13, fontWeight: '600' }}>{formatUtc(scrubberHour)}</Text>
                    </View>

                    {/* Track */}
                    <View onLayout={onTrackLayout} {...pan.panHandlers} style={{ height: 60, borderRadius: 30, overflow: 'hidden', flexDirection: 'row' }}>
                      <View style={{ flex: 25, backgroundColor: t.sleepBg }} />
                      <View style={{ flex: 50, backgroundColor: t.businessBg }} />
                      <View style={{ flex: 16.6, backgroundColor: t.eveningBg }} />
                      <View style={{ flex: 8.4, backgroundColor: t.sleepBg }} />
                    </View>

                    {/* Ghost markers */}
                    {ghostMarkers.map((h, i) => (
                      <View
                        key={`gm-${i}`}
                        pointerEvents="none"
                        style={{ position: 'absolute', bottom: 2, left: `${(norm(h) / 24) * 100}%`, width: 2, height: 14, backgroundColor: t.textTertiary, opacity: 0.55 }}
                      />
                    ))}

                    {/* Thumb */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: `${thumbPercent}%`,
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: t.surface,
                        borderWidth: 3,
                        borderColor: t.accent,
                        transform: [{ translateX: -22 }],
                      }}
                    />
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 12 }}>
                    {members.map((m) => (
                      <View key={m.id} style={{ alignItems: 'center', gap: 5, minWidth: 50 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.hairline, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: t.text }}>{m.initials}</Text>
                        </View>
                        <View style={{ paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, backgroundColor: m.pc.bg }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: m.pc.fg }}>{m.localLabel}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={{ position: 'relative' }}>
                  <View onLayout={onTrackLayout} {...pan.panHandlers} style={{ position: 'absolute', top: -6, bottom: -6, left: 70, right: 62, zIndex: 2 }}>
                    <View pointerEvents="none" style={{ position: 'absolute', top: -30, bottom: 0, left: `${thumbPercent}%`, width: 2, backgroundColor: t.accent }} />
                    <View pointerEvents="none" style={{ position: 'absolute', top: -30, left: `${thumbPercent}%`, transform: [{ translateX: -30 }], backgroundColor: t.text, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 9 }}>
                      <Text style={{ color: t.bg, fontSize: 11, fontWeight: '600' }}>{formatUtc(scrubberHour)}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 7, paddingTop: 2 }}>
                    {members.map((m) => (
                      <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 26 }}>
                        <Text style={{ width: 54, fontSize: 11, color: t.textTertiary }} numberOfLines={1}>
                          {m.cityShort}
                        </Text>
                        <View style={{ flex: 1, height: 20, borderRadius: 10, backgroundColor: m.pc.bg }}>
                          <View style={{ position: 'absolute', top: 5, left: `${m.localPct}%`, width: 10, height: 10, borderRadius: 5, backgroundColor: m.pc.fg, transform: [{ translateX: -5 }] }} />
                        </View>
                        <Text style={{ width: 56, textAlign: 'right', fontSize: 12, fontWeight: '600', color: t.text }}>{m.localLabel}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Members list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4 }]}>MEMBERS</Text>
              <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, overflow: 'hidden' }}>
                {members.map((m, i) => (
                  <View
                    key={m.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: i === members.length - 1 ? 0 : 1,
                      borderBottomColor: t.hairline,
                      backgroundColor: dragging && m.isYou ? withAlpha(t.accent, 0.08) : 'transparent',
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: t.text }}>{m.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={appFont(16, '500', t.text)}>{m.name}</Text>
                      <Text style={{ fontSize: 12, color: t.textTertiary, marginTop: 1 }}>
                        {m.city} ({m.tzLabel})
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={appFont(16, '600', t.text)}>{m.localLabel}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColorFor(m.status, t) }} />
                        <Text style={{ fontSize: 11, color: t.textTertiary }}>{statusLabelFor(m.status)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: t.hairline, backgroundColor: t.surface }}>
              {proposeDisabled && (
                <View style={{ position: 'absolute', top: -30, left: 20, backgroundColor: t.text, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                  <Text style={{ color: t.bg, fontSize: 12 }}>Waiting for more members{'\u2026'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Propose This Time" disabled={proposeDisabled} onPress={onPropose} t={t} height={48} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ───────── Create sheet ───────── */}
      <Modal visible={sheetStep === 'create'} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ height: '84%', backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <SheetHeader title="New Room" onClose={closeSheet} action="Create" actionEnabled={!!roomName.trim()} onAction={onSubmitCreate} t={t} />
            <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }}>
              <View>
                <Text style={[appFont(13, '600', t.textTertiary), { marginBottom: 8 }]}>Room name</Text>
                <TextInput
                  value={roomName}
                  onChangeText={setRoomName}
                  placeholder="e.g. Design Team Standup"
                  placeholderTextColor={t.textTertiary}
                  style={{ height: 46, borderWidth: 1, borderColor: t.hairline, backgroundColor: t.bg, borderRadius: BorderRadius.md, paddingHorizontal: 14, color: t.text, fontSize: 16 }}
                />
              </View>

              <View>
                <Text style={[appFont(12, '600', t.text), { marginBottom: 8 }]}>Participant cap</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CAP_OPTIONS.map((opt) => {
                    const selected = participantCap === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setParticipantCap(opt)}
                        style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: selected ? t.accent : t.hairline, backgroundColor: selected ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? '#fff' : t.text }}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ borderWidth: 1, borderColor: t.hairline, borderRadius: 18, padding: 16 }}>
                <Text style={[appFont(16, '600', t.text), { marginBottom: 4 }]}>Share link</Text>
                <Text style={{ fontSize: 13, color: t.textTertiary, marginBottom: 10 }}>sync.app/j/{genCode(roomName)}</Text>
                <View style={{ alignSelf: 'flex-start', backgroundColor: t.surface2, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Text style={{ fontFamily: undefined, fontSize: 18, fontWeight: '700', letterSpacing: 2, color: t.accent }}>{genCode(roomName)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ───────── Join sheet ───────── */}
      <Modal visible={sheetStep === 'join'} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ height: '60%', backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <SheetHeader title="Join Room" onClose={closeSheet} action="Join" actionEnabled={joinCode.every((c) => c)} onAction={onSubmitJoin} t={t} />
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 }}>
              <Text style={[appFont(12, '600', t.text), { marginBottom: 16 }]}>Enter 6-character code</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {joinCode.map((val, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => {
                      codeRefs.current[i] = el;
                    }}
                    value={val}
                    onChangeText={(text) => {
                      const ch = (text || '').slice(-1).toUpperCase();
                      const arr = [...joinCode];
                      arr[i] = ch;
                      setJoinCode(arr);
                      if (ch && i < 5) codeRefs.current[i + 1]?.focus();
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !joinCode[i] && i > 0) codeRefs.current[i - 1]?.focus();
                    }}
                    maxLength={1}
                    autoCapitalize="characters"
                    style={{ width: 44, height: 52, textAlign: 'center', borderWidth: 1, borderColor: t.hairline, borderRadius: 10, fontSize: 20, color: t.text, backgroundColor: t.bg }}
                  />
                ))}
              </View>
              <Pressable onPress={() => applyPaste('SYNC42')} style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, borderColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.accent }}>Paste</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── Vote dialog ───────── */}
      <Modal visible={voteOpen} transparent animationType="fade">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ width: 320, backgroundColor: t.surface, borderRadius: 24, padding: 28, alignItems: 'center' }}>
            <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, marginBottom: 14 }]}>PROPOSED TIME</Text>
            <Text style={appFont(44, '600', t.text)}>{formatLocal(localHourFor(members[0]?.offset || 0, proposed)).label}</Text>
            <Text style={{ fontSize: 12, color: t.textTertiary, marginBottom: 24 }}>{formatUtc(proposed)}</Text>

            <View style={{ width: '100%', gap: 10, marginBottom: 20 }}>
              <Pressable onPress={onVoteYes} style={{ height: 56, borderRadius: 16, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>Yes</Text>
              </Pressable>
              <Pressable onPress={onVoteNo} style={{ height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: t.destructive, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: t.destructive }}>No</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <Text style={{ fontSize: 13, color: t.textTertiary }}>
                {votedCount} of {members.length} voted
              </Text>
              <Text style={{ fontSize: 13, color: t.textTertiary }}>
                {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── Permission dialog ───────── */}
      <Modal visible={permissionOpen} transparent animationType="fade">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ width: 270, backgroundColor: t.surface, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ padding: 18, alignItems: 'center' }}>
              <Text style={[appFont(15, '600', t.text), { textAlign: 'center', marginBottom: 6 }]}>
                "Sync Room" Would Like to Send You Notifications
              </Text>
              <Text style={{ fontSize: 12.5, color: t.textTertiary, textAlign: 'center', lineHeight: 18 }}>
                Notifications may include alerts, sounds, and alarm reminders.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.hairline }}>
              <Pressable onPress={commitPending} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: t.hairline }}>
                <Text style={{ fontSize: 15, color: t.textTertiary }}>Don't Allow</Text>
              </Pressable>
              <Pressable onPress={commitPending} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: t.accent }}>Allow</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── Toast ───────── */}
      {toast && (
        <View style={{ position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: t.text, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, zIndex: 10 }}>
          <Text style={{ color: t.bg, fontSize: 13, fontWeight: '500' }}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// Rooms manager helper sub-component
// ──────────────────────────────────────────────

function RoomsManager({
  rooms,
  onOpen,
  onLeave,
  onCreate,
  onJoin,
  t,
}: {
  rooms: Room[];
  onOpen: (id: string) => void;
  onLeave: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  t: SyncTheme;
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4 }]}>YOUR ROOMS</Text>

      {rooms.length === 0 ? (
        <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, paddingVertical: 36, paddingHorizontal: 20, alignItems: 'center', gap: 6 }}>
          <Ionicons name="alarm-outline" size={36} color={t.textTertiary} />
          <Text style={appFont(16, '600', t.text)}>No rooms yet</Text>
          <Text style={{ fontSize: 13, color: t.textTertiary, textAlign: 'center' }}>Create a room or join one with a code to start coordinating a time.</Text>
        </View>
      ) : (
        <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, overflow: 'hidden' }}>
          {rooms.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => onOpen(r.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: i === rooms.length - 1 ? 0 : 1,
                borderBottomColor: t.hairline,
                backgroundColor: pressed ? withAlpha(t.accent, 0.06) : 'transparent',
              })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: withAlpha(t.accent, 0.15), alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="alarm" size={20} color={t.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={appFont(16, '600', t.text)}>{r.name}</Text>
                <Text style={{ fontSize: 12, color: t.textTertiary, marginTop: 1 }}>
                  Code {r.code} {'\u00B7'} {MEMBERS.length} members
                </Text>
              </View>
              <Pressable onPress={() => onLeave(r.id)} hitSlop={10} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={t.textTertiary} />
              </Pressable>
              <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: 12, marginTop: 20 }}>
        <PrimaryButton label="Create Room" onPress={onCreate} t={t} />
        <SecondaryButton label="Join Room" onPress={onJoin} t={t} />
      </View>
    </ScrollView>
  );
}
