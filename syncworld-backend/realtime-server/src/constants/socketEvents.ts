export const SOCKET_EVENTS = {
  SCRUBBER_UPDATE: 'scrubber:update',
  SCRUBBER_PROPOSAL: 'scrubber:proposal',
  PRESENCE_HEARTBEAT: 'presence:heartbeat',
  PRESENCE_CHANGED: 'presence:changed',
  MEMBER_JOINED: 'room:member_joined',
  MEMBER_LEFT: 'room:member_left',
  ROOM_STATUS_CHANGED: 'room:status_changed',
} as const;
