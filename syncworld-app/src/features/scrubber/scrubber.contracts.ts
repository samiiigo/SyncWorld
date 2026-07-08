// ──────────────────────────────────────────────
// scrubber.contracts.ts — Scrubber feature service contracts
// SRP: scrubber operation signatures only
// DIP: depends on SocketPort and FirestorePort abstractions
// ──────────────────────────────────────────────

import type { RoomId, UserId, UTCEpochMs, AsyncResult, Unsubscribe } from '@app-types/common';
import type { ScrubberPosition, ScrubberBounds, ScrubberSyncFrame } from '@app-types/scrubber';

export type ScrubberService = {
  initScrubber: (roomId: RoomId) => AsyncResult<ScrubberBounds>;
  startSync: (roomId: RoomId) => Unsubscribe;
  emitPosition: (roomId: RoomId, position: ScrubberPosition) => void;
  getLatestPosition: (roomId: RoomId) => AsyncResult<ScrubberPosition | null>;
  submitProposal: (roomId: RoomId, position: ScrubberPosition) => AsyncResult<void>;
};

export type ScrubberConflictResolver = {
  resolve: (local: ScrubberPosition, remote: ScrubberPosition) => ScrubberPosition;
  shouldAcceptRemote: (localSeq: number, remoteSeq: number, isDragging: boolean) => boolean;
};

export type ScrubberDebouncer = {
  debounce: (frame: ScrubberSyncFrame) => void;
  flush: () => void;
  cancel: () => void;
};

export type CreateScrubberService = (deps: {
  socketPort: unknown;
  firestorePort: unknown;
}) => ScrubberService;
