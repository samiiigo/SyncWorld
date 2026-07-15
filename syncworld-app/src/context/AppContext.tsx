import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, type LayoutChangeEvent, type TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { useResolvedColorScheme, useThemedColors } from '../theme/ThemeProvider';
import { useSettingsStore } from './useSettingsStore';
import type { ThemePreference } from '../utils/theme/themePreference';
import type { ColorPalette } from '../theme/colorPalettes';
import type { ResolvedColorScheme } from '../utils/theme/themePreference';

// ──────────────────────────────────────────────
// Domain models and types
// ──────────────────────────────────────────────

export type MemberStatus = 'online' | 'idle' | 'disconnected';

export type MemberSeed = {
  id: string;
  name: string;
  city: string;
  cityShort: string;
  tzLabel: string;
  offset: number;
  status: MemberStatus;
  isYou?: boolean;
};

export const MEMBERS: MemberSeed[] = [
  { id: 'you', name: 'You', city: 'Austin', cityShort: 'AUS', tzLabel: 'GMT-5', offset: -5, status: 'online', isYou: true },
  { id: 'priya', name: 'Priya Sharma', city: 'London', cityShort: 'LON', tzLabel: 'GMT+1', offset: 1, status: 'online' },
  { id: 'kenji', name: 'Kenji Sato', city: 'Tokyo', cityShort: 'TOK', tzLabel: 'GMT+9', offset: 9, status: 'idle' },
  { id: 'elena', name: 'Elena Kovač', city: 'Berlin', cityShort: 'BER', tzLabel: 'GMT+2', offset: 2, status: 'online' },
  { id: 'marcus', name: 'Marcus Reid', city: 'Sydney', cityShort: 'SYD', tzLabel: 'GMT+11', offset: 11, status: 'disconnected' },
  { id: 'aiko', name: 'Aiko Tanaka', city: 'Dubai', cityShort: 'DXB', tzLabel: 'GMT+4', offset: 4, status: 'online' },
];

export const DEFAULT_ROOM: Room = {
  id: 'main-office',
  name: 'Main Office',
  code: 'MAIN01',
  cap: '8',
};

export const CAP_OPTIONS = ['4', '6', '8', '12', 'No limit'];

