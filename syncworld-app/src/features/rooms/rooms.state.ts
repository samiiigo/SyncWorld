// ──────────────────────────────────────────────
// rooms.state.ts — Room state shape reference
// SRP: documents the canonical room state shape
// ──────────────────────────────────────────────

export type { RoomsState, RoomsActions, ROOMS_INITIAL_STATE } from '@store/rooms.slice';

/**
 * State Design Notes:
 *
 * - `activeRoomId` is set on join/create and cleared on leave.
 *   All room-scoped features check this before operating.
 *
 * - `lobby` is a denormalized snapshot updated in real-time via
 *   Firestore listener + Socket.io presence events. It includes
 *   member list, online count, and quorum status.
 *
 * - `rooms` is a cache keyed by roomId. Stale entries are evicted
 *   when the user leaves a room or on TTL expiry.
 *
 * - FSM status lives on the Room entity. The store action
 *   `handleStatusTransition` validates the transition before
 *   applying it (uses ROOM_TRANSITIONS from constants).
 */
