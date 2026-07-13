import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  useAppContext,
  localHourFor,
  formatLocal,
  formatUtc,
  genCode,
  statusLabelFor,
  MEMBERS,
  CAP_OPTIONS,
  type Room,
} from '@/context/AppContext';
import { StackScreenHeader } from '@/components/navigation/header/StackScreenHeader';
import {
  SCREEN_LIST_BOTTOM_PADDING,
  useScreenLayoutStyles,
} from '@/components/navigation/layout/screenLayout';
import { useTopChromeLayout } from '@/components/navigation/layout/useTopChromeLayout';
import { SettingsSheet } from '@/components/navigation/sheet/SettingsSheet';
import { CircularIconButton } from '@/components/ui/CircularIconButton';
import { bandColorsForHour, roomTrackBandFlex } from '@/features/world/timeline';
import {
  useCreateStyles,
  useResolvedColorScheme,
  useThemedColors,
  BorderRadius,
  Spacing,
  withAppFont,
} from '@/theme';
import type { ColorPalette } from '@/theme/colorPalettes';

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

  const { scrollPaddingTop } = useTopChromeLayout();
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const sl = useScreenLayoutStyles();
  const styles = useCreateStyles(createRoomsStyles);
  const bands = roomTrackBandFlex();

  return (
    <View style={sl.container}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />

      {!activeRoom ? (
        <RoomsList
          rooms={rooms}
          scrollPaddingTop={scrollPaddingTop}
          onOpen={openRoom}
          onLeave={leaveRoom}
          onCreate={onTapCreate}
          onJoin={onTapJoin}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.md,
            paddingTop: scrollPaddingTop,
            paddingBottom: SCREEN_LIST_BOTTOM_PADDING,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.roomSubtitle}>
            {members.length} members · finding a time
          </Text>

          <View style={styles.scrubberBlock}>
            <View
              pointerEvents="none"
              style={[
                styles.utcBubble,
                { left: `${thumbPercent}%` },
              ]}
            >
              <Text style={styles.utcBubbleText}>{formatUtc(scrubberHour)}</Text>
            </View>

            <View
              onLayout={onTrackLayout}
              {...pan.panHandlers}
              style={styles.track}
            >
              {bands.map((b, i) => (
                <View key={i} style={{ flex: b.flex, backgroundColor: b.color }} />
              ))}
            </View>

            <View
              pointerEvents="none"
              style={[
                styles.thumb,
                {
                  left: `${thumbPercent}%`,
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                },
              ]}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.avatarStrip}
          >
            {members.map((m) => {
              const band = bandColorsForHour(localHourFor(m.offset, scrubberHour));
              return (
                <View key={m.id} style={styles.avatarItem}>
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={styles.avatarText}>{m.initials}</Text>
                  </View>
                  <View style={[styles.timePill, { backgroundColor: band.bg }]}>
                    <Text style={[styles.timePillText, { color: band.fg }]}>{m.localLabel}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <Text style={sl.sectionLabel}>Members</Text>
          <View style={sl.card}>
            {members.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <View style={styles.memberDivider} /> : null}
                <View style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={styles.avatarText}>{m.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberCity}>{m.city}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.memberTime}>{m.localLabel}</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              m.status === 'online'
                                ? colors.green
                                : m.status === 'idle'
                                  ? colors.orange
                                  : colors.red,
                          },
                        ]}
                      />
                      <Text style={styles.statusLabel}>{statusLabelFor(m.status)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Text style={[sl.sectionLabel, { marginTop: Spacing.xl }]}>Local times</Text>
          <View style={[sl.card, styles.compactCard]}>
            {members.map((m) => {
              const band = bandColorsForHour(localHourFor(m.offset, scrubberHour));
              const localHour = localHourFor(m.offset, scrubberHour);
              return (
                <View key={m.id} style={styles.compactRow}>
                  <Text style={styles.compactCity}>{m.cityShort}</Text>
                  <View style={styles.compactBar}>
                    <View
                      style={[
                        styles.compactMarker,
                        {
                          left: `${(localHour / 24) * 100}%`,
                          backgroundColor: band.fg,
                          borderColor: band.bg,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.compactTime}>{m.localLabel}</Text>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={onPropose}
            disabled={proposeDisabled}
            style={[styles.primaryButton, proposeDisabled && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>Propose This Time</Text>
          </Pressable>
        </ScrollView>
      )}

      <StackScreenHeader
        title={activeRoom ? activeRoom.name : 'Rooms'}
        showBack={Boolean(activeRoom)}
        onBack={exitToList}
        trailing={
          activeRoom ? undefined : (
            <>
              <CircularIconButton
                icon="enter-outline"
                accessibilityLabel="Join room"
                onPress={onTapJoin}
              />
              <CircularIconButton
                icon="add"
                accessibilityLabel="Create room"
                onPress={onTapCreate}
              />
            </>
          )
        }
      />

      <SettingsSheet
        title="New Room"
        visible={sheetStep === 'create'}
        onClose={closeSheet}
        tall
      >
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Room name</Text>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="e.g. Design Team Standup"
            placeholderTextColor={colors.subtext}
            style={styles.input}
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Participant cap</Text>
          <View style={styles.capRow}>
            {CAP_OPTIONS.map((opt) => {
              const selected = participantCap === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setParticipantCap(opt)}
                  style={[styles.capChip, selected && styles.capChipSelected]}
                >
                  <Text style={[styles.capChipText, selected && styles.capChipTextSelected]}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.shareCard}>
            <Text style={styles.shareTitle}>Share code</Text>
            <Text style={styles.shareLink}>sync.app/j/{genCode(roomName)}</Text>
            <View style={styles.shareCodePill}>
              <Text style={styles.shareCode}>{genCode(roomName)}</Text>
            </View>
          </View>

          <Pressable
            onPress={onSubmitCreate}
            disabled={!roomName.trim()}
            style={[styles.primaryButton, !roomName.trim() && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>Create Room</Text>
          </Pressable>
        </ScrollView>
      </SettingsSheet>

      <SettingsSheet title="Join Room" visible={sheetStep === 'join'} onClose={closeSheet}>
        <View style={styles.joinBody}>
          <Text style={styles.fieldLabel}>Enter 6-character code</Text>
          <View style={styles.codeRow}>
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
                style={styles.codeCell}
              />
            ))}
          </View>
          <Pressable onPress={() => applyPaste('SYNC42')} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Paste</Text>
          </Pressable>
          <Pressable
            onPress={onSubmitJoin}
            disabled={!joinCode.every((c) => c)}
            style={[
              styles.primaryButton,
              { marginTop: Spacing.lg },
              !joinCode.every((c) => c) && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Join Room</Text>
          </Pressable>
        </View>
      </SettingsSheet>

      <Modal visible={voteOpen} transparent animationType="fade">
        <View style={styles.modalScrim}>
          <View style={styles.voteCard}>
            <Text style={styles.voteEyebrow}>Proposed time</Text>
            <Text style={styles.voteTime}>
              {formatLocal(localHourFor(members[0]?.offset || 0, proposed)).label}
            </Text>
            <Text style={styles.voteUtc}>{formatUtc(proposed)}</Text>
            <View style={styles.voteActions}>
              <Pressable onPress={onVoteYes} style={styles.voteYes}>
                <Text style={styles.primaryButtonText}>Yes</Text>
              </Pressable>
              <Pressable onPress={onVoteNo} style={styles.dangerOutline}>
                <Text style={styles.dangerOutlineText}>No</Text>
              </Pressable>
            </View>
            <View style={styles.voteMeta}>
              <Text style={styles.voteMetaText}>
                {votedCount} of {members.length} voted
              </Text>
              <Text style={styles.voteMetaText}>
                {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={permissionOpen} transparent animationType="fade">
        <View style={styles.modalScrim}>
          <View style={styles.permissionCard}>
            <View style={styles.permissionBody}>
              <Text style={styles.permissionTitle}>
                Sync Room Would Like to Send You Notifications
              </Text>
              <Text style={styles.permissionBodyText}>
                Notifications may include alerts, sounds, and alarm reminders.
              </Text>
            </View>
            <View style={styles.permissionActions}>
              <Pressable onPress={commitPending} style={styles.permissionBtn}>
                <Text style={styles.permissionBtnMuted}>Don&apos;t Allow</Text>
              </Pressable>
              <Pressable
                onPress={commitPending}
                style={[styles.permissionBtn, styles.permissionBtnBorder]}
              >
                <Text style={styles.permissionBtnPrimary}>Allow</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function RoomsList({
  rooms,
  scrollPaddingTop,
  onOpen,
  onLeave,
  onCreate,
  onJoin,
}: {
  rooms: Room[];
  scrollPaddingTop: number;
  onOpen: (id: string) => void;
  onLeave: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  const colors = useThemedColors();
  const sl = useScreenLayoutStyles();
  const styles = useCreateStyles(createRoomsStyles);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[sl.scrollContent, { paddingTop: scrollPaddingTop }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[sl.sectionLabel, styles.firstSection]}>Your rooms</Text>

      {rooms.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="people-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No rooms yet</Text>
          <Text style={styles.emptyBody}>
            Create a room or join with a code to coordinate across time zones.
          </Text>
          <Pressable onPress={onCreate} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Create Room</Text>
          </Pressable>
          <Pressable onPress={onJoin} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Join with code</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.roomList}>
          {rooms.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => onOpen(r.id)}
              onLongPress={() => onLeave(r.id)}
              style={({ pressed }) => [styles.roomCard, pressed && styles.roomCardPressed]}
            >
              <View style={styles.roomIcon}>
                <Text style={styles.roomIconEmoji}>{ROOM_ICONS[i % ROOM_ICONS.length]}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.roomName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={[styles.roomMeta, i === 0 && { color: colors.green }]}>
                  {i === 0 ? 'Active now' : `${MEMBERS.length} members`}
                  {' · '}
                  {r.code}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function createRoomsStyles(c: ColorPalette) {
  return StyleSheet.create({
    firstSection: {
      marginTop: Spacing.sm,
    },
    roomList: {
      gap: Spacing.sm,
    },
    roomCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: c.card,
      borderRadius: BorderRadius.cardXL,
      paddingVertical: 14,
      paddingHorizontal: Spacing.md,
    },
    roomCardPressed: {
      opacity: 0.85,
    },
    roomIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomIconEmoji: {
      fontSize: 22,
    },
    roomName: withAppFont({
      fontSize: 17,
      fontWeight: '600',
      color: c.textPrimary,
    }),
    roomMeta: withAppFont({
      fontSize: 13,
      marginTop: 3,
      color: c.subtext,
    }),
    empty: {
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: BorderRadius.cardXL,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    emptyTitle: withAppFont({
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
    }),
    emptyBody: withAppFont({
      fontSize: 14,
      lineHeight: 20,
      color: c.subtext,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    }),
    roomSubtitle: withAppFont({
      fontSize: 14,
      color: c.subtext,
      marginBottom: Spacing.md,
    }),
    scrubberBlock: {
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
    },
    utcBubble: {
      position: 'absolute',
      bottom: 60,
      transform: [{ translateX: -50 }],
      backgroundColor: c.textPrimary,
      borderRadius: 11,
      paddingVertical: 5,
      paddingHorizontal: 11,
      zIndex: 3,
    },
    utcBubbleText: withAppFont({
      color: c.background,
      fontSize: 12,
      fontWeight: '700',
    }),
    track: {
      height: 52,
      borderRadius: 26,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    thumb: {
      position: 'absolute',
      top: (52 - 38) / 2,
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 3,
      transform: [{ translateX: -19 }],
    },
    avatarStrip: {
      gap: 12,
      paddingBottom: 6,
      marginBottom: Spacing.lg,
    },
    avatarItem: {
      alignItems: 'center',
      gap: 5,
      minWidth: 48,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: withAppFont({
      fontSize: 11,
      fontWeight: '600',
      color: c.textPrimary,
    }),
    timePill: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 7,
    },
    timePillText: withAppFont({
      fontSize: 11,
      fontWeight: '600',
    }),
    memberDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: Spacing.md + 36 + Spacing.md,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: 12,
      paddingHorizontal: Spacing.md,
    },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberName: withAppFont({
      fontSize: 15,
      fontWeight: '500',
      color: c.textPrimary,
    }),
    memberCity: withAppFont({
      fontSize: 12,
      color: c.subtext,
      marginTop: 1,
    }),
    memberTime: withAppFont({
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
    }),
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusLabel: withAppFont({
      fontSize: 10,
      color: c.subtext,
    }),
    compactCard: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      gap: 9,
    },
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 24,
    },
    compactCity: withAppFont({
      width: 38,
      fontSize: 11,
      color: c.subtext,
    }),
    compactBar: {
      flex: 1,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.surfaceElevated,
      position: 'relative',
    },
    compactMarker: {
      position: 'absolute',
      top: 4,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      transform: [{ translateX: -5 }],
    },
    compactTime: withAppFont({
      width: 56,
      textAlign: 'right',
      fontSize: 12,
      fontWeight: '600',
      color: c.textPrimary,
    }),
    primaryButton: {
      marginTop: Spacing.lg,
      height: 48,
      borderRadius: BorderRadius.full,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.4,
    },
    primaryButtonText: withAppFont({
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    }),
    secondaryButton: {
      height: 44,
      paddingHorizontal: 18,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    secondaryButtonText: withAppFont({
      fontSize: 14,
      fontWeight: '600',
      color: c.primary,
    }),
    sheetBody: {
      paddingBottom: Spacing.lg,
      gap: 0,
    },
    fieldLabel: withAppFont({
      fontSize: 13,
      fontWeight: '600',
      color: c.subtext,
      marginBottom: Spacing.sm,
    }),
    input: withAppFont({
      height: 46,
      backgroundColor: c.card,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 14,
      color: c.textPrimary,
      fontSize: 16,
    }),
    capRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    capChip: {
      height: 40,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    capChipSelected: {
      backgroundColor: c.primary,
    },
    capChipText: withAppFont({
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
    }),
    capChipTextSelected: {
      color: '#fff',
    },
    shareCard: {
      marginTop: Spacing.lg,
      backgroundColor: c.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
    },
    shareTitle: withAppFont({
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 4,
    }),
    shareLink: withAppFont({
      fontSize: 13,
      color: c.subtext,
      marginBottom: 10,
    }),
    shareCodePill: {
      alignSelf: 'flex-start',
      backgroundColor: c.onDeviceBadge,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    shareCode: withAppFont({
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 2,
      color: c.primary,
    }),
    joinBody: {
      alignItems: 'center',
      paddingBottom: Spacing.md,
    },
    codeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: Spacing.lg,
    },
    codeCell: withAppFont({
      width: 44,
      height: 52,
      textAlign: 'center',
      borderRadius: 10,
      fontSize: 20,
      color: c.textPrimary,
      backgroundColor: c.card,
    }),
    modalScrim: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    voteCard: {
      width: 320,
      backgroundColor: c.surfaceElevated,
      borderRadius: BorderRadius.cardXL,
      padding: 28,
      alignItems: 'center',
    },
    voteEyebrow: withAppFont({
      color: c.subtext,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 14,
    }),
    voteTime: withAppFont({
      color: c.textPrimary,
      fontSize: 44,
      fontWeight: '600',
    }),
    voteUtc: withAppFont({
      fontSize: 12,
      color: c.subtext,
      marginBottom: 24,
    }),
    voteActions: {
      width: '100%',
      gap: 10,
      marginBottom: 20,
    },
    voteYes: {
      height: 56,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerOutline: {
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.red,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerOutlineText: withAppFont({
      fontSize: 18,
      fontWeight: '600',
      color: c.red,
    }),
    voteMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    voteMetaText: withAppFont({
      fontSize: 13,
      color: c.subtext,
    }),
    permissionCard: {
      width: 270,
      backgroundColor: c.surfaceElevated,
      borderRadius: 14,
      overflow: 'hidden',
    },
    permissionBody: {
      padding: 18,
      alignItems: 'center',
    },
    permissionTitle: withAppFont({
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 6,
    }),
    permissionBodyText: withAppFont({
      fontSize: 12.5,
      color: c.subtext,
      textAlign: 'center',
      lineHeight: 18,
    }),
    permissionActions: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    permissionBtn: {
      flex: 1,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permissionBtnBorder: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: c.border,
    },
    permissionBtnMuted: withAppFont({
      fontSize: 15,
      color: c.subtext,
    }),
    permissionBtnPrimary: withAppFont({
      fontSize: 15,
      fontWeight: '600',
      color: c.primary,
    }),
    toast: {
      position: 'absolute',
      bottom: 110,
      alignSelf: 'center',
      backgroundColor: c.surfaceElevated,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 18,
      zIndex: 10,
    },
    toastText: withAppFont({
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '500',
    }),
  });
}