export type SyncTheme = {
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

export type ConfettiSeed = { left: number; delay: number; duration: number; rotate: number; color: string };
export type Vote = 'yes' | 'no';
export type Room = { id: string; name: string; code: string; cap: string };
export type Tab = 'rooms' | 'world' | 'settings';
export type SheetStep = null | 'create' | 'join';
export type PendingAction = null | 'create' | 'join';

// ──────────────────────────────────────────────
// Time helpers (0–24 UTC scrubber, per-member offsets)
// ──────────────────────────────────────────────

export const norm = (h: number): number => ((h % 24) + 24) % 24;
export const localHourFor = (offset: number, utcHour: number): number => norm(utcHour + offset);

export type Period = 'sleep' | 'business' | 'evening';
export const periodOf = (hourFloat: number): Period => {
  const h = norm(hourFloat);
  if (h < 6 || h >= 22) return 'sleep';
  if (h < 18) return 'business';
  return 'evening';
};

export const periodColors = (period: Period, t: SyncTheme): { bg: string; fg: string } => {
  if (period === 'sleep') return { bg: t.sleepBg, fg: t.sleepFg };
  if (period === 'evening') return { bg: t.eveningBg, fg: t.eveningFg };
  return { bg: t.businessBg, fg: t.businessFg };
};

export const formatLocal = (hourFloat: number): { label: string; hh24: number; mm: number } => {
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

export const formatUtc = (hourFloat: number): string => {
  const l = formatLocal(hourFloat);
  return `${String(l.hh24).padStart(2, '0')}:${String(l.mm).padStart(2, '0')} UTC`;
};

export const initialsOf = (name: string): string =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const genCode = (str: string): string => {
  let h = 0;
  for (const ch of str || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const s = h.toString(36).toUpperCase();
  return (s + 'SYNC42').slice(0, 6);
};

export const statusColorFor = (status: MemberStatus, t: SyncTheme): string =>
  status === 'online' ? t.success : status === 'idle' ? t.eveningFg : t.destructive;

export const statusLabelFor = (status: MemberStatus): string =>
  status === 'online' ? 'Online' : status === 'idle' ? 'Idle' : 'Disconnected';

export function buildSyncTheme(c: ColorPalette, scheme: ResolvedColorScheme): SyncTheme {
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

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

const makeId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export interface AppContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  t: SyncTheme;
  colors: ColorPalette;
  scheme: ResolvedColorScheme;
  displayName: string;
  setDisplayName: (val: string) => void;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;
  roomName: string;
  setRoomName: (val: string) => void;
  participantCap: string;
  setParticipantCap: (val: string) => void;
  joinCode: string[];
  setJoinCode: (val: string[]) => void;
  layout: 'A' | 'B';
  setLayout: (val: 'A' | 'B') => void;
  scrubberHour: number;
  setScrubberHour: (val: number) => void;
  dragging: boolean;
  setDragging: (val: boolean) => void;
  proposedHour: number | null;
  setProposedHour: (val: number | null) => void;
  voteOpen: boolean;
  setVoteOpen: (val: boolean) => void;
  voteDeadline: number;
  setVoteDeadline: (val: number) => void;
  votes: Record<string, Vote>;
  setVotes: React.Dispatch<React.SetStateAction<Record<string, Vote>>>;
  ghostMarkers: number[];
  setGhostMarkers: React.Dispatch<React.SetStateAction<number[]>>;
  armedTarget: number;
  setArmedTarget: (val: number) => void;
  armingStatus: Record<string, boolean>;
  setArmingStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  confetti: ConfettiSeed[];
  setConfetti: React.Dispatch<React.SetStateAction<ConfettiSeed[]>>;
  toast: string | null;
  setToast: (val: string | null) => void;
  now: number;
  sheetStep: SheetStep;
  setSheetStep: (val: SheetStep) => void;
  permissionOpen: boolean;
  setPermissionOpen: (val: boolean) => void;
  pendingAction: PendingAction;
  setPendingAction: (val: PendingAction) => void;

  // Derived properties
  members: any[];
  activeRoom: Room | null;
  otherCount: number;
  proposeDisabled: boolean;
  thumbPercent: number;
  youOffset: number;
  remainingMs: number;
  cdH: number;
  cdM: number;
  cdS: number;
  countdownLabel: string;
  votedCount: number;
  remainingSec: number;
  proposed: number;

  // Actions/handlers
  showToast: (message: string) => void;
  enterApp: () => void;
  onTapCreate: () => void;
  onTapJoin: () => void;
  closeSheet: () => void;
  onSubmitCreate: () => void;
  onSubmitJoin: () => void;
  commitPending: () => void;
  openRoom: (id: string) => void;
  exitToList: () => void;
  leaveRoom: (id: string) => void;
  signOut: () => void;
  applyPaste: (text: string) => void;
  pan: any;
  onTrackLayout: (e: LayoutChangeEvent) => void;
  onTrackMeasure: (pageX: number) => void;
  onPropose: () => void;
  onVoteYes: () => void;
  onVoteNo: () => void;
  onDisarm: () => void;
  onShare: () => void;
  codeRefs: React.MutableRefObject<(RNTextInput | null)[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const t = useMemo(() => buildSyncTheme(colors, scheme), [colors, scheme]);

  const [displayName, setDisplayName] = useState('');
  const [rooms, setRooms] = useState<Room[]>([DEFAULT_ROOM]);
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
  const [sheetStep, setSheetStep] = useState<SheetStep>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const voteTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const armTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRefs = useRef<(RNTextInput | null)[]>([]);
  const trackWidth = useRef(0);
  const trackOriginX = useRef(0);

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
    router.replace('/(tabs)/rooms');
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
    if (newId) {
      setActiveRoomId(newId);
      router.replace(`/(tabs)/rooms/${newId}`);
    } else {
      router.replace('/(tabs)/rooms');
    }
  };

  const openRoom = (id: string) => {
    setActiveRoomId(id);
    router.push(`/(tabs)/rooms/${id}`);
  };
  const exitToList = useCallback(() => {
    setActiveRoomId(null);
    setVoteOpen(false);
    setGhostMarkers([]);
    setVotes({});
  }, []);
  const leaveRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    if (activeRoomId === id) {
      if (router.canGoBack()) router.back();
      else {
        exitToList();
        router.replace('/(tabs)/rooms');
      }
    }
  };
  const signOut = () => {
    setDisplayName('');
    setRooms([]);
    setSheetStep(null);
    setPermissionOpen(false);
    setActiveRoomId(null);
    setVoteOpen(false);
    setGhostMarkers([]);
    setVotes({});
    router.replace('/onboarding');
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
  const setHourFromPageX = (pageX: number) => {
    const w = trackWidth.current || 1;
    const pct = Math.max(0, Math.min(1, (pageX - trackOriginX.current) / w));
    setScrubberHour(pct * 24);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        setDragging(true);
        setHourFromPageX(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => setHourFromPageX(e.nativeEvent.pageX),
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const onTrackMeasure = (pageX: number) => {
    trackOriginX.current = pageX;
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
    
    router.replace('/armed');

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
    router.replace('/(tabs)/rooms');
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

  return (
    <AppContext.Provider
      value={{
        themePreference,
        setThemePreference,
        t,
        colors,
        scheme,
        displayName,
        setDisplayName,
        rooms,
        setRooms,
        activeRoomId,
        setActiveRoomId,
        roomName,
        setRoomName,
        participantCap,
        setParticipantCap,
        joinCode,
        setJoinCode,
        layout,
        setLayout,
        scrubberHour,
        setScrubberHour,
        dragging,
        setDragging,
        proposedHour,
        setProposedHour,
        voteOpen,
        setVoteOpen,
        voteDeadline,
        setVoteDeadline,
        votes,
        setVotes,
        ghostMarkers,
        setGhostMarkers,
        armedTarget,
        setArmedTarget,
        armingStatus,
        setArmingStatus,
        confetti,
        setConfetti,
        toast,
        setToast,
        now,
        sheetStep,
        setSheetStep,
        permissionOpen,
        setPermissionOpen,
        pendingAction,
        setPendingAction,
        members,
        activeRoom,
        otherCount,
        proposeDisabled,
        thumbPercent,
        youOffset,
        remainingMs,
        cdH,
        cdM,
        cdS,
        countdownLabel,
        votedCount,
        remainingSec,
        proposed,
        showToast,
        enterApp,
        onTapCreate,
        onTapJoin,
        closeSheet,
        onSubmitCreate,
        onSubmitJoin,
        commitPending,
        openRoom,
        exitToList,
        leaveRoom,
        signOut,
        applyPaste,
        pan,
        onTrackLayout,
        onTrackMeasure,
        onPropose,
        onVoteYes,
        onVoteNo,
        onDisarm,
        onShare,
        codeRefs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
