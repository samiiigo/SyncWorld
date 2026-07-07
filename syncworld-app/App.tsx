import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useResolvedColorScheme, useThemedColors } from './src/theme/ThemeProvider';
import { useSettingsStore } from './src/context/useSettingsStore';
import type { ThemePreference } from './src/utils/theme/themePreference';
import { BorderRadius } from './src/theme/constants';
import { CornerRadius } from './src/theme/tokens';
import { appFont } from './src/theme/fonts';
import type { ColorPalette } from './src/theme/colorPalettes';
import type { ResolvedColorScheme } from './src/utils/theme/themePreference';

// ──────────────────────────────────────────────
// Domain model (mirrors the Sync Room prototype)
// ──────────────────────────────────────────────

type MemberStatus = 'online' | 'idle' | 'disconnected';

type MemberSeed = {
  id: string;
  name: string;
  city: string;
  cityShort: string;
  tzLabel: string;
  offset: number;
  status: MemberStatus;
  isYou?: boolean;
};

const MEMBERS: MemberSeed[] = [
  { id: 'you', name: 'You', city: 'New York', cityShort: 'NYC', tzLabel: 'GMT-4', offset: -4, status: 'online', isYou: true },
  { id: 'priya', name: 'Priya Sharma', city: 'London', cityShort: 'LON', tzLabel: 'GMT+1', offset: 1, status: 'online' },
  { id: 'kenji', name: 'Kenji Sato', city: 'Tokyo', cityShort: 'TOK', tzLabel: 'GMT+9', offset: 9, status: 'idle' },
  { id: 'elena', name: 'Elena Kovac', city: 'Berlin', cityShort: 'BER', tzLabel: 'GMT+2', offset: 2, status: 'online' },
  { id: 'marcus', name: 'Marcus Reid', city: 'Sydney', cityShort: 'SYD', tzLabel: 'GMT+11', offset: 11, status: 'disconnected' },
  { id: 'aiko', name: 'Aiko Tanaka', city: 'Los Angeles', cityShort: 'LA', tzLabel: 'GMT-7', offset: -7, status: 'online' },
  { id: 'fatima', name: 'Fatima Al-Sayed', city: 'Dubai', cityShort: 'DXB', tzLabel: 'GMT+4', offset: 4, status: 'idle' },
];

const CAP_OPTIONS = ['4', '6', '8', '12', 'No limit'];

// ──────────────────────────────────────────────
// Semantic theme derived from the design-system palette
// ──────────────────────────────────────────────

type SyncTheme = {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textTertiary: string;
  hairline: string;
  accent: string;
  destructive: string;
  success: string;
  sleepBg: string;
  sleepFg: string;
  businessBg: string;
  businessFg: string;
  eveningBg: string;
  eveningFg: string;
};

function buildSyncTheme(c: ColorPalette, scheme: ResolvedColorScheme): SyncTheme {
  const dark = scheme === 'dark';
  return {
    dark,
    bg: c.background,
    surface: c.card,
    surface2: c.surfaceElevated,
    text: c.textPrimary,
    textTertiary: c.textSecondary,
    hairline: c.border,
    accent: c.primary,
    destructive: c.danger,
    success: c.green,
    sleepBg: dark ? 'rgba(90,110,150,0.28)' : '#E4E8EF',
    sleepFg: dark ? '#AEBEDB' : '#3A4A63',
    businessBg: dark ? c.surfaceElevated : '#FFFFFF',
    businessFg: c.textSecondary,
    eveningBg: dark ? 'rgba(255,159,10,0.22)' : 'rgba(255,159,10,0.16)',
    eveningFg: dark ? '#FFB84D' : '#A15C00',
  };
}

// ──────────────────────────────────────────────
// Time helpers (0–24 UTC scrubber, per-member offsets)
// ──────────────────────────────────────────────

const norm = (h: number): number => ((h % 24) + 24) % 24;
const localHourFor = (offset: number, utcHour: number): number => norm(utcHour + offset);

type Period = 'sleep' | 'business' | 'evening';
const periodOf = (hourFloat: number): Period => {
  const h = norm(hourFloat);
  if (h < 6 || h >= 22) return 'sleep';
  if (h < 18) return 'business';
  return 'evening';
};
const periodColors = (period: Period, t: SyncTheme): { bg: string; fg: string } => {
  if (period === 'sleep') return { bg: t.sleepBg, fg: t.sleepFg };
  if (period === 'evening') return { bg: t.eveningBg, fg: t.eveningFg };
  return { bg: t.businessBg, fg: t.businessFg };
};

