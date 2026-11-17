// ──────────────────────────────────────────────
// demo.backend.ts — in-memory SyncBackend. No network, no Firebase.
//
// Simulates other members (real IANA zones), presence, votes and arming with
// the same rules the real backend enforces:
// - proposing needs at least 2 members
// - consensus is unanimous; any single "no" vetoes (spec line 260)
// - proposals expire after 90s (spec default timer)
// ──────────────────────────────────────────────

import type {
  CreateRoomInput,
  JoinRoomInput,
  PushRegistration,
  RealtimeChannel,
  RealtimeHandlers,
  RoomSummary,
  SessionMember,
  SessionProposal,
  SessionRoom,
  SyncBackend,
  Unsubscribe,
  VoteChoice,
} from '../session.types';

export const DEMO_VOTE_WINDOW_MS = 90_000;
const YES_PROBABILITY = 0.9;

type SimMember = Omit<SessionMember, 'isYou'>;

const SIMULATED_MEMBERS: SimMember[] = [
  { id: 'sim-priya', name: 'Priya Sharma', timezone: 'Europe/London', status: 'online', isHost: false, alarmArmed: false, alarmBlocked: false, wokeAt: null },
  { id: 'sim-kenji', name: 'Kenji Sato', timezone: 'Asia/Tokyo', status: 'idle', isHost: false, alarmArmed: false, alarmBlocked: false, wokeAt: null },
  { id: 'sim-elena', name: 'Elena Kovač', timezone: 'Europe/Berlin', status: 'online', isHost: false, alarmArmed: false, alarmBlocked: false, wokeAt: null },
  { id: 'sim-marcus', name: 'Marcus Reid', timezone: 'Australia/Sydney', status: 'disconnected', isHost: false, alarmArmed: false, alarmBlocked: true, wokeAt: null },
  { id: 'sim-aiko', name: 'Aiko Tanaka', timezone: 'Asia/Dubai', status: 'online', isHost: false, alarmArmed: false, alarmBlocked: false, wokeAt: null },
];

type Options = {
  /** Injected for tests; defaults to Math.random. */
  random?: () => number;
  /** Delay multiplier for simulated activity (0 in tests = immediate). */
  speed?: number;
};

type StoredRoom = Omit<SessionRoom, 'members'> & { members: SimMember[]; you: SessionMember | null };

function makeCode(random: () => number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
}

