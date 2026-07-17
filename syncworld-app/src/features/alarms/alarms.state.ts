// ──────────────────────────────────────────────
// alarm.state.ts — Alarm state shape reference
// SRP: documents the canonical alarm state shape
// ──────────────────────────────────────────────

export type { AlarmState, AlarmActions } from './state/alarms.slice';
export { ALARM_INITIAL_STATE } from './state/alarms.slice';

/**
 * State Design Notes:
 *
 * - `alarm` holds the canonical Alarm entity from Firestore.
 *   Updated via real-time listener.
 *
 * - `localView` is derived from alarm + member's IANATimezone.
 *   Recomputed whenever alarm changes or timezone updates.
 *   Contains pre-formatted display strings (time, date, day)
 *   so the UI layer doesn't perform any time math.
 *
 * - `nativeHandle` tracks the platform-specific alarm ID so it
 *   can be cancelled. Each device maintains its own handle.
 *
 * - `countdownMs` is updated every COUNTDOWN_TICK_MS by the
 *   countdown service. Derived from alarm.targetTimeUtc - now().
 *
 * - `isTicking` is true between arm and fire. The countdown
 *   interval is started on arm and cleared on fire/cancel.
 */