const formatLocal = (hourFloat: number): { label: string; hh24: number; mm: number } => {
  const h = norm(hourFloat);
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh = (hh + 1) % 24;
  }
  const ampm = hh < 12 ? 'AM' : 'PM';
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return { label: `${h12}:${String(mm).padStart(2, '0')} ${ampm}`, hh24: hh, mm };
};

const formatUtc = (hourFloat: number): string => {
  const l = formatLocal(hourFloat);
  return `${String(l.hh24).padStart(2, '0')}:${String(l.mm).padStart(2, '0')} UTC`;
};

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const genCode = (str: string): string => {
  let h = 0;
  for (const ch of str || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const s = h.toString(36).toUpperCase();
  return (s + 'SYNC42').slice(0, 6);
};

const statusColorFor = (status: MemberStatus, t: SyncTheme): string =>
  status === 'online' ? t.success : status === 'idle' ? t.eveningFg : t.destructive;
const statusLabelFor = (status: MemberStatus): string =>
  status === 'online' ? 'Online' : status === 'idle' ? 'Idle' : 'Disconnected';

// ──────────────────────────────────────────────
// Confetti (armed celebration)
// ──────────────────────────────────────────────

type ConfettiSeed = { left: number; delay: number; duration: number; rotate: number; color: string };

function ConfettiPiece({ seed }: { seed: ConfettiSeed }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(fall, {
      toValue: 1,
      duration: seed.duration,
      delay: seed.delay,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fall, seed.delay, seed.duration]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-16, 720] });
  const opacity = fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: `${seed.left}%`,
        width: 8,
        height: 14,
        borderRadius: 2,
        backgroundColor: seed.color,
        transform: [{ translateY }, { rotate: `${seed.rotate}deg` }],
        opacity,
      }}
    />
  );
}

// ──────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <SyncRoomApp />
    </ThemeProvider>
  );
}

type Screen = 'onboarding' | 'app' | 'armed';
type Tab = 'rooms' | 'world' | 'settings';
type SheetStep = null | 'create' | 'join';
type PendingAction = null | 'create' | 'join';
type Vote = 'yes' | 'no';
type Room = { id: string; name: string; code: string; cap: string };

