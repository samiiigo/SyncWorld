// ──────────────────────────────────────────────
// rooms.fsm.ts — Room finite state machine guard
// SRP: validates FSM transitions — no side effects
// OCP: new transitions added to ROOM_TRANSITIONS constant
// ──────────────────────────────────────────────

import type { RoomStatus } from '@app-types/room';
import type { Result } from '@app-types/common';
import { ROOM_TRANSITIONS } from '@constants/room.constants';

/**
 * Checks whether a transition from `currentStatus` to `targetStatus`
 * is valid according to the FSM transition table.
 *
 * Returns the matching trigger name on success, or an error message
 * describing why the transition is illegal.
 */
export function validateTransition(
  currentStatus: RoomStatus,
  targetStatus: RoomStatus,
): Result<string> {
  const match = ROOM_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === targetStatus,
  );

  if (match) {
    return { ok: true, value: match.trigger };
  }

  return {
    ok: false,
    error: `Invalid room transition: ${currentStatus} -> ${targetStatus}`,
  };
}

/**
 * Returns all statuses reachable from the given status.
 */
export function getReachableStatuses(currentStatus: RoomStatus): RoomStatus[] {
  return ROOM_TRANSITIONS
    .filter((t) => t.from === currentStatus)
    .map((t) => t.to);
}

/**
 * Returns true if the room is in a terminal state (no outgoing transitions).
 */
export function isTerminalStatus(status: RoomStatus): boolean {
  return getReachableStatuses(status).length === 0;
}
