// ──────────────────────────────────────────────
// time.dst-edge-cases.ts — DST edge case catalog
// SRP: documents known DST pitfalls and planned mitigations
//
// This file serves as a planning artifact. Each case should
// have a corresponding test once time.conversions is implemented.
// ──────────────────────────────────────────────

/**
 * CASE 1: Spring-Forward Gap
 *
 * Scenario: US Eastern, second Sunday in March at 2:00 AM.
 * Clocks jump from 1:59 AM → 3:00 AM. The range 2:00–2:59 never exists.
 *
 * Impact: A member in ET sets the scrubber to 2:30 AM local. That local
 * time has no valid UTC mapping.
 *
 * Mitigation: checkDSTSafety detects the gap and suggests 3:00 AM ET
 * (the next valid time). The UI should show a warning and offer the
 * adjusted time.
 */

/**
 * CASE 2: Fall-Back Overlap
 *
 * Scenario: US Eastern, first Sunday in November at 2:00 AM.
 * Clocks fall from 1:59 AM → 1:00 AM. The range 1:00–1:59 occurs twice.
 *
 * Impact: A member sees "1:30 AM" but it could be EDT (UTC-4) or EST (UTC-5).
 * Two different UTC values map to the same wall-clock time.
 *
 * Mitigation: localToUtc picks the earlier offset by default. The UI
 * should annotate the ambiguity when the alarm falls in this window.
 */

/**
 * CASE 3: Cross-DST Scheduling
 *
 * Scenario: Alarm is created at 10 PM Saturday in US Eastern (EDT, UTC-4).
 * DST ends overnight. At fire time, the offset is EST (UTC-5).
 *
 * Impact: If the system stored local time, the alarm would fire 1 hour late.
 *
 * Mitigation: UTC epoch ms is the source of truth. The alarm fires at the
 * correct absolute instant regardless of offset changes. The local display
 * will show the updated wall-clock time.
 */

/**
 * CASE 4: Multi-Region DST Divergence
 *
 * Scenario: US transitions on the second Sunday of March; EU transitions
 * on the last Sunday of March. For ~2 weeks the UTC offsets between
 * US and EU zones differ from their usual relationship.
 *
 * Impact: Countdown displays will be correct (UTC-based), but members
 * may be surprised that relative time-of-day differs from expectations.
 *
 * Mitigation: Show explicit UTC offset labels next to each member's
 * local time in the lobby. getMemberOffsetLabel surfaces this.
 */

/**
 * CASE 5: Zones Without DST
 *
 * Scenario: UTC, Asia/Kolkata (IST), Asia/Shanghai (CST) never observe DST.
 *
 * Impact: No special handling needed, but checkDSTSafety must not false-positive.
 *
 * Mitigation: checkDSTSafety returns { isAmbiguous: false, isSkipped: false }
 * for non-DST zones.
 */

export {}; // ensure this file is treated as a module