const makeId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function SyncRoomApp() {
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const t = useMemo(() => buildSyncTheme(colors, scheme), [colors, scheme]);

  const [screen, setScreen] = useState<Screen>('onboarding');
  const [tab, setTab] = useState<Tab>('rooms');
  const [sheetStep, setSheetStep] = useState<SheetStep>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [participantCap, setParticipantCap] = useState('8');
  const [joinCode, setJoinCode] = useState<string[]>(['', '', '', '', '', '']);

  const [layout, setLayout] = useState<'A' | 'B'>('A');
  const [scrubberHour, setScrubberHour] = useState(14.5);
  const [dragging, setDragging] = useState(false);

  const [proposedHour, setProposedHour] = useState<number | null>(null);
  const [voteOpen, setVoteOpen] = useState(false);
  const [voteDeadline, setVoteDeadline] = useState(0);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [ghostMarkers, setGhostMarkers] = useState<number[]>([]);

  const [armedTarget, setArmedTarget] = useState(0);
  const [armingStatus, setArmingStatus] = useState<Record<string, boolean>>({});
  const [confetti, setConfetti] = useState<ConfettiSeed[]>([]);

  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const voteTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const armTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRefs = useRef<(RNTextInput | null)[]>([]);
  const trackWidth = useRef(0);

  // ── Clock + timer resolution ──
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (voteOpen && now >= voteDeadline) resolveVote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  useEffect(
    () => () => {
      voteTimeouts.current.forEach(clearTimeout);
      armTimeouts.current.forEach(clearTimeout);
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    },
    [],
  );

  // ── Derived ──
  const members = useMemo(
    () =>
      MEMBERS.map((m) => {
        const localHour = localHourFor(m.offset, scrubberHour);
        const period = periodOf(localHour);
        return {
          ...m,
          name: m.isYou ? displayName.trim() || 'You' : m.name,
          localHour,
          localLabel: formatLocal(localHour).label,
          localPct: (localHour / 24) * 100,
          period,
          pc: periodColors(period, t),
          initials: initialsOf(m.isYou ? displayName.trim() || 'You' : m.name),
        };
      }),
    [displayName, scrubberHour, t],
  );

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
  const otherCount = members.length - 1;
  const proposeDisabled = otherCount < 2;
  const thumbPercent = (scrubberHour / 24) * 100;
  const youOffset = MEMBERS[0].offset;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3200);
  };

  // ── Onboarding ──
  const enterApp = () => {
    if (!displayName.trim()) return;
    setActiveRoomId(null);
    setTab('rooms');
    setScreen('app');
  };

  // ── Rooms manager flow ──
  const onTapCreate = () => {
    if (!displayName.trim()) return;
    setRoomName('');
    setSheetStep('create');
  };
  const onTapJoin = () => {
    if (!displayName.trim()) return;
    setJoinCode(['', '', '', '', '', '']);
    setSheetStep('join');
  };
  const closeSheet = () => setSheetStep(null);
  const onSubmitCreate = () => {
    if (!roomName.trim()) return;
    setPendingAction('create');
    setPermissionOpen(true);
  };
  const onSubmitJoin = () => {
    if (!joinCode.every((c) => c)) return;
    setPendingAction('join');
    setPermissionOpen(true);
  };

  const commitPending = () => {
    setPermissionOpen(false);
    let newId: string | null = null;
    if (pendingAction === 'create') {
      const name = roomName.trim() || 'Sync Room';
      const room: Room = { id: makeId(), name, code: genCode(name), cap: participantCap };
      setRooms((prev) => [...prev, room]);
      newId = room.id;
      setRoomName('');
    } else if (pendingAction === 'join') {
      const code = joinCode.join('');
      const room: Room = { id: makeId(), name: `Room ${code}`, code, cap: '8' };
      setRooms((prev) => [...prev, room]);
      newId = room.id;
      setJoinCode(['', '', '', '', '', '']);
    }
    setPendingAction(null);
    setSheetStep(null);
    setScreen('app');
    setTab('rooms');
    if (newId) setActiveRoomId(newId);
  };

  const openRoom = (id: string) => setActiveRoomId(id);
  const exitToList = () => {
    setActiveRoomId(null);
    setVoteOpen(false);
    setGhostMarkers([]);
    setVotes({});
  };
  const leaveRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    if (activeRoomId === id) exitToList();
  };
  const signOut = () => {
    setScreen('onboarding');
    setSheetStep(null);
    setPermissionOpen(false);
    setActiveRoomId(null);
    setRooms([]);
    setVoteOpen(false);
    setGhostMarkers([]);
    setVotes({});
  };

  const applyPaste = (text: string) => {
    const clean = (text || 'SYNC42')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
      .split('');
    while (clean.length < 6) clean.push('');
    setJoinCode(clean);
  };

  // ── Scrubber drag ──
  const setHourFromX = (x: number) => {
    const w = trackWidth.current || 1;
    const pct = Math.max(0, Math.min(1, x / w));
    setScrubberHour(pct * 24);
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setDragging(true);
        setHourFromX(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => setHourFromX(e.nativeEvent.locationX),
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;
  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  // ── Voting ──
  const clearVoteTimers = () => {
    voteTimeouts.current.forEach(clearTimeout);
    voteTimeouts.current = [];
  };

  const onPropose = () => {
    if (proposeDisabled) return;
    setProposedHour(scrubberHour);
    setVotes({});
    setVoteDeadline(Date.now() + 22000);
    setVoteOpen(true);
    const others = MEMBERS.filter((m) => m.id !== 'you' && m.status !== 'disconnected');
    others.forEach((m) => {
      const delay = 1500 + Math.random() * 9000;
      voteTimeouts.current.push(
        setTimeout(() => castVote(m.id, Math.random() < 0.72 ? 'yes' : 'no'), delay),
      );
    });
  };

  const castVote = (id: string, val: Vote) => {
    setVotes((prev) => {
      const next = { ...prev, [id]: val };
      if (Object.keys(next).length >= MEMBERS.length) {
        setTimeout(() => resolveVoteWith(next), 0);
      }
      return next;
    });
  };

  const resolveVote = () => resolveVoteWith(votes);
  const resolveVoteWith = (finalVotes: Record<string, Vote>) => {
    if (!voteOpen) return;
    clearVoteTimers();
    const yes = Object.values(finalVotes).filter((v) => v === 'yes').length;
    if (yes > MEMBERS.length / 2) enterArmed();
    else veto();
  };

  const veto = () => {
    setVoteOpen(false);
    const hour = proposedHour ?? scrubberHour;
    setGhostMarkers((prev) => [...prev, hour].slice(-4));
    showToast('\u274C Vetoed \u2014 returning to scrubber');
  };

  const onVoteYes = () => castVote('you', 'yes');
  const onVoteNo = () => castVote('you', 'no');

  // ── Armed ──
  const enterArmed = () => {
    const arming: Record<string, boolean> = { you: true };
    MEMBERS.forEach((m) => {
      if (m.id !== 'you') arming[m.id] = false;
    });
    const palette = [t.accent, t.success, t.textTertiary, colors.purple];
    const seeds: ConfettiSeed[] = Array.from({ length: 26 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.round(Math.random() * 500),
      duration: 1600 + Math.random() * 900,
      rotate: Math.round(Math.random() * 360),
      color: palette[i % palette.length],
    }));
    setVoteOpen(false);
    setArmedTarget(Date.now() + (3 + Math.random() * 3) * 3600 * 1000);
    setArmingStatus(arming);
    setConfetti(seeds);
    setScreen('armed');
    armTimeouts.current.push(setTimeout(() => setConfetti([]), 3200));
    MEMBERS.filter((m) => m.id !== 'you').forEach((m) => {
      const delay = m.status === 'disconnected' ? 7000 + Math.random() * 4000 : 800 + Math.random() * 3200;
      armTimeouts.current.push(
        setTimeout(() => setArmingStatus((prev) => ({ ...prev, [m.id]: true })), delay),
      );
    });
  };

  const onDisarm = () => {
    armTimeouts.current.forEach(clearTimeout);
    armTimeouts.current = [];
    setScreen('app');
    showToast('Alarm disarmed');
  };
  const onShare = () => showToast('Share link copied');

  // ── Countdown ──
  const remainingMs = Math.max(0, armedTarget - now);
  const cdH = Math.floor(remainingMs / 3600000);
  const cdM = Math.floor((remainingMs % 3600000) / 60000);
  const cdS = Math.floor((remainingMs % 60000) / 1000);
  const countdownLabel = `Fires in ${cdH}h ${cdM}m ${cdS}s`;

  const votedCount = Object.values(votes).filter(Boolean).length;
  const remainingSec = Math.max(0, Math.ceil((voteDeadline - now) / 1000));
  const proposed = proposedHour ?? 0;

  // ── Render ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />

      {/* ───────── Onboarding ───────── */}
      {screen === 'onboarding' && (
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 }}>
          <View style={{ width: 132, height: 132, marginTop: 24, marginBottom: 36 }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 66, borderWidth: 2, borderColor: t.accent, opacity: 0.9 }} />
            <View style={{ position: 'absolute', left: -14, right: -14, top: 31, height: 70, borderWidth: 1.5, borderColor: t.textTertiary, borderRadius: 40, opacity: 0.5 }} />
            <View style={{ position: 'absolute', top: -10, bottom: -10, left: 31, width: 70, borderWidth: 1.5, borderColor: t.textTertiary, borderRadius: 40, opacity: 0.35 }} />
            <View style={{ position: 'absolute', top: 26, left: 26, right: 26, bottom: 26, borderRadius: 40, backgroundColor: t.accent, opacity: 0.1 }} />
          </View>

          <Text style={[appFont(30, '700', t.text), { letterSpacing: 0.4, marginBottom: 8 }]}>Sync Room</Text>
          <Text style={[appFont(16, '400', t.textTertiary), { textAlign: 'center', marginBottom: 36 }]}>
            One time. Every timezone.
          </Text>

          <View style={{ width: '100%' }}>
            <Text style={[appFont(13, '600', t.textTertiary), { marginBottom: 8 }]}>Display name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Jordan"
              placeholderTextColor={t.textTertiary}
              style={{
                height: 46,
                borderWidth: 1,
                borderColor: t.hairline,
                backgroundColor: t.surface,
                borderRadius: BorderRadius.md,
                paddingHorizontal: 14,
                color: t.text,
                fontSize: 16,
              }}
            />
          </View>

          <View style={{ width: '100%', marginTop: 'auto', gap: 12 }}>
            <PrimaryButton label="Continue" disabled={!displayName.trim()} onPress={enterApp} t={t} />
          </View>
        </View>
      )}

      {/* ───────── Room ───────── */}
      {screen === 'app' && (
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
            {tab === 'rooms' && activeRoom ? (
              <Pressable onPress={exitToList} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: t.accent, fontSize: 26 }}>{'\u2039'}</Text>
              </Pressable>
            ) : (
              <View style={{ width: 44, height: 44 }} />
            )}
            <Text style={appFont(17, '600', t.text)}>
              {tab === 'rooms' ? (activeRoom ? activeRoom.name : 'Rooms') : tab === 'world' ? 'World' : 'Settings'}
            </Text>
            {tab === 'rooms' && !activeRoom ? (
              <Pressable onPress={onTapCreate} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={26} color={t.accent} />
              </Pressable>
            ) : (
              <View style={{ width: 44, height: 44 }} />
            )}
          </View>

          {/* ── Rooms tab: manager list ── */}
          {tab === 'rooms' && !activeRoom && (
            <RoomsManager rooms={rooms} onOpen={openRoom} onLeave={leaveRoom} onCreate={onTapCreate} onJoin={onTapJoin} t={t} />
          )}

          {/* ── Rooms tab: room detail ── */}
          {tab === 'rooms' && activeRoom && (
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
            <Pressable style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.hairline, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: t.text, fontSize: 17 }}>{'\u2699'}</Text>
            </Pressable>
          </View>
          </View>
          )}

          {/* ── World tab ── */}
          {tab === 'world' && <WorldClock now={now} t={t} />}

          {/* ── Settings tab ── */}
          {tab === 'settings' && (
            <SettingsPane
              t={t}
              displayName={displayName}
              onChangeName={setDisplayName}
              roomCount={rooms.length}
              preference={themePreference}
              onChangePreference={setThemePreference}
              onSignOut={signOut}
            />
          )}

          {/* Bottom navigation */}
          <NavBar tab={tab} onSelect={setTab} t={t} />
        </View>
      )}

      {/* ───────── Armed ───────── */}
      {screen === 'armed' && (
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 40, paddingBottom: 24, overflow: 'hidden' }}>
          {confetti.map((seed, i) => (
            <ConfettiPiece key={`c-${i}`} seed={seed} />
          ))}

          <Text style={[appFont(13, '600', t.accent), { letterSpacing: 0.4, marginBottom: 18 }]}>ALARM ARMED</Text>
          <Text style={appFont(64, '600', t.text)}>{formatLocal(localHourFor(youOffset, proposed)).label}</Text>
          <Text style={{ fontSize: 13, color: t.textTertiary, marginBottom: 28 }}>{formatUtc(proposed)}</Text>

          <View style={{ backgroundColor: t.surface2, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 36 }}>
            <Text style={appFont(17, '600', t.accent)}>{countdownLabel}</Text>
          </View>

          <View style={{ width: '100%', marginBottom: 28 }}>
            <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, marginBottom: 10 }]}>MEMBERS ARMING</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {members.map((m) => {
                const armed = m.isYou ? true : !!armingStatus[m.id];
                return (
                  <View key={m.id} style={{ alignItems: 'center', gap: 5, width: 58 }}>
                    <View style={{ width: 40, height: 40 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: t.text }}>{m.initials}</Text>
                      </View>
                      <View style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: armed ? t.success : t.textTertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.bg }}>
                        <Text style={{ fontSize: 9, color: '#fff' }}>{armed ? '\u2714' : '\u23F3'}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 10, color: t.textTertiary }} numberOfLines={1}>
                      {armed ? 'Armed' : 'Arming\u2026'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ width: '100%', backgroundColor: t.surface2, borderRadius: 18, padding: 14, marginBottom: 'auto' }}>
            <Text style={[appFont(11, '600', t.textTertiary), { letterSpacing: 0.4, marginBottom: 8 }]}>LOCK SCREEN PREVIEW</Text>
            <View style={{ backgroundColor: t.text, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: t.accent }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: t.bg }}>Sync Room</Text>
                <Text style={{ fontSize: 11, color: t.bg, opacity: 0.7 }}>{countdownLabel}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: t.bg }}>{formatLocal(localHourFor(youOffset, proposed)).label}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Disarm Alarm" onPress={onDisarm} t={t} tint={t.destructive} height={46} />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Share Room" onPress={onShare} t={t} tint={t.accent} height={46} />
            </View>
          </View>
        </View>
      )}

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
            <Text style={appFont(44, '600', t.text)}>{formatLocal(localHourFor(youOffset, proposed)).label}</Text>
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
        <View style={{ position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: t.text, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 }}>
          <Text style={{ color: t.bg, fontSize: 13, fontWeight: '500' }}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// Small presentational helpers
