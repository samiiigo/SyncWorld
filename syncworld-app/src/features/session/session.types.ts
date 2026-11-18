// ──────────────────────────────────────────────
// session.types.ts — the contract between screens and whichever backend runs.
//
// Two implementations satisfy SyncBackend:
// - live: Firebase callables + Firestore listeners + Socket.io realtime server
// - demo: in-memory simulation (no network), for UI work and demos
// Screens never import a backend directly; AppContext picks one at startup.
// ──────────────────────────────────────────────

export type RoomStatus = 'OPEN' | 'PROPOSING' | 'VOTING' | 'LOCKED' | 'FIRED';
export type MemberStatus = 'online' | 'idle' | 'disconnected';
export type VoteChoice = 'yes' | 'no';
export type ProposalStatus = 'active' | 'resolved_locked' | 'resolved_rejected' | 'expired' | 'fired';

export type SessionMember = {
  id: string;
  name: string;
  /** IANA zone id, e.g. "Asia/Tokyo" — never a raw offset (spec Time Model). */
  timezone: string;
  status: MemberStatus;
  isYou: boolean;
  isHost: boolean;
  /** Device has registered for the alarm push (Armed screen grid). */
  alarmArmed: boolean;
  /** The member's device refused alarm/notification permission. */
  alarmBlocked: boolean;
  /** When they tapped "I'm up" (ms). Demo mode may set a time just after the alarm; treat as up once it has passed. */
  wokeAt: number | null;
};

export type SessionProposal = {
  id: string;
  targetTimeUtc: number;
  createdBy: string;
  expiresAt: number;
  status: ProposalStatus;
  votes: Record<string, VoteChoice>;
};

export type SessionRoom = {
  id: string;
  name: string;
  code: string;
  cap: number | null;
  status: RoomStatus;
  hostId: string | null;
  members: SessionMember[];
  /** Most recent proposal (active, or the last resolved one). */
  proposal: SessionProposal | null;
};

/** What the rooms list remembers between launches. */
export type RoomSummary = {
  id: string;
  name: string;
  code: string;
};

export type Unsubscribe = () => void;

export type RealtimeHandlers = {
  /** Another member moved the scrubber. */
  onScrubber: (targetTimeUtc: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (message: string) => void;
};

export type RealtimeChannel = {
  sendScrubber: (targetTimeUtc: number) => void;
  /** Starts a vote on `targetTimeUtc` (OPEN → PROPOSING → VOTING). */
  propose: (targetTimeUtc: number) => Promise<void>;
  close: () => void;
};

export type PushRegistration = {
  token: string;
  kind: 'expo' | 'fcm';
  platform: 'ios' | 'android' | 'web';
};

export type CreateRoomInput = {
  name: string;
  cap: number | null;
  displayName: string;
  timezone: string;
};

export type JoinRoomInput = {
  code: string;
  displayName: string;
  timezone: string;
};

export interface SyncBackend {
  readonly kind: 'demo' | 'live';
  /** Ensures an (anonymous) session; returns the user id. */
  signIn(): Promise<string>;
  signOut(): Promise<void>;
  createRoom(input: CreateRoomInput): Promise<RoomSummary>;
  joinRoom(input: JoinRoomInput): Promise<RoomSummary>;
  leaveRoom(roomId: string): Promise<void>;
  /** Live room state; `null` once the room no longer exists or access is lost. */
  watchRoom(roomId: string, onChange: (room: SessionRoom | null) => void, onError?: (message: string) => void): Unsubscribe;
  connectRealtime(roomId: string, handlers: RealtimeHandlers): RealtimeChannel;
  /** `counterUtcMs` with a "no": suggest that time instead; it becomes the next vote. */
  vote(roomId: string, proposalId: string, choice: VoteChoice, counterUtcMs?: number): Promise<void>;
  /** Report this device's alarm permission or "I'm up" to the room. */
  setMemberStatus(roomId: string, status: { alarmBlocked?: boolean; wokeUp?: true }): Promise<void>;
  /** Registers this device for the alarm push (null = no push available, still mark armed locally). */
  arm(roomId: string, registration: PushRegistration | null): Promise<void>;
  disarm(roomId: string): Promise<void>;
}

/** User-facing message for any backend failure. */
export function describeBackendError(err: unknown, fallback: string): string {
  const e = err as { code?: string; message?: string } | undefined;
  switch (e?.code) {
    case 'functions/not-found':
    case 'not-found':
      return 'That room code doesn’t exist.';
    case 'functions/failed-precondition':
    case 'failed-precondition':
      return e.message || fallback;
    case 'functions/resource-exhausted':
      return 'Too many attempts — try again in a little while.';
    case 'functions/unavailable':
    case 'unavailable':
      return 'Can’t reach SyncWorld. Check your connection.';
    case 'functions/already-exists':
      return 'You already voted on this proposal.';
    default:
      return e?.message && e.message.length < 120 ? e.message : fallback;
  }
}
