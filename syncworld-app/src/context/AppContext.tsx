// ──────────────────────────────────────────────
// AppContext.tsx — the screen-facing facade.
//
// Screens read everything from useAppContext(); this provider owns UI state
// (sheets, toasts, the scrubber thumb) and drives a SyncBackend:
//   live → Firebase + realtime server   demo → in-memory simulation
// chosen once at startup from EXPO_PUBLIC_DEMO_MODE (see config/env.ts).
// All times are UTC epoch ms; conversion to each member's zone is display-only.
// ──────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { loadEnvConfig } from '@/config/env';
import { createDemoBackend } from '@/features/session/backends/demo.backend';
import { createLiveBackend } from '@/features/session/backends/live.backend';
import { useSessionStore } from '@/features/session/session.store';
import {
  describeBackendError,
  type MemberStatus,
  type RoomSummary,
  type SessionMember,
  type SessionProposal,
  type SessionRoom,
  type SyncBackend,
  type VoteChoice,
} from '@/features/session/session.types';
import { useSettingsStore } from '@/features/settings/state/settings.store';
import {
  cancelLocalAlarm,
  getPushRegistration,
  installAlarmNotificationHandler,
  requestAlarmPermission,
  scheduleLocalAlarm,
} from '@/shared/lib/alarms/alarmDevice';
import { haptics } from '@/shared/lib/platform/haptics';
import { shareRoomInvite } from '@/shared/lib/platform/share';
import { MS_PER_MINUTE, SCRUBBER_THROTTLE_MS, SCRUBBER_TICK_MS, SCRUBBER_WINDOW_MS } from '@/shared/lib/time/time.constants';
import {
  cityFromTimezone,
  deviceTimezone,
  formatCountdown,
  formatLocalTime,
  getMemberOffsetLabel,
  isLateNight,
  localHourFloat,
  periodForHour,
  relativeDayLabel,
  snapTo,
  type DayPeriod,
} from '@/shared/lib/time/time.conversions';
import { useResolvedColorScheme, useThemedColors } from '@/shared/theme/ThemeProvider';
import type { ColorPalette } from '@/shared/theme/colorPalettes';
import type { ResolvedColorScheme, ThemePreference } from '@/shared/utils/theme/themePreference';
import type { IANATimezone, UTCEpochMs } from '@domain/common';
import { RoutePaths } from '@/routes';

// ──────────────────────────────────────────────
// Theme + display helpers shared by screens
// ──────────────────────────────────────────────

export type { MemberStatus };
export type Period = DayPeriod;

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
export type Vote = VoteChoice;
export type SheetStep = null | 'create' | 'join';
export type PendingAction = null | 'create' | 'join';

export function buildSyncTheme(c: ColorPalette, scheme: ResolvedColorScheme): SyncTheme {
  return {
    dark: scheme === 'dark',
    bg: c.background,
    surface: c.card,
    surface2: c.surfaceElevated,
    text: c.textPrimary,
    textTertiary: c.textSecondary,
    hairline: c.border,
    accent: c.primary,
    destructive: c.danger,
    success: c.green,
    sleepBg: c.sleepBg,
    sleepFg: c.sleepFg,
    businessBg: c.businessBg,
    businessFg: c.businessFg,
    eveningBg: c.eveningBg,
    eveningFg: c.eveningFg,
  };
}

export const periodColors = (period: Period, t: SyncTheme): { bg: string; fg: string } => {
  if (period === 'sleep') return { bg: t.sleepBg, fg: t.sleepFg };
  if (period === 'evening') return { bg: t.eveningBg, fg: t.eveningFg };
  return { bg: t.businessBg, fg: t.businessFg };
};

export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

export const statusLabelFor = (status: MemberStatus): string =>
  status === 'online' ? 'Online' : status === 'idle' ? 'Idle' : 'Disconnected';

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

export const capFromLabel = (label: string): number | null => (label === 'No limit' ? null : Number(label));

/** A member as screens render them at the current scrubber position. */
export type MemberView = SessionMember & {
  initials: string;
  city: string;
  offsetLabel: string;
  /** Local time at the scrubber, e.g. "2:30 PM". */
  localLabel: string;
  /** "Today" / "Tomorrow" / weekday in the member's zone. */
  dayLabel: string;
  localHour: number;
  period: Period;
  pc: { bg: string; fg: string };
  /** 11 PM–6 AM for this member (spec warning). */
  lateNight: boolean;
};

