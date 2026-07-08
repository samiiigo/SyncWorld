// ──────────────────────────────────────────────
// rooms.events.ts — Room domain events (re-export subset)
// SRP: surfaces only room-relevant events for local use
// ──────────────────────────────────────────────

export type { RoomEvent, PresenceEvent } from '@app-types/events';

export const ROOM_EVENT_KINDS = [
  'ROOM_CREATED',
  'ROOM_JOINED',
  'ROOM_LEFT',
  'ROOM_STATUS_CHANGED',
  'ROOM_CLOSED',
] as const;

export const PRESENCE_EVENT_KINDS = [
  'MEMBER_PRESENCE_CHANGED',
  'QUORUM_STATUS_CHANGED',
] as const;
