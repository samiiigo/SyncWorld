// ──────────────────────────────────────────────
// scrubber.slice.ts — Scrubber synchronization state
// SRP: scrubber position, drag state, and conflict tracking only
// ──────────────────────────────────────────────

import type { RoomId } from '@app-types/common';
import type { ScrubberLocalState, ScrubberPosition, ScrubberBounds } from '@app-types/scrubber';

// ── State Shape ──

export type ScrubberState = {
  localState: ScrubberLocalState | null;
  bounds: ScrubberBounds | null;
  isConnected: boolean;
  error: string | null;
};

// ── Actions ──

export type ScrubberActions = {
  initScrubber: (roomId: RoomId, bounds: ScrubberBounds) => void;
  updateLocalPosition: (position: ScrubberPosition) => void;
  applyRemotePosition: (position: ScrubberPosition) => void;
  setDragging: (isDragging: boolean) => void;
  confirmProposal: () => void;
  resetScrubber: () => void;
};

// ── Initial State ──

export const SCRUBBER_INITIAL_STATE: ScrubberState = {
  localState: null,
  bounds: null,
  isConnected: false,
  error: null,
};

// TODO: export const useScrubberStore = create<ScrubberState & ScrubberActions>((set, get) => ({
//   ...SCRUBBER_INITIAL_STATE,
//   initScrubber: (_roomId, _bounds) => { /* TODO */ },
//   updateLocalPosition: (_position) => { /* TODO */ },
//   applyRemotePosition: (_position) => { /* TODO */ },
//   setDragging: (_isDragging) => { /* TODO */ },
//   confirmProposal: () => { /* TODO */ },
//   resetScrubber: () => { /* TODO */ },
// }));
