// ──────────────────────────────────────────────
// scrubber.ts — Scrubber synchronization types
// SRP: scrubber position, sync frames, and pipeline metadata only
// ──────────────────────────────────────────────

import type { UserId, RoomId, UTCEpochMs } from './common';

/**
 * The scrubber value is always a UTCEpochMs representing the
 * proposed alarm time. Each member's local rendering converts
 * this to their timezone for display.
 */
export type ScrubberPosition = {
  valueUtc: UTCEpochMs;
  updatedBy: UserId;
  updatedAt: UTCEpochMs;
  sequenceNumber: number;
};

/** Wire frame sent over Socket.io for real-time scrubber sync */
export type ScrubberSyncFrame = {
  roomId: RoomId;
  position: ScrubberPosition;
  isProposal: boolean;
};

/** Debounced scrubber state held locally between sync frames */
export type ScrubberLocalState = {
  roomId: RoomId;
  currentPosition: ScrubberPosition | null;
  isDragging: boolean;
  lastReceivedSeq: number;
  lastEmittedSeq: number;
  conflictDetected: boolean;
};

export type ScrubberBounds = {
  minUtc: UTCEpochMs;
  maxUtc: UTCEpochMs;
  stepMs: number;
};
