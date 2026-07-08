// ──────────────────────────────────────────────
// room.constants.ts — Room domain constants
// SRP: room-scoped magic numbers and enumerations only
// ──────────────────────────────────────────────

import type { RoomStatus, RoomStatusTransition } from '@domain/room';

export const ROOM_STATUSES: readonly RoomStatus[] = [
  'OPEN',
  'PROPOSING',
  'VOTING',
  'LOCKED',
  'FIRED',
] as const;

/**
 * Allowed FSM transitions — the rooms.fsm module uses this
 * table to guard illegal state changes.
 */
export const ROOM_TRANSITIONS: readonly RoomStatusTransition[] = [
  { from: 'OPEN', to: 'PROPOSING', trigger: 'scrubber_confirmed' },
  { from: 'PROPOSING', to: 'VOTING', trigger: 'proposal_created' },
  { from: 'VOTING', to: 'LOCKED', trigger: 'consensus_reached' },
  { from: 'VOTING', to: 'OPEN', trigger: 'proposal_rejected' },
  { from: 'VOTING', to: 'OPEN', trigger: 'proposal_expired' },
  { from: 'VOTING', to: 'OPEN', trigger: 'quorum_lost' },
  { from: 'LOCKED', to: 'FIRED', trigger: 'alarm_fired' },
  { from: 'LOCKED', to: 'OPEN', trigger: 'alarm_cancelled' },
] as const;

export const ROOM_DEFAULTS = {
  MIN_MEMBERS: 2,
  MAX_MEMBERS: 50,
  CODE_LENGTH: 6,
  NAME_MAX_LENGTH: 64,
} as const;