/** Start of the 48h scrubber window: now, floored to the 15-minute tick. */
const windowStartFor = (now: number) => Math.floor(now / SCRUBBER_TICK_MS) * SCRUBBER_TICK_MS;

// ──────────────────────────────────────────────
// Context shape
// ──────────────────────────────────────────────

export interface AppContextType {
  backendKind: SyncBackend['kind'];
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  t: SyncTheme;
  colors: ColorPalette;
  scheme: ResolvedColorScheme;

  // Profile
  hydrated: boolean;
  displayName: string;
  setDisplayName: (val: string) => void;
  timezone: string;

  // Rooms
  rooms: RoomSummary[];
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;
  activeRoom: SessionRoom | null;
  activeSummary: RoomSummary | null;
  members: MemberView[];
  you: MemberView | null;
  connected: boolean;
  busy: boolean;

  // Create / join sheets
  roomName: string;
  setRoomName: (val: string) => void;
  participantCap: string;
  setParticipantCap: (val: string) => void;
  joinCode: string[];
  setJoinCode: (val: string[]) => void;
  codeRefs: React.MutableRefObject<(RNTextInput | null)[]>;
  sheetStep: SheetStep;
  permissionOpen: boolean;
  pendingAction: PendingAction;

  // Scrubber (48h window from now)
  layout: 'A' | 'B';
  setLayout: (val: 'A' | 'B') => void;
  windowStart: number;
  windowEnd: number;
  scrubberUtc: number;
  thumbPercent: number;
  dragging: boolean;
  setDragging: (val: boolean) => void;
  /** Move the thumb to a 0–1 fraction of the track. */
  scrubTo: (fraction: number) => void;
  /** Keyboard / button nudge in ms (desktop: ←/→ 15 min, Shift 1 h). */
  nudgeScrubber: (deltaMs: number) => void;
  lateNightMembers: MemberView[];
  ghostMarkers: number[];

  // Voting
  proposal: SessionProposal | null;
  voteOpen: boolean;
  proposedUtc: number;
  myVote: VoteChoice | null;
  votedCount: number;
  remainingSec: number;
  proposeDisabled: boolean;
  proposeHint: string | null;

  // Armed
  armedTarget: number;
  remainingMs: number;
  countdownLabel: string;
  confetti: ConfettiSeed[];
  alarmFired: boolean;

  // Feedback
  toast: string | null;
  showToast: (message: string) => void;
  now: number;

  // Actions
  enterApp: () => void;
  onTapCreate: () => void;
  onTapJoin: () => void;
  closeSheet: () => void;
  onSubmitCreate: () => void;
  onSubmitJoin: () => void;
  /** Permission explainer answered; `allow` asks the OS for notification permission. */
  commitPending: (allow?: boolean) => void;
  openRoom: (id: string) => void;
  exitToList: () => void;
  leaveRoom: (id: string) => void;
  signOut: () => void;
  applyPaste: (text: string) => void;
  onPropose: () => void;
  onVoteYes: () => void;
  onVoteNo: () => void;
  /** Veto and suggest the proposed time plus `hours` (counter-offer). */
  onCounter: (hours: 1 | 2) => void;
  onDisarm: () => void;
  onWakeUp: () => void;
  onShare: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function createBackend(): SyncBackend {
  return loadEnvConfig().demoMode ? createDemoBackend() : createLiveBackend();
}

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const t = useMemo(() => buildSyncTheme(colors, scheme), [colors, scheme]);

  const backend = useMemo(createBackend, []);

  // Persisted profile + rooms
  const hydrated = useSessionStore((s) => s.hydrated);
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const storedTimezone = useSessionStore((s) => s.timezone);
  const rooms = useSessionStore((s) => s.rooms);
  const upsertRoom = useSessionStore((s) => s.upsertRoom);
  const removeRoom = useSessionStore((s) => s.removeRoom);
  const permissionPrimed = useSessionStore((s) => s.permissionPrimed);
  const timezone = storedTimezone ?? deviceTimezone();

