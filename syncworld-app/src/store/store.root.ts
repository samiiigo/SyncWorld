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

// TODO: re-export all slice hooks
// export { useIdentityStore } from './identity.slice';
// export { useRoomsStore } from './rooms.slice';
// export { useScrubberStore } from './scrubber.slice';
// export { useVotingStore } from './voting.slice';
// export { useAlarmStore } from './alarm.slice';

export {}; // module placeholder