// ──────────────────────────────────────────────

function withAlpha(color: string, alpha: number): string {
  // Supports #RRGGBB tokens; falls back to the original for rgba()/named colors.
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  t,
  height = 50,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  t: SyncTheme;
  height?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height,
        borderRadius: CornerRadius.md,
        backgroundColor: t.accent,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled,
  t,
  tint,
  height = 50,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  t: SyncTheme;
  tint?: string;
  height?: number;
}) {
  const color = tint ?? t.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height,
        borderRadius: CornerRadius.full,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function SegButton({ label, active, onPress, t }: { label: string; active: boolean; onPress: () => void; t: SyncTheme }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: 30, borderRadius: 8, backgroundColor: active ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : t.textTertiary }}>{label}</Text>
    </Pressable>
  );
}

function SheetHeader({
  title,
  onClose,
  action,
  actionEnabled,
  onAction,
  t,
}: {
  title: string;
  onClose: () => void;
  action: string;
  actionEnabled: boolean;
  onAction: () => void;
  t: SyncTheme;
}) {
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.hairline }}>
      <Pressable onPress={onClose} style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
        <Text style={{ color: t.text, fontSize: 18 }}>{'\u2715'}</Text>
      </Pressable>
      <Text style={appFont(17, '600', t.text)}>{title}</Text>
      <Pressable onPress={onAction} disabled={!actionEnabled} style={{ width: 60, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: actionEnabled ? t.accent : t.textTertiary }}>{action}</Text>
      </Pressable>
    </View>
  );
}