  // UI state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<SessionRoom | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [participantCap, setParticipantCap] = useState('8');
  const [joinCode, setJoinCode] = useState<string[]>(['', '', '', '', '', '']);
  const [sheetStep, setSheetStep] = useState<SheetStep>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [layout, setLayout] = useState<'A' | 'B'>('A');
  const [now, setNow] = useState(Date.now());
  const [scrubberUtc, setScrubberUtc] = useState(() => windowStartFor(Date.now()) + 2 * 60 * MS_PER_MINUTE);
  const [dragging, setDragging] = useState(false);
  const [ghostMarkers, setGhostMarkers] = useState<number[]>([]);
  const [dismissedProposalId, setDismissedProposalId] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiSeed[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const codeRefs = useRef<(RNTextInput | null)[]>([]);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<SyncBackend['connectRealtime']> | null>(null);
  const draggingRef = useRef(false);
  const lastSentAt = useRef(0);
  const pendingSend = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTick = useRef(0);
  const prevRoom = useRef<SessionRoom | null>(null);

  useEffect(() => {
    installAlarmNotificationHandler();
    backend.signIn().catch(() => {
      // Retried implicitly by the next backend call; surfaced there.
    });
  }, [backend]);

  // Persist the device zone at first launch (spec: IANA id, captured silently).
  useEffect(() => {
    if (hydrated && !storedTimezone) useSessionStore.getState().setTimezone(deviceTimezone());
  }, [hydrated, storedTimezone]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      if (pendingSend.current) clearTimeout(pendingSend.current);
    },
    [],
  );

