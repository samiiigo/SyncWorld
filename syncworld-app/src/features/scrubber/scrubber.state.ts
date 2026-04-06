// ──────────────────────────────────────────────
// scrubber.state.ts — Scrubber state shape reference
// SRP: documents the canonical scrubber state shape
// ──────────────────────────────────────────────

export type { ScrubberState, ScrubberActions, SCRUBBER_INITIAL_STATE } from '@store/scrubber.slice';

/**
 * State Design Notes:
 *
 * - `localState.sequenceNumber` is a monotonically increasing
 *   counter used for last-writer-wins conflict resolution.
 *   The server does not arbitrate — clients compare seq numbers.
 *
 * - `isDragging` suppresses remote updates to avoid jitter while
 *   the local user is actively manipulating the scrubber.
 *
 * - `conflictDetected` is set when a remote position arrives with
 *   a seq number that doesn't match expectations. The UI should
 *   surface this to the user (e.g., brief highlight).
 *
 * - `bounds` defines the scrubber's allowed UTC range and step
 *   size. Computed on scrubber init based on room creation time
 *   and alarm constants.
 */
