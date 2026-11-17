import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAppContext, statusLabelFor, CAP_OPTIONS, type MemberView } from '@/context/AppContext';
import type { RoomSummary } from '@/features/session/session.types';
import { StackScreenHeader } from '@/layouts/header/StackScreenHeader';
import { SCREEN_LIST_BOTTOM_PADDING, useScreenLayoutStyles } from '@/layouts/layout/screenLayout';
import { READABLE_MAX_WIDTH, useDeviceClass } from '@/layouts/layout/useDeviceClass';
import { useTopChromeLayout } from '@/layouts/layout/useTopChromeLayout';
import {
  AnchoredMenuModal,
  AnchoredOverflowMenu,
  useAnchoredMenu,
  type AnchoredMenuItem,
} from '@/shared/components/AnchoredOverflowMenu';
import { AIAssistantModal } from '@/shared/components/AIAssistantModal';
import { CircularIconButton } from '@/shared/components/CircularIconButton';
import { ResponsiveSheet } from '@/shared/components/ResponsiveSheet';
import { Toast } from '@/shared/components/Toast';
import { readClipboardText } from '@/shared/lib/platform/share';
import { formatLocalTime, formatUtcClock, relativeDayLabel } from '@/shared/lib/time/time.conversions';
import { useCreateStyles, useResolvedColorScheme, useThemedColors, BorderRadius, Spacing, withAppFont } from '@/shared/theme';
import type { ColorPalette } from '@/shared/theme/colorPalettes';
import { MemberTimelines } from '../components/MemberTimelines';
import { MemberTimeTable } from '../components/MemberTimeTable';
import { HoldToAgree } from '../components/HoldToAgree';
import { TimeScrubber } from '../components/TimeScrubber';
import { SkyDial } from '@/shared/sky/SkyDial';
import { useWeather } from '@/shared/lib/weather/openMeteo';
import { SCRUBBER_WINDOW_MS } from '@/shared/lib/time/time.constants';
import { localMinutes, oddHour } from '@/shared/sky/skyGeometry';
import { resolveFeatureFlags } from '@/config/feature-flags';
import { GlassLayer } from '@/shared/visuals/glass/GlassLayer';
import { ConstellationBadge } from '@/shared/visuals/ConstellationBadge';
import { withMonoFont } from '@/shared/theme/fonts';
import { skyPeriodForHour, useSkyStore } from '@/shared/visuals/sky';
import { DateTime } from 'luxon';


const statusColor = (c: ColorPalette, status: MemberView['status']) =>
  status === 'online' ? c.statusOnline : status === 'idle' ? c.statusIdle : c.statusOffline;

// ──────────────────────────────────────────────
// Rooms home: list + create / join + permission explainer
// ──────────────────────────────────────────────

export function RoomsHomeScreen() {
  const { rooms, openRoom, leaveRoom, onTapCreate, onTapJoin, toast } = useAppContext();
  const { scrollPaddingTop } = useTopChromeLayout();
  const scheme = useResolvedColorScheme();
  const sl = useScreenLayoutStyles();

  return (
    <View style={sl.container}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />

      <RoomsList
        rooms={rooms}
        scrollPaddingTop={scrollPaddingTop}
        onOpen={openRoom}
        onLeave={leaveRoom}
        onCreate={onTapCreate}
        onJoin={onTapJoin}
      />

      <StackScreenHeader
        title="Rooms"
        trailing={
          <>
            <CircularIconButton icon="enter-outline" accessibilityLabel="Join room" onPress={onTapJoin} />
            <CircularIconButton icon="add" accessibilityLabel="Create room" onPress={onTapCreate} />
          </>
        }
      />

      <RoomSheets />
      <Toast message={toast} />
    </View>
  );
}

