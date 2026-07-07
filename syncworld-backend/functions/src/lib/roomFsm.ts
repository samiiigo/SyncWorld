export type RoomStatus = 'OPEN' | 'PROPOSING' | 'VOTING' | 'LOCKED' | 'FIRED';

export type RoomStatusTransition = {
  from: RoomStatus;
  to: RoomStatus;
  trigger: string;
};

// Keep this table aligned with syncworld-app/src/constants/room.constants.ts.
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

export function isValidTransition(currentStatus: RoomStatus, targetStatus: RoomStatus): boolean {
  return ROOM_TRANSITIONS.some((transition) => transition.from === currentStatus && transition.to === targetStatus);
}

export function getTransitionTrigger(currentStatus: RoomStatus, targetStatus: RoomStatus): string | null {
  const transition = ROOM_TRANSITIONS.find((entry) => entry.from === currentStatus && entry.to === targetStatus);
  return transition ? transition.trigger : null;
}
