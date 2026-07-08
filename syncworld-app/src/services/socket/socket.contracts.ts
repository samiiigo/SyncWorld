// ──────────────────────────────────────────────
// socket.contracts.ts — Socket.io port definition
// SRP: transport contract only — no implementation
// DIP: features depend on SocketPort, not on socket.io-client
// ISP: focused on emit/subscribe lifecycle
// ──────────────────────────────────────────────

import type { RoomId, Unsubscribe } from '@app-types/common';
import type { SocketEventName, SocketPayloadMap } from './socket.events';

export type SocketConnectionOptions = {
  roomId: RoomId;
  authToken: string;
  serverUrl: string;
};

export type SocketPort = {
  connect: (options: SocketConnectionOptions) => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;

  emit: <E extends SocketEventName>(
    event: E,
    payload: SocketPayloadMap[E],
  ) => void;

  on: <E extends SocketEventName>(
    event: E,
    handler: (payload: SocketPayloadMap[E]) => void,
  ) => Unsubscribe;

  onReconnect: (handler: () => void) => Unsubscribe;
  onDisconnect: (handler: (reason: string) => void) => Unsubscribe;
};