/** Create / join sheets and the one-time notification explainer. */
export function RoomSheets() {
  const {
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
    permissionOpen,
    commitPending,
    busy,
    backendKind,
  } = useAppContext();
  const colors = useThemedColors();
  const styles = useCreateStyles(createRoomsStyles);
  const codeComplete = joinCode.every((c) => c);

  const onPaste = async () => {
    const text = await readClipboardText();
    applyPaste(text || (backendKind === 'demo' ? 'SYNC42' : ''));
  };

  return (
    <>
      <ResponsiveSheet title="New Room" visible={sheetStep === 'create'} onClose={closeSheet} tall>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Room name</Text>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="e.g. Design Team Standup"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            maxLength={64}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSubmitCreate}
            accessibilityLabel="Room name"
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Participant cap</Text>
          <View style={styles.capRow} accessibilityRole="radiogroup">
            {CAP_OPTIONS.map((opt) => {
              const selected = participantCap === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setParticipantCap(opt)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.capChip, selected && styles.capChipSelected]}
                >
                  <Text style={[styles.capChipText, selected && styles.capChipTextSelected]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.shareCard}>
            <Ionicons name="link-outline" size={18} color={colors.primary} />
            <Text style={styles.shareLink}>
              You’ll get a 6-character code and invite link to share as soon as the room is created.
            </Text>
          </View>

          <PrimaryAction
            label="Create Room"
            busy={busy}
            disabled={!roomName.trim()}
            onPress={onSubmitCreate}
            // Material 3: the sheet's main action is an Extended FAB on Android.
            fabIcon={Platform.OS === 'android' ? 'add' : undefined}
          />
        </ScrollView>
      </ResponsiveSheet>

      <ResponsiveSheet title="Join Room" visible={sheetStep === 'join'} onClose={closeSheet}>
        <View style={styles.joinBody}>
          <Text style={styles.fieldLabel}>Enter the 6-character code</Text>
          <View style={styles.codeRow}>
            {joinCode.map((val, i) => (
              <TextInput
                key={i}
                ref={(el) => {
                  codeRefs.current[i] = el;
                }}
                value={val}
                autoFocus={i === 0}
                accessibilityLabel={`Code character ${i + 1}`}
                onChangeText={(text) => {
                  const clean = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (clean.length > 1) {
                    // A whole code pasted or autofilled into one box.
                    applyPaste(clean);
                    codeRefs.current[Math.min(clean.length, 6) - 1]?.focus();
                    return;
                  }
                  const arr = [...joinCode];
                  arr[i] = clean;
                  setJoinCode(arr);
                  if (clean && i < 5) codeRefs.current[i + 1]?.focus();
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && !joinCode[i] && i > 0) codeRefs.current[i - 1]?.focus();
                }}
                onSubmitEditing={onSubmitJoin}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.codeCell}
              />
            ))}
          </View>
          <Pressable onPress={onPaste} style={styles.secondaryButton} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>Paste</Text>
          </Pressable>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryAction label="Join Room" busy={busy} disabled={!codeComplete} onPress={onSubmitJoin} />
          </View>
        </View>
      </ResponsiveSheet>

      <Modal visible={permissionOpen} transparent animationType="fade" onRequestClose={() => commitPending(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.permissionCard} accessibilityViewIsModal>
            <View style={styles.permissionBody}>
              <Ionicons name="alarm-outline" size={28} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.permissionTitle}>Let SyncWorld ring your alarm?</Text>
              <Text style={styles.permissionBodyText}>
                When your room agrees on a time, SyncWorld sets an alarm on this device. It rings at that time in your
                time zone, even offline.
              </Text>
            </View>
            <View style={styles.permissionActions}>
              <Pressable onPress={() => commitPending(false)} style={styles.permissionBtn} accessibilityRole="button">
                <Text style={styles.permissionBtnMuted}>Not now</Text>
              </Pressable>
              <Pressable
                onPress={() => commitPending(true)}
                style={[styles.permissionBtn, styles.permissionBtnBorder]}
                accessibilityRole="button"
              >
                <Text style={styles.permissionBtnPrimary}>Allow</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function PrimaryAction({
  label,
  busy,
  disabled,
  onPress,
  fabIcon,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** Renders as a Material 3 Extended FAB (icon + label, 16dp corners). */
  fabIcon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const styles = useCreateStyles(createRoomsStyles);
  const colors = useThemedColors();
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.primaryButton,
        fabIcon && styles.extendedFab,
        inactive && styles.primaryButtonDisabled,
        pressed && !inactive && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <>
          {fabIcon ? <Ionicons name={fabIcon} size={22} color={colors.onPrimary} /> : null}
          <Text style={styles.primaryButtonText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// ──────────────────────────────────────────────
// Sync room: scrubber, members, propose, vote
// ──────────────────────────────────────────────

type RoomsDetailScreenProps = {
  onBack: () => void;
  /** Rendered as the right pane of a split view (no back button). */
  embedded?: boolean;
};

export function RoomsDetailScreen({ onBack, embedded }: RoomsDetailScreenProps) {
  const ctx = useAppContext();
  const {
    activeRoom,
    activeSummary,
    leaveRoom,
    members,
    you,
    toast,
    dragging,
    onShare,
    layout,
    setLayout,
    connected,
    backendKind,
    timezone,
  } = ctx;
  const [aiOpen, setAiOpen] = useState(false);
  const { widthClass } = useDeviceClass();
  const { scrollPaddingTop } = useTopChromeLayout();
  const scheme = useResolvedColorScheme();
  const sl = useScreenLayoutStyles();
  const styles = useCreateStyles(createRoomsStyles);
  const colors = useThemedColors();
  const skyDial = resolveFeatureFlags().enableSkyDial;
  const weather = useWeather(skyDial ? (you?.timezone ?? timezone) : undefined);

  // The sky behind the room follows the proposed time in your zone.
  const setSkyOverride = useSkyStore((st) => st.setOverride);
  const skyZone = you?.timezone ?? timezone;
  const scrubberUtc = ctx.scrubberUtc;
  useEffect(() => {
    if (!scrubberUtc) return;
    const hour = DateTime.fromMillis(scrubberUtc, { zone: skyZone }).hour;
    setSkyOverride(skyPeriodForHour(hour));
  }, [scrubberUtc, skyZone, setSkyOverride]);
  useEffect(() => () => setSkyOverride(null), [setSkyOverride]);

  const roomId = activeRoom?.id ?? activeSummary?.id;
  const title = activeRoom?.name ?? activeSummary?.name ?? 'Room';

  const roomMenuItems = useMemo<AnchoredMenuItem[]>(
    () =>
      roomId
        ? [
            { label: 'Share invite', onPress: onShare },
            { label: 'Leave room', onPress: () => leaveRoom(roomId) },
          ]
        : [],
    [roomId, leaveRoom, onShare],
  );

  if (!roomId) return null;

  const statusText = !activeRoom
    ? 'Connecting…'
    : backendKind === 'live' && !connected
      ? 'Reconnecting to live sync…'
      : activeRoom.status === 'VOTING'
        ? 'Voting on a time'
        : activeRoom.status === 'LOCKED'
          ? 'Alarm armed'
          : 'Finding a time';

  // Side-by-side scrubber + members only when there's real width for both.
  const twoColumn = widthClass === 'expanded';

  const scrubberColumn = (
    <View style={twoColumn ? styles.column : undefined}>
      {skyDial ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <SkyDial
            utcMs={ctx.scrubberUtc}
            youTz={you?.timezone ?? timezone}
            members={members.map((m) => ({ id: m.id, name: m.name, timezone: m.timezone, isYou: m.isYou }))}
            mode="full"
            weather={weather}
            interactive={activeRoom?.status !== 'VOTING' && activeRoom?.status !== 'LOCKED'}
            minUtc={ctx.windowStart}
            maxUtc={ctx.windowStart + SCRUBBER_WINDOW_MS}
            onChange={(utc) => {
              if (!dragging) ctx.setDragging(true);
              ctx.scrubTo((utc - ctx.windowStart) / SCRUBBER_WINDOW_MS);
            }}
            onCommit={() => ctx.setDragging(false)}
          />
        </View>
      ) : (
        <>
        <View style={styles.segmented} accessibilityRole="tablist">
          {(['A', 'B'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setLayout(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: layout === key }}
              style={[styles.segment, layout === key && { backgroundColor: colors.card }]}
            >
              <Text style={[styles.segmentText, layout === key && { color: colors.textPrimary }]}>
                {key === 'A' ? 'Slider' : 'Timelines'}
              </Text>
            </Pressable>
          ))}
        </View>

        <TimeScrubber
          windowStart={ctx.windowStart}
          scrubberUtc={ctx.scrubberUtc}
          thumbPercent={ctx.thumbPercent}
          timezone={you?.timezone ?? timezone}
          ghostMarkers={ctx.ghostMarkers}
          dragging={dragging}
          disabled={activeRoom?.status === 'VOTING' || activeRoom?.status === 'LOCKED'}
          onDraggingChange={ctx.setDragging}
          onScrubTo={ctx.scrubTo}
          onNudge={ctx.nudgeScrubber}
          onSubmit={ctx.onPropose}
        />

        {layout === 'A' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarStrip}>
            {members.map((m) => (
              <View key={m.id} style={styles.avatarItem} accessible accessibilityLabel={`${m.name}: ${m.localLabel}`}>
                <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={styles.avatarText}>{m.initials}</Text>
                </View>
                <View style={[styles.timePill, { backgroundColor: m.pc.bg }]}>
                  <Text style={[styles.timePillText, { color: m.pc.fg }]}>{m.localLabel}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ marginBottom: Spacing.lg }}>
            <MemberTimelines members={members} windowStart={ctx.windowStart} thumbPercent={ctx.thumbPercent} />
          </View>
        )}
        </>
      )}

      {ctx.lateNightMembers.length > 0 ? (
        <View style={[styles.warning, { backgroundColor: colors.eveningBg }]} accessibilityRole="alert">
          <Text style={[styles.warningText, { color: colors.eveningFg }]}>
            {'⚠'} Late night (11 PM–6 AM) for{' '}
            {ctx.lateNightMembers.map((m) => (m.isYou ? 'you' : m.name.split(' ')[0])).join(', ')}
          </Text>
        </View>
      ) : null}

      <PrimaryAction
        label={ctx.proposeHint && ctx.proposeHint !== 'Waiting for more members…' ? ctx.proposeHint : 'Propose This Time'}
        busy={ctx.busy}
        disabled={ctx.proposeDisabled}
        onPress={ctx.onPropose}
      />
      {ctx.proposeHint === 'Waiting for more members…' ? (
        <Text style={styles.hint}>Waiting for more members — share the code {activeRoom?.code ?? activeSummary?.code}.</Text>
      ) : null}

      <Pressable onPress={() => setAiOpen(true)} style={[styles.secondaryButton, { marginTop: Spacing.md }]} accessibilityRole="button">
        <View style={styles.inlineIconLabel}>
          <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Suggest a time</Text>
        </View>
      </Pressable>
    </View>
  );

  const membersColumn = (
    <View style={twoColumn ? styles.column : undefined}>
      <Text style={[sl.sectionLabel, twoColumn && { marginTop: 0 }]}>Members · {members.length}</Text>
      <View style={sl.card}>
        <GlassLayer radius={BorderRadius.cardXL} />
        {members.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <View style={styles.memberDivider} /> : null}
            <View
              style={styles.memberRow}
              accessible
              accessibilityLabel={`${m.name}${m.isHost ? ', host' : ''}, ${m.city}, ${m.localLabel}, ${statusLabelFor(m.status)}`}
            >
              <View style={[styles.memberAvatar, { backgroundColor: colors.glassFill }]}>
                <Text style={styles.avatarText}>{m.initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.name}
                  {m.isYou ? ' (you)' : ''}
                  {m.isHost ? ' · Host' : ''}
                </Text>
                <Text style={styles.memberCity} numberOfLines={1}>
                  {m.city} ({m.offsetLabel})
                  {(() => {
                    const odd = oddHour(localMinutes(ctx.scrubberUtc, m.timezone));
                    return odd ? <Text style={{ color: colors.orange }}>{` · ${odd}`}</Text> : null;
                  })()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.memberTime, m.lateNight && { color: colors.orange }]}>{m.localLabel}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(colors, m.status) }]} />
                  <Text style={styles.statusLabel}>{statusLabelFor(m.status)}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
        {members.length === 0 ? (
          <View style={styles.memberRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.memberCity}>Loading members…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={sl.container}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.roomDetailContent, { paddingTop: scrollPaddingTop }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragging}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.detailInner, twoColumn && styles.detailInnerWide]}>
          <Text style={styles.roomSubtitle}>
            {members.length} {members.length === 1 ? 'member' : 'members'} · {statusText}
          </Text>
          <View style={twoColumn ? styles.columns : undefined}>
            {scrubberColumn}
            {membersColumn}
          </View>
        </View>
      </ScrollView>

      <StackScreenHeader
        title={title}
        showBack={!embedded}
        onBack={onBack}
        trailing={
          <AnchoredOverflowMenu
            items={roomMenuItems}
            renderTrigger={(open) => (
              <CircularIconButton icon="ellipsis-horizontal" accessibilityLabel="Room options" onPress={open} />
            )}
          />
        }
      />

      <VoteModal />

      <AIAssistantModal
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        members={members.map((m) => ({ uid: m.id, displayName: m.name, timezone: m.timezone }))}
        baseTimestamp={ctx.now}
      />

      <Toast message={toast} />
    </View>
  );
}