export function createDemoBackend(options: Options = {}): SyncBackend {
  const random = options.random ?? Math.random;
  const speed = options.speed ?? 1;
  const uid = 'demo-you';
  const rooms = new Map<string, StoredRoom>();
  const watchers = new Map<string, Set<(room: SessionRoom | null) => void>>();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms * speed);
    timers.add(t);
  };

  const snapshot = (room: StoredRoom): SessionRoom => ({
    id: room.id,
    name: room.name,
    code: room.code,
    cap: room.cap,
    status: room.status,
    hostId: room.hostId,
    proposal: room.proposal ? { ...room.proposal, votes: { ...room.proposal.votes } } : null,
    members: [
      ...(room.you ? [room.you] : []),
      ...room.members.map((m) => ({ ...m, isYou: false })),
    ],
  });

  const emit = (roomId: string) => {
    const room = rooms.get(roomId);
    watchers.get(roomId)?.forEach((cb) => cb(room ? snapshot(room) : null));
  };

  const memberCount = (room: StoredRoom) => room.members.length + (room.you ? 1 : 0);

  const resolveIfDone = (room: StoredRoom) => {
    const proposal = room.proposal;
    if (!proposal || proposal.status !== 'active') return;
    const votes = Object.values(proposal.votes);
    if (votes.includes('no')) {
      proposal.status = 'resolved_rejected';
      room.status = 'OPEN';
    } else if (votes.length >= memberCount(room)) {
      proposal.status = 'resolved_locked';
      room.status = 'LOCKED';
      // Other members' devices arm over the next few seconds; disconnected ones lag.
      room.members.forEach((m) => {
        // A phone that refused alarms never arms (and so never rings).
        if (m.alarmBlocked) return;
        // Wake 5–40 s after the alarm; the ringing screen counts it once that moment has passed.
        m.wokeAt = proposal.targetTimeUtc + 5000 + random() * 35000;
        const delay = m.status === 'disconnected' ? 7000 + random() * 4000 : 800 + random() * 3200;
        later(delay, () => {
          if (room.status !== 'LOCKED') return;
          m.alarmArmed = true;
          emit(room.id);
        });
      });
    }
  };

  const startVote = (room: StoredRoom, targetTimeUtc: number) => {
    if (memberCount(room) < 2) throw new Error('At least two members are required to propose a time.');
    if (room.status !== 'OPEN') throw new Error('A vote is already in progress.');
    const proposal: SessionProposal = {
      id: `p-${Date.now().toString(36)}`,
      targetTimeUtc,
      createdBy: uid,
      expiresAt: Date.now() + DEMO_VOTE_WINDOW_MS * Math.max(speed, 0.0001),
      status: 'active',
      votes: {},
    };
    room.proposal = proposal;
    room.status = 'VOTING';
    room.members.forEach((m) => {
      m.alarmArmed = false;
      m.wokeAt = null;
    });
    if (room.you) {
      room.you.alarmArmed = false;
      room.you.wokeAt = null;
    }

    room.members.forEach((m) => {
      // Disconnected members reconnect and answer late (prototype behaviour),
      // so demo rooms can still reach a unanimous lock.
      const delay = m.status === 'disconnected' ? 8000 + random() * 4000 : 1500 + random() * 9000;
      later(delay, () => {
        if (room.proposal !== proposal || proposal.status !== 'active') return;
        m.status = 'online';
        proposal.votes[m.id] = random() < YES_PROBABILITY ? 'yes' : 'no';
        resolveIfDone(room);
        emit(room.id);
      });
    });
    // If you never answer, the proposal expires like on the real backend.
    later(DEMO_VOTE_WINDOW_MS, () => {
      if (room.proposal !== proposal || proposal.status !== 'active') return;
      proposal.status = 'expired';
      room.status = 'OPEN';
      emit(room.id);
    });
    emit(room.id);
  };

  const addRoom = (name: string, cap: number | null, code: string, you: SessionMember, simulated: SimMember[]): RoomSummary => {
    const id = `demo-${code.toLowerCase()}`;
    rooms.set(id, {
      id,
      name,
      code,
      cap,
      status: 'OPEN',
      hostId: you.isHost ? uid : simulated[0]?.id ?? uid,
      proposal: null,
      you,
      members: simulated.map((m) => ({ ...m })),
    });
    return { id, name, code };
  };

  const youMember = (displayName: string, timezone: string, isHost: boolean): SessionMember => ({
    id: uid,
    name: displayName,
    timezone,
    status: 'online',
    isYou: true,
    isHost,
    alarmArmed: false,
    alarmBlocked: false,
    wokeAt: null,
  });

  /** Rooms created in demo mode fill up with simulated members a moment later. */
  const populate = (roomId: string) => {
    SIMULATED_MEMBERS.forEach((m, i) => {
      later(600 + i * 450, () => {
        const room = rooms.get(roomId);
        if (!room || room.members.some((x) => x.id === m.id)) return;
        if (room.cap !== null && memberCount(room) >= room.cap) return;
        room.members.push({ ...m });
        emit(roomId);
      });
    });
  };

  const ensureRoom = (roomId: string): StoredRoom => {
    const room = rooms.get(roomId);
    if (!room) throw Object.assign(new Error('Room not found.'), { code: 'not-found' });
    return room;
  };

  return {
    kind: 'demo',

    async signIn() {
      return uid;
    },

    async signOut() {
      timers.forEach(clearTimeout);
      timers.clear();
      rooms.clear();
    },

    async createRoom(input: CreateRoomInput) {
      const summary = addRoom(input.name, input.cap, makeCode(random), youMember(input.displayName, input.timezone, true), []);
      populate(summary.id);
      return summary;
    },

    async joinRoom(input: JoinRoomInput) {
      const code = input.code.toUpperCase();
      const existing = [...rooms.values()].find((r) => r.code === code);
      if (existing) {
        existing.you = existing.you ?? youMember(input.displayName, input.timezone, false);
        emit(existing.id);
        return { id: existing.id, name: existing.name, code };
      }
      // Any code "works" in demo mode: you join a room that already has people in it.
      const hostSeed = { ...SIMULATED_MEMBERS[0], isHost: true };
      return addRoom(`Room ${code}`, 8, code, youMember(input.displayName, input.timezone, false), [
        hostSeed,
        ...SIMULATED_MEMBERS.slice(1, 4),
      ]);
    },

    async leaveRoom(roomId: string) {
      rooms.delete(roomId);
      emit(roomId);
    },

    watchRoom(roomId, onChange, onError): Unsubscribe {
      let set = watchers.get(roomId);
      if (!set) {
        set = new Set();
        watchers.set(roomId, set);
      }
      set.add(onChange);
      const room = rooms.get(roomId);
      if (room) {
        onChange(snapshot(room));
      } else {
        onChange(null);
        onError?.('This room is no longer available in demo mode.');
      }
      return () => {
        set?.delete(onChange);
      };
    },

    connectRealtime(roomId: string, handlers: RealtimeHandlers): RealtimeChannel {
      handlers.onConnectionChange?.(true);
      return {
        sendScrubber: () => {
          // Nobody else is really here to see it.
        },
        propose: async (targetTimeUtc: number) => {
          startVote(ensureRoom(roomId), targetTimeUtc);
        },
        close: () => handlers.onConnectionChange?.(false),
      };
    },

    async vote(roomId: string, proposalId: string, choice: VoteChoice) {
      const room = ensureRoom(roomId);
      if (!room.proposal || room.proposal.id !== proposalId || room.proposal.status !== 'active') {
        throw Object.assign(new Error('This proposal is no longer active.'), { code: 'failed-precondition' });
      }
      if (room.proposal.votes[uid]) {
        throw Object.assign(new Error('You already voted on this proposal.'), { code: 'functions/already-exists' });
      }
      room.proposal.votes[uid] = choice;
      resolveIfDone(room);
      emit(roomId);
    },

    async arm(roomId: string, _registration: PushRegistration | null) {
      const room = ensureRoom(roomId);
      if (room.you) room.you.alarmArmed = true;
      emit(roomId);
    },

    async disarm(roomId: string) {
      const room = ensureRoom(roomId);
      if (room.you) room.you.alarmArmed = false;
      emit(roomId);
    },
  };
}
