import React, { useState } from 'react';
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
  localHourFor,
  formatLocal,
  formatUtc,
  initialsOf,
  genCode,
  statusLabelFor,
  MEMBERS,
  CAP_OPTIONS,
  type Room,
} from '../../src/context/AppContext';
import { SheetHeader } from '../../src/components/UI';
import { BorderRadius } from '../../src/theme/constants';
import {
  BLUE_ON_DARK,
  INK_1,
  MUTED_ON_DARK,
  TILE_1,
  bandColorsForHour,
  roomTrackBandFlex,
} from '../../src/features/world/timeline';

const ROOM_ICONS = ['🏢', '🎨', '🌍', '🚀', '💬', '⏰'];

export default function RoomsScreen() {
  const {
    rooms,
    activeRoom,
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
    members,
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

  const [scrollProgress, setScrollProgress] = useState(0);
  const bands = roomTrackBandFlex();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <View
          style={{
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
          }}
        >
          {activeRoom ? (
            <>
              <Pressable
                onPress={exitToList}
                style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: BLUE_ON_DARK, fontSize: 24 }}>‹</Text>
              </Pressable>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{activeRoom.name}</Text>
              <View style={{ width: 34 }} />
            </>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 }}>Rooms</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable
                  onPress={onTapJoin}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="settings-outline" size={19} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={onTapCreate}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: BLUE_ON_DARK,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
            </>
          )}
        </View>

        {!activeRoom ? (
          <RoomsList rooms={rooms} onOpen={openRoom} onLeave={leaveRoom} onCreate={onTapCreate} onJoin={onTapJoin} />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 2 }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const max = contentSize.height - layoutMeasurement.height;
              setScrollProgress(max > 0 ? Math.max(0, Math.min(1, contentOffset.y / max)) : 1);
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 8, marginBottom: 2 }}>
              {activeRoom.name}
            </Text>
            <Text style={{ color: MUTED_ON_DARK, fontSize: 13, marginBottom: 6 }}>
              {members.length} members · finding a time
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 6,
                backgroundColor: TILE_1,
                borderRadius: 10,
                padding: 3,
                width: 148,
                marginTop: 14,
                marginBottom: 8,
              }}
            >
              <Pressable
                onPress={() => setLayout('A')}
                style={{
                  flex: 1,
                  height: 28,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: layout === 'A' ? BLUE_ON_DARK : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: layout === 'A' ? '#fff' : MUTED_ON_DARK,
                  }}
                >
                  Layout A
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLayout('B')}
                style={{
                  flex: 1,
                  height: 28,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: layout === 'B' ? BLUE_ON_DARK : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: layout === 'B' ? '#fff' : MUTED_ON_DARK,
                  }}
                >
                  Layout B ↓
                </Text>
              </Pressable>
            </View>

            {/* Layout A scrubber */}
            <View style={{ marginTop: 32, marginBottom: 14 }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: 60,
                  left: `${thumbPercent}%`,
                  transform: [{ translateX: -50 }],
                  backgroundColor: '#fff',
                  borderRadius: 11,
                  paddingVertical: 5,
                  paddingHorizontal: 11,
                  zIndex: 3,
                }}
              >
                <Text style={{ color: '#111', fontSize: 12, fontWeight: '700' }}>{formatUtc(scrubberHour)}</Text>
              </View>

              <View
                onLayout={onTrackLayout}
                {...pan.panHandlers}
                style={{ height: 52, borderRadius: 26, overflow: 'hidden', flexDirection: 'row' }}
              >
                {bands.map((b, i) => (
                  <View key={i} style={{ flex: b.flex, backgroundColor: b.color }} />
                ))}
              </View>

              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: (52 - 38) / 2,
                  left: `${thumbPercent}%`,
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: INK_1,
                  borderWidth: 3,
                  borderColor: BLUE_ON_DARK,
                  transform: [{ translateX: -19 }],
                  shadowColor: '#000',
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 4,
                }}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 6, marginBottom: 22 }}
            >
              {members.map((m) => {
                const colors = bandColorsForHour(localHourFor(m.offset, scrubberHour));
                return (
                  <View key={m.id} style={{ alignItems: 'center', gap: 5, minWidth: 48 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: TILE_1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{m.initials}</Text>
                    </View>
                    <View
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 7,
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.fg }}>{m.localLabel}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Text
              style={{
                color: MUTED_ON_DARK,
                fontSize: 12,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                marginBottom: 8,
              }}
            >
              Members
            </Text>
            <View style={{ backgroundColor: INK_1, borderRadius: 16, overflow: 'hidden', marginBottom: 26 }}>
              {members.map((m, i) => (
                <View
                  key={m.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderBottomWidth: i === members.length - 1 ? 0 : 1,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: TILE_1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{m.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: '#fff', fontWeight: '500' }}>{m.name}</Text>
                    <Text style={{ fontSize: 11, color: MUTED_ON_DARK, marginTop: 1 }}>{m.city}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{m.localLabel}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor:
                            m.status === 'online' ? '#34c759' : m.status === 'idle' ? '#8a5a1e' : '#ff3b30',
                        }}
                      />
                      <Text style={{ fontSize: 10, color: MUTED_ON_DARK }}>{statusLabelFor(m.status)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 18,
              }}
            >
              <Text style={{ color: MUTED_ON_DARK, fontSize: 12 }}>Scroll for compact view</Text>
              <Ionicons name="chevron-down" size={12} color={MUTED_ON_DARK} />
            </View>

            {/* Layout B — fades in with scroll like design */}
            <View
              style={{
                opacity: 0.35 + 0.65 * scrollProgress,
                transform: [
                  { translateY: (1 - scrollProgress) * 16 },
                  { scale: 0.96 + 0.04 * scrollProgress },
                ],
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
                Layout B — compact timeline
              </Text>
              <View style={{ gap: 9, marginBottom: 8 }}>
                {members.map((m) => {
                  const colors = bandColorsForHour(localHourFor(m.offset, scrubberHour));
                  const localHour = localHourFor(m.offset, scrubberHour);
                  return (
                    <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 24 }}>
                      <Text style={{ width: 38, fontSize: 11, color: MUTED_ON_DARK }}>{m.cityShort}</Text>
                      <View
                        style={{
                          flex: 1,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          position: 'relative',
                        }}
                      >
                        <View
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: `${(localHour / 24) * 100}%`,
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: colors.fg,
                            borderWidth: 2,
                            borderColor: colors.bg,
                            transform: [{ translateX: -5 }],
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          width: 56,
                          textAlign: 'right',
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#fff',
                        }}
                      >
                        {m.localLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={onPropose}
              disabled={proposeDisabled}
              style={{
                marginTop: 22,
                height: 48,
                borderRadius: 999,
                backgroundColor: BLUE_ON_DARK,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: proposeDisabled ? 0.4 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Propose This Time</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Create sheet */}
      <Modal visible={sheetStep === 'create'} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ height: '84%', backgroundColor: INK_1, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <SheetHeader
              title="New Room"
              onClose={closeSheet}
              action="Create"
              actionEnabled={!!roomName.trim()}
              onAction={onSubmitCreate}
              t={{
                dark: true,
                bg: '#000',
                surface: INK_1,
                surface2: TILE_1,
                text: '#fff',
                textTertiary: MUTED_ON_DARK,
                hairline: 'rgba(255,255,255,0.1)',
                accent: BLUE_ON_DARK,
                destructive: '#ff3b30',
                success: '#34c759',
                sleepBg: '',
                sleepFg: '',
                businessBg: '',
                businessFg: '',
                eveningBg: '',
                eveningFg: '',
              }}
            />
            <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }}>
              <View>
                <Text style={{ color: MUTED_ON_DARK, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                  Room name
                </Text>
                <TextInput
                  value={roomName}
                  onChangeText={setRoomName}
                  placeholder="e.g. Design Team Standup"
                  placeholderTextColor={MUTED_ON_DARK}
                  style={{
                    height: 46,
                    backgroundColor: TILE_1,
                    borderRadius: BorderRadius.md,
                    paddingHorizontal: 14,
                    color: '#fff',
                    fontSize: 16,
                  }}
                />
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  Participant cap
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CAP_OPTIONS.map((opt) => {
                    const selected = participantCap === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setParticipantCap(opt)}
                        style={{
                          height: 44,
                          paddingHorizontal: 16,
                          borderRadius: 22,
                          backgroundColor: selected ? BLUE_ON_DARK : TILE_1,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ backgroundColor: TILE_1, borderRadius: 18, padding: 16 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>Share link</Text>
                <Text style={{ fontSize: 13, color: MUTED_ON_DARK, marginBottom: 10 }}>
                  sync.app/j/{genCode(roomName)}
                </Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(41,151,255,0.14)',
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: 2, color: BLUE_ON_DARK }}>
                    {genCode(roomName)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Join sheet */}
      <Modal visible={sheetStep === 'join'} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ height: '60%', backgroundColor: INK_1, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <SheetHeader
              title="Join Room"
              onClose={closeSheet}
              action="Join"
              actionEnabled={joinCode.every((c) => c)}
              onAction={onSubmitJoin}
              t={{
                dark: true,
                bg: '#000',
                surface: INK_1,
                surface2: TILE_1,
                text: '#fff',
                textTertiary: MUTED_ON_DARK,
                hairline: 'rgba(255,255,255,0.1)',
                accent: BLUE_ON_DARK,
                destructive: '#ff3b30',
                success: '#34c759',
                sleepBg: '',
                sleepFg: '',
                businessBg: '',
                businessFg: '',
                eveningBg: '',
                eveningFg: '',
              }}
            />
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 16 }}>
                Enter 6-character code
              </Text>
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
                      if (nativeEvent.key === 'Backspace' && !joinCode[i] && i > 0) {
                        codeRefs.current[i - 1]?.focus();
                      }
                    }}
                    maxLength={1}
                    autoCapitalize="characters"
                    style={{
                      width: 44,
                      height: 52,
                      textAlign: 'center',
                      borderRadius: 10,
                      fontSize: 20,
                      color: '#fff',
                      backgroundColor: TILE_1,
                    }}
                  />
                ))}
              </View>
              <Pressable
                onPress={() => applyPaste('SYNC42')}
                style={{
                  height: 40,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: BLUE_ON_DARK,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: BLUE_ON_DARK }}>Paste</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vote */}
      <Modal visible={voteOpen} transparent animationType="fade">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              width: 320,
              backgroundColor: INK_1,
              borderRadius: 24,
              padding: 28,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: MUTED_ON_DARK,
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.4,
                marginBottom: 14,
              }}
            >
              PROPOSED TIME
            </Text>
            <Text style={{ color: '#fff', fontSize: 44, fontWeight: '600' }}>
              {formatLocal(localHourFor(members[0]?.offset || 0, proposed)).label}
            </Text>
            <Text style={{ fontSize: 12, color: MUTED_ON_DARK, marginBottom: 24 }}>{formatUtc(proposed)}</Text>
            <View style={{ width: '100%', gap: 10, marginBottom: 20 }}>
              <Pressable
                onPress={onVoteYes}
                style={{
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: BLUE_ON_DARK,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>Yes</Text>
              </Pressable>
              <Pressable
                onPress={onVoteNo}
                style={{
                  height: 56,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#ff3b30',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#ff3b30' }}>No</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <Text style={{ fontSize: 13, color: MUTED_ON_DARK }}>
                {votedCount} of {members.length} voted
              </Text>
              <Text style={{ fontSize: 13, color: MUTED_ON_DARK }}>
                {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={permissionOpen} transparent animationType="fade">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ width: 270, backgroundColor: INK_1, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ padding: 18, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>
                "Sync Room" Would Like to Send You Notifications
              </Text>
              <Text style={{ fontSize: 12.5, color: MUTED_ON_DARK, textAlign: 'center', lineHeight: 18 }}>
                Notifications may include alerts, sounds, and alarm reminders.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
              <Pressable
                onPress={commitPending}
                style={{
                  flex: 1,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRightWidth: 1,
                  borderRightColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ fontSize: 15, color: MUTED_ON_DARK }}>Don't Allow</Text>
              </Pressable>
              <Pressable
                onPress={commitPending}
                style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: BLUE_ON_DARK }}>Allow</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {toast ? (
        <View
          style={{
            position: 'absolute',
            bottom: 110,
            alignSelf: 'center',
            backgroundColor: TILE_1,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 18,
            zIndex: 10,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function RoomsList({
  rooms,
  onOpen,
  onLeave,
  onCreate,
  onJoin,
}: {
  rooms: Room[];
  onOpen: (id: string) => void;
  onLeave: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}>
      <Text style={{ color: MUTED_ON_DARK, fontSize: 14, marginBottom: 10 }}>Active</Text>
      {rooms.length === 0 ? (
        <View style={{ gap: 12 }}>
          <View
            style={{
              backgroundColor: TILE_1,
              borderRadius: 20,
              paddingVertical: 28,
              paddingHorizontal: 18,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 28 }}>🌍</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>No rooms yet</Text>
            <Text style={{ color: MUTED_ON_DARK, fontSize: 14, textAlign: 'center' }}>
              Create a room or join with a code to start coordinating.
            </Text>
          </View>
          <Pressable
            onPress={onCreate}
            style={{
              height: 48,
              borderRadius: 999,
              backgroundColor: BLUE_ON_DARK,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Create Room</Text>
          </Pressable>
          <Pressable
            onPress={onJoin}
            style={{
              height: 48,
              borderRadius: 999,
              backgroundColor: TILE_1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Join Room</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {rooms.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => onOpen(r.id)}
              onLongPress={() => onLeave(r.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                backgroundColor: TILE_1,
                borderRadius: 20,
                paddingVertical: 16,
                paddingHorizontal: 18,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 21 }}>{ROOM_ICONS[i % ROOM_ICONS.length]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{r.name}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    marginTop: 3,
                    color: i === 0 ? '#34c759' : MUTED_ON_DARK,
                  }}
                >
                  {i === 0 ? 'Active Now' : `${MEMBERS.length} members`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED_ON_DARK} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