function VoteModal() {
  const { voteOpen, proposedUtc, proposal, onVoteYes, onVoteNo, onCounter, remainingSec, members, myVote, you, timezone } =
    useAppContext();
  const styles = useCreateStyles(createRoomsStyles);
  const tz = you?.timezone ?? timezone;
  const local = DateTime.fromMillis(proposedUtc, { zone: tz });
  const votes = proposal?.votes ?? {};
  const agreed = members.filter((m) => votes[m.id] === 'yes').length;
  const status = Object.fromEntries(
    members.map((m) => [m.id, votes[m.id] === 'yes' ? 'Agreed' : votes[m.id] === 'no' ? 'No' : 'Waiting']),
  );
  const left = `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`;
  // Counter-offers need the backend change in Task 10; until then the chips are shown but disabled.
  const countersEnabled = false;

  return (
    <Modal visible={voteOpen} transparent animationType="fade">
      <View style={styles.modalScrim}>
        <View style={styles.voteCard} accessibilityViewIsModal>
          <View style={styles.voteHead}>
            <SkyDial utcMs={proposedUtc} youTz={tz} members={[]} mode="mini" size={84} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.voteEyebrow}>
                {(members.find((m) => m.id === proposal?.createdBy)?.name.split(' ')[0] ?? 'Someone')} proposes
              </Text>
              <Text style={styles.voteTime} accessibilityRole="header">
                {local.toFormat('h:mm a')}
              </Text>
              <Text style={styles.voteUtc}>
                {local.toFormat('ccc d LLL')} · {formatUtcClock(proposedUtc)}
              </Text>
            </View>
          </View>

          <Text style={styles.voteMetaText} accessibilityLabel={`${agreed} of ${members.length} agreed, ${remainingSec} seconds left`}>
            {agreed} of {members.length} agreed · {left} left
          </Text>

          <View style={{ width: '100%', marginVertical: 12 }}>
            <MemberTimeTable members={members} utcMs={proposedUtc} status={status} positive={['Agreed']} />
          </View>

          {myVote ? (
            <Text style={[styles.voteMetaText, { marginBottom: 12, textAlign: 'center' }]}>
              You said {myVote === 'yes' ? 'yes' : 'no'}. Waiting for the others.
            </Text>
          ) : (
            <View style={styles.voteActions}>
              <HoldToAgree onAgree={onVoteYes} />
              <View style={styles.counterRow}>
                {([1, 2] as const).map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => onCounter(h)}
                    disabled={!countersEnabled}
                    style={[styles.counterChip, !countersEnabled && { opacity: 0.4 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`No, suggest ${h} hour${h > 1 ? 's' : ''} later`}
                    accessibilityState={{ disabled: !countersEnabled }}
                  >
                    <Text style={styles.counterText}>+{h} h</Text>
                  </Pressable>
                ))}
                <Pressable onPress={onVoteNo} style={styles.counterChip} accessibilityRole="button" accessibilityLabel="No, cancel this time">
                  <Text style={[styles.counterText, { color: '#FF8A5B' }]}>No</Text>
                </Pressable>
              </View>
            </View>
          )}
          <Text style={[styles.voteMetaText, { textAlign: 'center' }]}>Everyone must agree. One No cancels it.</Text>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Rooms list (also the left pane of the tablet/desktop split view)
