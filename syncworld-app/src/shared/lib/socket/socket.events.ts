// ──────────────────────────────────────────────
// socket.events.ts — Wire event names and payload type map
// SRP: event name constants and payload shapes only
// OCP: new events are appended without modifying existing entries
// ──────────────────────────────────────────────

import type { RoomId, UserId, UTCEpochMs } from '@domain/common';
import type { ScrubberPosition } from '@domain/scrubber';
import type { PresenceStatus } from '@domain/member';

// ── Event Names ──

export const SOCKET_EVENTS = {
  SCRUBBER_UPDATE: 'scrubber:update',
  SCRUBBER_PROPOSAL: 'scrubber:proposal',
  PRESENCE_HEARTBEAT: 'presence:heartbeat',
  PRESENCE_CHANGED: 'presence:changed',
  MEMBER_JOINED: 'room:member_joined',
  MEMBER_LEFT: 'room:member_left',
  ROOM_STATUS_CHANGED: 'room:status_changed',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ── Payload Map — maps each event name to its typed payload ──

export type SocketPayloadMap = {
  [SOCKET_EVENTS.SCRUBBER_UPDATE]: {
    roomId: RoomId;
    position: ScrubberPosition;
  };
  [SOCKET_EVENTS.SCRUBBER_PROPOSAL]: {
    roomId: RoomId;
    position: ScrubberPosition;
    proposedBy: UserId;
  };
  [SOCKET_EVENTS.PRESENCE_HEARTBEAT]: {
    roomId: RoomId;
    userId: UserId;
    timestamp: UTCEpochMs;
  };
  [SOCKET_EVENTS.PRESENCE_CHANGED]: {
    roomId: RoomId;
    userId: UserId;
    status: PresenceStatus;
  };
  [SOCKET_EVENTS.MEMBER_JOINED]: {
    roomId: RoomId;
    userId: UserId;
    displayName: string;
  };
  [SOCKET_EVENTS.MEMBER_LEFT]: {
    roomId: RoomId;
    userId: UserId;
  };
  [SOCKET_EVENTS.ROOM_STATUS_CHANGED]: {
    roomId: RoomId;
    from: string;
    to: string;
    timestamp: UTCEpochMs;
  };
};