// ──────────────────────────────────────────────
// Rooms manager (Rooms tab root)
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

// ──────────────────────────────────────────────
// Bottom navigation
// ──────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'rooms', label: 'Rooms', icon: 'alarm', outline: 'alarm-outline' },
  { key: 'world', label: 'World', icon: 'earth', outline: 'earth-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings', outline: 'settings-outline' },
] as const;

function NavBar({ tab, onSelect, t }: { tab: Tab; onSelect: (tab: Tab) => void; t: SyncTheme }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: t.hairline,
        backgroundColor: t.surface,
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = tab === item.key;
        const color = active ? t.accent : t.textTertiary;
        return (
          <Pressable key={item.key} onPress={() => onSelect(item.key)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Ionicons name={active ? item.icon : item.outline} size={24} color={color} />
            <Text style={{ fontSize: 10, fontWeight: '600', color }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ──────────────────────────────────────────────
// World clock tab
// ──────────────────────────────────────────────

function WorldClock({ now, t }: { now: number; t: SyncTheme }) {
  const utcHour = (now / 3600000) % 24;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
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
  );
}

// ──────────────────────────────────────────────
// Settings tab
// ──────────────────────────────────────────────

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

function SettingsPane({
  t,
  displayName,
  onChangeName,
  roomCount,
  preference,
  onChangePreference,
  onSignOut,
}: {
  t: SyncTheme;
  displayName: string;
  onChangeName: (value: string) => void;
  roomCount: number;
  preference: ThemePreference;
  onChangePreference: (preference: ThemePreference) => void;
  onSignOut: () => void;
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
      <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4 }]}>APPEARANCE</Text>
      <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, padding: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6, backgroundColor: t.surface2, borderRadius: 10, padding: 3 }}>
          {THEME_OPTIONS.map((opt) => {
            const active = preference === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => onChangePreference(opt.key)}
                style={{ flex: 1, height: 34, borderRadius: 8, backgroundColor: active ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#fff' : t.textTertiary }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4, marginTop: 12 }]}>PROFILE</Text>
      <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, padding: 16, gap: 8 }}>
        <Text style={[appFont(13, '600', t.textTertiary)]}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={onChangeName}
          placeholder="Your name"
          placeholderTextColor={t.textTertiary}
          style={{ height: 46, borderWidth: 1, borderColor: t.hairline, backgroundColor: t.bg, borderRadius: BorderRadius.md, paddingHorizontal: 14, color: t.text, fontSize: 16 }}
        />
      </View>

      <Text style={[appFont(12, '600', t.textTertiary), { letterSpacing: 0.4, paddingVertical: 8, paddingHorizontal: 4, marginTop: 12 }]}>ROOMS</Text>
      <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, borderRadius: 18, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.hairline }}>
          <Text style={appFont(16, '400', t.text)}>Joined rooms</Text>
          <Text style={{ fontSize: 15, color: t.textTertiary }}>{roomCount}</Text>
        </View>
        <Pressable onPress={onSignOut} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
          <Text style={appFont(16, '600', t.destructive)}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 12, color: t.textTertiary, textAlign: 'center', marginTop: 20 }}>Sync Room {'\u00B7'} v0.0.1</Text>
    </ScrollView>
  );
}