// ──────────────────────────────────────────────

export function RoomsList({
  rooms,
  scrollPaddingTop,
  onOpen,
  onLeave,
  onCreate,
  onJoin,
  selectedId,
}: {
  rooms: RoomSummary[];
  scrollPaddingTop: number;
  onOpen: (id: string) => void;
  onLeave: (id: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  selectedId?: string | null;
}) {
  const colors = useThemedColors();
  const sl = useScreenLayoutStyles();
  const styles = useCreateStyles(createRoomsStyles);
  const roomMenu = useAnchoredMenu();
  const [menuRoomId, setMenuRoomId] = useState<string | null>(null);

  const menuItems = useMemo<AnchoredMenuItem[]>(
    () => (menuRoomId ? [{ label: 'Leave room', onPress: () => onLeave(menuRoomId) }] : []),
    [menuRoomId, onLeave],
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sl.scrollContent, styles.readable, { paddingTop: scrollPaddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[sl.sectionLabel, styles.firstSection]}>Your rooms</Text>

        {rooms.length === 0 ? (
          <View style={styles.empty}>
            <GlassLayer radius={BorderRadius.group} />
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="people-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No rooms yet</Text>
            <Text style={styles.emptyBody}>Create a room or join with a code to coordinate across time zones.</Text>
            <View style={{ alignSelf: 'stretch' }}>
              <PrimaryAction label="Create Room" onPress={onCreate} />
            </View>
            <Pressable onPress={onJoin} style={[styles.secondaryButton, { marginTop: Spacing.sm }]} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Join with code</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.roomList}>
            {rooms.map((r, i) => (
              <Pressable
                key={r.id}
                onPress={() => onOpen(r.id)}
                onLongPress={(e) => {
                  setMenuRoomId(r.id);
                  roomMenu.openAtPoint(e.nativeEvent.pageX, e.nativeEvent.pageY);
                }}
                delayLongPress={350}
                accessibilityRole="button"
                accessibilityLabel={`${r.name}, code ${r.code}`}
                accessibilityHint="Long press for options"
                accessibilityState={{ selected: selectedId === r.id }}
                style={({ pressed }) => [
                  styles.roomCard,
                  selectedId === r.id && { borderColor: colors.primary, borderWidth: 1.5 },
                  pressed && styles.roomCardPressed,
                ]}
              >
                <GlassLayer radius={BorderRadius.group} />
                {/* Each room's own constellation, generated from its code. */}
                <ConstellationBadge seed={r.code || r.id} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.roomName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.roomMeta}>Code {r.code}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <AnchoredMenuModal
        visible={roomMenu.visible}
        anchor={roomMenu.anchor}
        items={menuItems}
        onClose={() => {
          roomMenu.close();
          setMenuRoomId(null);
        }}
        align="center"
      />
    </>
  );
}

function createRoomsStyles(c: ColorPalette) {
  return StyleSheet.create({
    readable: {
      width: '100%',
      maxWidth: READABLE_MAX_WIDTH,
      alignSelf: 'center',
    },
    firstSection: { marginTop: Spacing.sm },
    roomList: { gap: Spacing.sm },
    roomCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: BorderRadius.group,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: 'transparent',
      paddingVertical: 14,
      paddingHorizontal: Spacing.md,
    },
    roomCardPressed: { transform: [{ scale: 0.98 }] },
    roomIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.glassFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inlineIconLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    roomName: withAppFont({ fontSize: 17, fontWeight: '600', color: c.textPrimary }),
    roomMeta: withAppFont({ fontSize: 13, marginTop: 3, color: c.subtext }),
    empty: {
      alignItems: 'center',
      borderRadius: BorderRadius.group,
      overflow: 'hidden',
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
    emptyTitle: withAppFont({ fontSize: 18, fontWeight: '600', color: c.textPrimary }),
    emptyBody: withAppFont({ fontSize: 14, lineHeight: 20, color: c.subtext, textAlign: 'center', marginBottom: Spacing.sm }),
    roomSubtitle: withAppFont({ fontSize: 14, color: c.subtext, marginTop: Spacing.sm, marginBottom: Spacing.md }),
    roomDetailContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.md,
      paddingBottom: SCREEN_LIST_BOTTOM_PADDING,
    },
    detailInner: { width: '100%', maxWidth: READABLE_MAX_WIDTH, alignSelf: 'center' },
    detailInnerWide: { maxWidth: 1120 },
    columns: { flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' },
    column: { flex: 1, minWidth: 0 },
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.glassFill,
      borderRadius: 9,
      padding: 2,
      marginBottom: Spacing.md,
      alignSelf: 'flex-start',
    },
    segment: { paddingHorizontal: 14, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    segmentText: withAppFont({ fontSize: 13, fontWeight: '600', color: c.textSecondary }),
    avatarStrip: { gap: 12, paddingBottom: 6, marginBottom: Spacing.lg },
    avatarItem: { alignItems: 'center', gap: 5, minWidth: 56 },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarText: withAppFont({ fontSize: 11, fontWeight: '600', color: c.textPrimary }),
    timePill: { paddingVertical: 3, paddingHorizontal: 6, borderRadius: 7 },
    timePillText: withMonoFont({ fontSize: 11, fontWeight: '600' }),
    warning: { borderRadius: BorderRadius.input, paddingVertical: 10, paddingHorizontal: 14, marginBottom: Spacing.sm },
    warningText: withAppFont({ fontSize: 13, fontWeight: '500' }),
    hint: withAppFont({ fontSize: 13, color: c.subtext, textAlign: 'center', marginTop: Spacing.sm }),
    memberDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: Spacing.md + 38 + Spacing.md },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12, paddingHorizontal: Spacing.md },
    memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    memberName: withAppFont({ fontSize: 15, fontWeight: '500', color: c.textPrimary }),
    memberCity: withAppFont({ fontSize: 12, color: c.subtext, marginTop: 1 }),
    memberTime: withMonoFont({ fontSize: 15, fontWeight: '600', color: c.textPrimary }),
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusLabel: withAppFont({ fontSize: 10, color: c.subtext }),
    primaryButton: {
      marginTop: Spacing.lg,
      height: 48,
      borderRadius: BorderRadius.full,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
    },
    extendedFab: {
      alignSelf: 'flex-end',
      height: 56,
      borderRadius: 16,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      elevation: 6,
    },
    primaryButtonDisabled: { opacity: 0.4 },
    primaryButtonText: withAppFont({ color: c.onPrimary, fontSize: 15, fontWeight: '600' }),
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
    secondaryButtonText: withAppFont({ fontSize: 14, fontWeight: '600', color: c.primary }),
    sheetBody: { paddingBottom: Spacing.lg, gap: 0 },
    fieldLabel: withAppFont({ fontSize: 13, fontWeight: '600', color: c.subtext, marginBottom: Spacing.sm }),
    input: withAppFont({
      height: 46,
      backgroundColor: c.glassFillStrong,
      borderRadius: BorderRadius.input,
      borderWidth: 1,
      borderColor: c.glassBorder,
      paddingHorizontal: 14,
      color: c.textPrimary,
      fontSize: 16,
    }),
    capRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    capChip: {
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: c.glassFill,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    capChipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    capChipText: withAppFont({ fontSize: 14, fontWeight: '600', color: c.textPrimary }),
    capChipTextSelected: { color: c.onPrimary },
    shareCard: {
      marginTop: Spacing.lg,
      backgroundColor: c.glassFillStrong,
      borderRadius: BorderRadius.group,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: Spacing.md,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    shareLink: withAppFont({ flex: 1, fontSize: 13, lineHeight: 18, color: c.subtext }),
    joinBody: { alignItems: 'center', paddingBottom: Spacing.md },
    codeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
    codeCell: withAppFont({
      width: 44,
      height: 52,
      textAlign: 'center',
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      fontSize: 20,
      fontFamily: 'GeistMono_600SemiBold',
      color: c.textPrimary,
      backgroundColor: c.glassFillStrong,
    }),
    modalScrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.scrim, padding: Spacing.md },
    voteCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: BorderRadius.cardXL,
      overflow: 'hidden',
      padding: 20,
      alignItems: 'center',
      backgroundColor: '#0D0F14',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(233,230,223,0.16)',
    },
    voteEyebrow: withAppFont({
      color: '#8C8F99',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 14,
    }),
    voteTime: withMonoFont({ color: '#E9E6DF', fontSize: 34, fontWeight: '600', letterSpacing: -1 }),
    voteUtc: withAppFont({ fontSize: 12, color: '#8C8F99' }),
    voteActions: { width: '100%', gap: 10, marginBottom: 14 },
    voteHead: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', marginBottom: 14 },
    counterRow: { flexDirection: 'row', gap: 8 },
    counterChip: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(233,230,223,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterText: withMonoFont({ fontSize: 15, fontWeight: '600', color: '#E9E6DF' }),
    voteYes: { height: 56, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    dangerOutline: {
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerOutlineText: withAppFont({ fontSize: 18, fontWeight: '600', color: c.danger }),
    voteMeta: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    voteMetaText: withAppFont({ fontSize: 13, color: '#8C8F99' }),
    permissionCard: { width: '100%', maxWidth: 300, backgroundColor: c.card, borderRadius: 14, overflow: 'hidden' },
    permissionBody: { padding: 18, alignItems: 'center' },
    permissionTitle: withAppFont({ color: c.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 }),
    permissionBodyText: withAppFont({ fontSize: 13, color: c.subtext, textAlign: 'center', lineHeight: 18 }),
    permissionActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    permissionBtn: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
    permissionBtnBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.border },
    permissionBtnMuted: withAppFont({ fontSize: 15, color: c.subtext }),
    permissionBtnPrimary: withAppFont({ fontSize: 15, fontWeight: '600', color: c.primary }),
  });
}
