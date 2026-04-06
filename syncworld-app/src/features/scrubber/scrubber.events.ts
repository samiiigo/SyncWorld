// ──────────────────────────────────────────────
// scrubber.events.ts — Scrubber domain events (re-export subset)
// SRP: surfaces only scrubber-relevant events
// ──────────────────────────────────────────────

export type { ScrubberEvent } from '@types/events';

export const SCRUBBER_EVENT_KINDS = [
  'SCRUBBER_POSITION_UPDATED',
  'SCRUBBER_CONFLICT_DETECTED',
  'SCRUBBER_PROPOSAL_SUBMITTED',
] as const;