  // ── Live room subscription + realtime channel ──
  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      prevRoom.current = null;
      return;
    }
    let disposed = false;
    let triedRestore = false;
    const unwatch = backend.watchRoom(
      activeRoomId,
      (room) => {
        if (disposed) return;
        if (!room && backend.kind === 'demo' && !triedRestore) {
          // Demo rooms live in memory; re-create a remembered one after a reload.
          triedRestore = true;
          const summary = useSessionStore.getState().rooms.find((r) => r.id === activeRoomId);
          if (summary) {
            backend
              .joinRoom({ code: summary.code, displayName: displayName || 'You', timezone })
              .catch(() => undefined);
          }
          return;
        }
        setActiveRoom(room);
        if (room) upsertRoom({ id: room.id, name: room.name, code: room.code });
      },
      (message) => showToast(message),
    );
    const channel = backend.connectRealtime(activeRoomId, {
      onScrubber: (utc) => {
        if (!draggingRef.current) setScrubberUtc(utc);
      },
      onConnectionChange: setConnected,
      onError: (message) => showToast(message),
    });
    channelRef.current = channel;
    return () => {
      disposed = true;
      unwatch();
      channel.close();
      channelRef.current = null;
      setConnected(false);
    };
    // displayName/timezone only matter for the one-off demo restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, backend, upsertRoom, showToast]);

  // ── Derived: window, members ──
  const windowStart = windowStartFor(now);
  const windowEnd = windowStart + SCRUBBER_WINDOW_MS;

  // Keep the thumb inside the moving window.
  useEffect(() => {
    if (scrubberUtc < windowStart) setScrubberUtc(windowStart);
    else if (scrubberUtc > windowEnd) setScrubberUtc(windowEnd);
  }, [scrubberUtc, windowStart, windowEnd]);

  const members = useMemo<MemberView[]>(() => {
    const list = activeRoom?.members ?? [];
    return list.map((m) => {
      const name = m.isYou ? displayName.trim() || m.name || 'You' : m.name;
      const localHour = localHourFloat(scrubberUtc, m.timezone);
      const period = periodForHour(localHour);
      return {
        ...m,
        name,
        initials: initialsOf(name),
        city: cityFromTimezone(m.timezone),
        offsetLabel: getMemberOffsetLabel(m.timezone as IANATimezone, scrubberUtc as UTCEpochMs),
        localLabel: formatLocalTime(scrubberUtc, m.timezone),
        dayLabel: relativeDayLabel(scrubberUtc, m.timezone, now),
        localHour,
        period,
        pc: periodColors(period, t),
        lateNight: isLateNight(scrubberUtc, m.timezone),
      };
    });
  }, [activeRoom, displayName, scrubberUtc, t, now]);

  const you = members.find((m) => m.isYou) ?? null;
  const lateNightMembers = members.filter((m) => m.lateNight);
  const activeSummary = rooms.find((r) => r.id === activeRoomId) ?? null;

  // ── Room state transitions → feedback, navigation, alarms ──
  useEffect(() => {
    const prev = prevRoom.current;
    prevRoom.current = activeRoom;
    if (!activeRoom || !prev || prev.id !== activeRoom.id) return;

    const proposal = activeRoom.proposal;
    // Key off the proposal's own transition, not the room's: in live mode the
    // room doc (→ OPEN) and the proposal doc (→ resolved_rejected) arrive on
    // separate listeners, in either order.
    const prevProposal = prev.proposal;
    const proposalEnded =
      proposal &&
      prevProposal?.id === proposal.id &&
      prevProposal.status === 'active' &&
      (proposal.status === 'resolved_rejected' || proposal.status === 'expired');
    if (proposalEnded) {
      setGhostMarkers((g) => [...g, proposal.targetTimeUtc].slice(-4));
      if (proposal.status === 'resolved_rejected') {
        haptics.warning();
        showToast('Vetoed. Pick another time.');
      } else {
        showToast('Vote expired — not everyone answered');
      }
    }

    if (prev.status !== 'LOCKED' && activeRoom.status === 'LOCKED' && proposal) {
      haptics.success();
      const palette = [colors.primary, colors.green, colors.textSecondary, colors.purple];
      setConfetti(
        Array.from({ length: 26 }, (_, i) => ({
          left: Math.random() * 100,
          delay: Math.round(Math.random() * 500),
          duration: 1600 + Math.random() * 900,
          rotate: Math.round(Math.random() * 360),
          color: palette[i % palette.length],
        })),
      );
      setTimeout(() => setConfetti([]), 3200);
      const roomId = activeRoom.id;
      const name = activeRoom.name;
      void (async () => {
        await scheduleLocalAlarm(roomId, proposal.targetTimeUtc, name).catch(() => undefined);
        const registration = await getPushRegistration();
        await backend.arm(roomId, registration).catch((err) => showToast(describeBackendError(err, 'Could not arm the alarm.')));
      })();
      router.push(RoutePaths.armed);
    }

    // Someone else disarmed while we're armed (spec line 267).
    if (activeRoom.status === 'LOCKED') {
      activeRoom.members.forEach((m) => {
        const before = prev.members.find((p) => p.id === m.id);
        if (!m.isYou && before?.alarmArmed && !m.alarmArmed) showToast(`${m.name} has disarmed`);
      });
      prev.members
        .filter((p) => !activeRoom.members.some((m) => m.id === p.id))
        .forEach((p) => showToast(`⚠ ${p.name} left the alarm`));
    }
  }, [activeRoom, backend, colors, router, showToast]);

  // ── Scrubber ──
  const flushScrubber = useCallback((utc: number) => {
    lastSentAt.current = Date.now();
    channelRef.current?.sendScrubber(utc);
  }, []);

  const setScrubber = useCallback(
    (utc: number) => {
      const clamped = Math.max(windowStart, Math.min(windowEnd, snapTo(utc, 5 * MS_PER_MINUTE)));
      setScrubberUtc(clamped);
      // Haptic tick each time we cross a 15-minute boundary.
      const tick = Math.floor(clamped / SCRUBBER_TICK_MS);
      if (draggingRef.current && tick !== lastTick.current) haptics.selection();
      lastTick.current = tick;
      // Throttle to one broadcast per 100ms with a trailing send.
      const since = Date.now() - lastSentAt.current;
      if (pendingSend.current) clearTimeout(pendingSend.current);
      if (since >= SCRUBBER_THROTTLE_MS) flushScrubber(clamped);
      else pendingSend.current = setTimeout(() => flushScrubber(clamped), SCRUBBER_THROTTLE_MS - since);
    },
    [windowStart, windowEnd, flushScrubber],
  );

  const scrubTo = useCallback(
    (fraction: number) => setScrubber(windowStart + Math.max(0, Math.min(1, fraction)) * SCRUBBER_WINDOW_MS),
    [setScrubber, windowStart],
  );

  const nudgeScrubber = useCallback((deltaMs: number) => setScrubber(scrubberUtc + deltaMs), [setScrubber, scrubberUtc]);

  const setDraggingAndRef = useCallback(
    (val: boolean) => {
      draggingRef.current = val;
      setDragging(val);
      if (!val) flushScrubber(scrubberUtc); // trailing "commit" on release (spec line 242)
    },
    [flushScrubber, scrubberUtc],
  );

  const thumbPercent = ((scrubberUtc - windowStart) / SCRUBBER_WINDOW_MS) * 100;

  // ── Voting ──
  const proposal = activeRoom?.proposal ?? null;
  const activeProposal = proposal && proposal.status === 'active' && activeRoom?.status === 'VOTING' ? proposal : null;
  const myVote = (activeProposal && you ? activeProposal.votes[you.id] : null) ?? null;
  const voteOpen = Boolean(activeProposal && activeProposal.id !== dismissedProposalId);
  const votedCount = activeProposal ? Object.keys(activeProposal.votes).length : 0;
  const remainingSec = activeProposal ? Math.max(0, Math.ceil((activeProposal.expiresAt - now) / 1000)) : 0;
  const proposedUtc = activeProposal?.targetTimeUtc ?? proposal?.targetTimeUtc ?? scrubberUtc;

  const otherCount = members.filter((m) => !m.isYou).length;
  const proposeHint =
    !activeRoom
      ? 'Connecting…'
      : otherCount < 1
        ? 'Waiting for more members…'
        : activeRoom.status === 'VOTING'
          ? 'A vote is in progress'
          : activeRoom.status === 'LOCKED'
            ? 'An alarm is already armed'
            : null;
  const proposeDisabled = busy || proposeHint !== null;

  const onPropose = useCallback(() => {
    if (proposeDisabled || !channelRef.current) return;
    setBusy(true);
    setDismissedProposalId(null);
    channelRef.current
      .propose(scrubberUtc)
      .catch((err) => showToast(describeBackendError(err, 'Could not start the vote.')))
      .finally(() => setBusy(false));
  }, [proposeDisabled, scrubberUtc, showToast]);

  const castVote = useCallback(
    (choice: VoteChoice) => {
      if (!activeRoom || !activeProposal || myVote) return;
      haptics.light();
      backend
        .vote(activeRoom.id, activeProposal.id, choice)
        .catch((err) => {
          // Someone else's No (or the timer) resolved the round first; the
          // veto/expiry toast already explains what happened.
          const code = (err as { code?: string })?.code;
          if (code === 'functions/failed-precondition' || code === 'failed-precondition') return;
          showToast(describeBackendError(err, 'Your vote did not go through.'));
        });
    },
    [activeRoom, activeProposal, myVote, backend, showToast],
  );

  // ── Armed ──
  const lockedProposal = proposal && (proposal.status === 'resolved_locked' || proposal.status === 'fired') ? proposal : null;
  const armedTarget = lockedProposal?.targetTimeUtc ?? 0;
  const remainingMs = Math.max(0, armedTarget - now);
  const countdownLabel = `Fires in ${formatCountdown(remainingMs)}`;
  const alarmFired = Boolean(lockedProposal) && remainingMs === 0;

  // ── Onboarding / rooms flows ──
  const enterApp = useCallback(() => {
    if (!displayName.trim()) return;
    useSessionStore.getState().setTimezone(timezone);
    setActiveRoomId(null);
    router.replace(RoutePaths.rooms);
  }, [displayName, timezone, router]);

  const onTapCreate = useCallback(() => {
    setRoomName('');
    setSheetStep('create');
  }, []);
  const onTapJoin = useCallback(() => {
    setJoinCode(['', '', '', '', '', '']);
    setSheetStep('join');
  }, []);
  const closeSheet = useCallback(() => setSheetStep(null), []);

  const runPending = useCallback(
    async (action: PendingAction) => {
      if (!action) return;
      setBusy(true);
      try {
        const name = displayName.trim() || 'You';
        const summary =
          action === 'create'
            ? await backend.createRoom({
                name: roomName.trim() || 'Sync Room',
                cap: capFromLabel(participantCap),
                displayName: name,
                timezone,
              })
            : await backend.joinRoom({ code: joinCode.join(''), displayName: name, timezone });
        upsertRoom(summary);
        setSheetStep(null);
        setRoomName('');
        setJoinCode(['', '', '', '', '', '']);
        setActiveRoomId(summary.id);
        router.push(RoutePaths.roomDetail(summary.id));
      } catch (err) {
        showToast(describeBackendError(err, action === 'create' ? 'Could not create the room.' : 'Could not join the room.'));
      } finally {
        setBusy(false);
        setPendingAction(null);
      }
    },
    [backend, displayName, joinCode, participantCap, roomName, router, showToast, timezone, upsertRoom],
  );

  const submit = useCallback(
    (action: Exclude<PendingAction, null>) => {
      if (busy) return;
      if (!permissionPrimed) {
        // Prime once, right before the first create/join (spec line 308).
        setPendingAction(action);
        setPermissionOpen(true);
        return;
      }
      void runPending(action);
    },
    [busy, permissionPrimed, runPending],
  );

  const onSubmitCreate = useCallback(() => {
    if (roomName.trim()) submit('create');
  }, [roomName, submit]);
  const onSubmitJoin = useCallback(() => {
    if (joinCode.every((c) => c)) submit('join');
  }, [joinCode, submit]);

  const commitPending = useCallback(
    (allow = true) => {
      setPermissionOpen(false);
      useSessionStore.getState().setPermissionPrimed();
      const action = pendingAction;
      void (async () => {
        if (allow) await requestAlarmPermission().catch(() => 'denied');
        await runPending(action);
      })();
    },
    [pendingAction, runPending],
  );

  const openRoom = useCallback(
    (id: string) => {
      setActiveRoomId(id);
      router.push(RoutePaths.roomDetail(id));
    },
    [router],
  );

  const exitToList = useCallback(() => {
    setActiveRoomId(null);
    setGhostMarkers([]);
    setDismissedProposalId(null);
  }, []);

  const leaveRoom = useCallback(
    (id: string) => {
      removeRoom(id);
      void cancelLocalAlarm(id);
      backend.leaveRoom(id).catch(() => undefined);
      if (activeRoomId === id) {
        if (router.canGoBack()) router.back();
        else router.replace(RoutePaths.rooms);
        exitToList();
      }
    },
    [activeRoomId, backend, exitToList, removeRoom, router],
  );

  const signOut = useCallback(() => {
    useSessionStore.getState().rooms.forEach((r) => void cancelLocalAlarm(r.id));
    useSessionStore.getState().reset();
    setSheetStep(null);
    setPermissionOpen(false);
    exitToList();
    void backend.signOut();
    router.replace(RoutePaths.onboarding);
  }, [backend, exitToList, router]);

  const applyPaste = useCallback((text: string) => {
    const clean = (text || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
      .split('');
    while (clean.length < 6) clean.push('');
    setJoinCode(clean);
  }, []);

  const onDisarm = useCallback(() => {
    if (!activeRoom) return;
    const roomId = activeRoom.id;
    void cancelLocalAlarm(roomId);
    backend.disarm(roomId).catch((err) => showToast(describeBackendError(err, 'Could not disarm.')));
    if (router.canGoBack()) router.back();
    else router.replace(RoutePaths.roomDetail(roomId));
    showToast('Alarm disarmed');
  }, [activeRoom, backend, router, showToast]);

  /** Ringing → "I'm up": stop this phone's alarm and go back to the room. */
  const onWakeUp = useCallback(() => {
    if (!activeRoom) return;
    const roomId = activeRoom.id;
    void cancelLocalAlarm(roomId);
    if (router.canGoBack()) router.back();
    else router.replace(RoutePaths.roomDetail(roomId));
  }, [activeRoom, router]);

  const onShare = useCallback(() => {
    const summary = activeRoom ?? activeSummary;
    if (!summary) return;
    void shareRoomInvite(summary.name, summary.code).then((outcome) => {
      if (outcome === 'copied') showToast('Invite link copied');
      else if (outcome === 'failed') showToast(`Room code: ${summary.code}`);
    });
  }, [activeRoom, activeSummary, showToast]);

  const value: AppContextType = {
    backendKind: backend.kind,
    themePreference,
    setThemePreference,
    t,
    colors,
    scheme,
    hydrated,
    displayName,
    setDisplayName,
    timezone,
    rooms,
    activeRoomId,
    setActiveRoomId,
    activeRoom,
    activeSummary,
    members,
    you,
    connected,
    busy,
    roomName,
    setRoomName,
    participantCap,
    setParticipantCap,
    joinCode,
    setJoinCode,
    codeRefs,
    sheetStep,
    permissionOpen,
    pendingAction,
    layout,
    setLayout,
    windowStart,
    windowEnd,
    scrubberUtc,
    thumbPercent,
    dragging,
    setDragging: setDraggingAndRef,
    scrubTo,
    nudgeScrubber,
    lateNightMembers,
    ghostMarkers,
    proposal,
    voteOpen,
    proposedUtc,
    myVote,
    votedCount,
    remainingSec,
    proposeDisabled,
    proposeHint,
    armedTarget,
    remainingMs,
    countdownLabel,
    confetti,
    alarmFired,
    toast,
    showToast,
    now,
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
    onPropose,
    onVoteYes: () => castVote('yes'),
    onVoteNo: () => castVote('no'),
    onCounter: () => castVote('no'),
    onDisarm,
    onWakeUp,
    onShare,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
