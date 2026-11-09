// ──────────────────────────────────────────────
// store.root.ts — Root store composition
// SRP: wires slices together — no state or logic of its own
// OCP: new slices are added here without modifying existing ones
// ──────────────────────────────────────────────

// TODO: import { create } from 'zustand';
// TODO: import each slice creator
// TODO: compose slices using Zustand's slice pattern or separate stores

/**
 * Root store assembly point.
 *
 * Design decision: use separate Zustand stores per domain rather than
 * a single monolith. This preserves SRP and allows independent
 * subscription scoping (a component subscribing to scrubber state
 * doesn't re-render on identity changes).
 *
 * Each slice file exports its own `useXxxStore` hook.
 * This file re-exports them for convenience.
 */

// Re-exports of the feature-colocated slice hooks under src/features/*/state/.
// Profile + joined rooms (persisted). Live room state streams through AppContext.
export { useSessionStore } from '@/features/session/session.store';
// export { useScrubberStore } from '@/features/scrubber/state/scrubber.slice';
// export { useVotingStore } from '@/features/voting/state/voting.slice';
// export { useAlarmStore } from '@/features/alarms/state/alarms.slice';

