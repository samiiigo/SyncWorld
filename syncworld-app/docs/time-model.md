# Time Model

## Core Principle

**UTC epoch milliseconds are the single source of truth.** Every timestamp stored in Firestore, transmitted over Socket.io, or used in business logic is a UTC epoch ms value. No local times are ever stored or transmitted.

## Data Flow

```
Member A (New York, ET)          Server (UTC)          Member B (Tokyo, JST)
───────────────────              ──────────              ─────────────────────
Sees "7:00 PM ET"                                       Sees "8:00 AM JST"
        │                                                       ▲
        ▼                                                       │
Convert to UTC ──→ 1714600000000 (UTCEpochMs) ──→ Convert to local
        │                    │                          │
  Luxon + IANA tz      Stored as-is              Luxon + IANA tz
                       in Firestore
```

## Storage Format

| Data | Stored As | Where |
|------|-----------|-------|
| Scrubber position | `UTCEpochMs` | Firestore + Socket.io |
| Proposal time | `UTCEpochMs` | Firestore |
| Alarm target | `UTCEpochMs` | Firestore |
| Member timezone | `IANATimezone` (string) | Firestore |
| Timestamps | `UTCEpochMs` | Firestore |

## Type Safety

`UTCEpochMs` and `IANATimezone` are branded types (see `src/types/common.ts`). This prevents:
- Passing a raw `number` where a UTC timestamp is expected
- Passing an arbitrary `string` where an IANA timezone ID is required
- Mixing up local and UTC values at compile time

## Conversion Pipeline

```
UTCEpochMs → Luxon DateTime.fromMillis(ms) → .setZone(ianaTimezone)
                                                     │
                                      ┌──────────────┼──────────────┐
                                      ▼              ▼              ▼
                                   .toFormat()   .offsetNameShort  .isInDST
                                   (display)     (offset label)    (DST flag)
```

### Contract Signatures (in `lib/time/time.contracts.ts`)

- `UtcToLocalFn` — UTC ms + timezone → formatted local display
- `LocalToUtcFn` — local date/time + timezone → UTC ms
- `NowUtcFn` — current UTC ms
- `CountdownMsFn` — target UTC ms → remaining ms
- `CheckDSTSafetyFn` — UTC ms + timezone → DST warning/suggestion
- `FormatCountdownFn` — remaining ms → display string
- `GetMemberOffsetLabelFn` — timezone + reference UTC → "UTC-5" label

## DST Handling

Detailed edge cases are cataloged in `src/lib/time/time.dst-edge-cases.ts`. Summary:

| Case | Description | Mitigation |
|------|-------------|------------|
| Spring forward | Local time skipped | Detect gap, suggest next valid time |
| Fall back | Local time ambiguous | Default to earlier offset, annotate |
| Cross-DST schedule | Offset changes between arm and fire | UTC source of truth, display updates |
| Multi-region divergence | US/EU transition on different dates | Show UTC offset labels per member |
| Non-DST zones | No transitions | checkDSTSafety returns clean result |

## Server Responsibilities

The server (Node.js/Express, Cloud Functions) is timezone-agnostic:
- Stores UTC timestamps only
- Never converts to local time
- Never makes decisions based on time-of-day
- Expiry checks use UTC comparison only
- Firestore security rules enforce UTCEpochMs as number type

## Client Responsibilities

Each client handles:
- Detecting the member's IANA timezone on bootstrap
- Converting UTC to local for all display
- Running DST safety checks before proposal submission
- Formatting countdown timers
- Rendering UTC offset labels next to member names

## Dependencies

- **Luxon** — primary DateTime library; IANA timezone support, DST detection, formatting
- **Intl.DateTimeFormat** — native fallback for locale-aware rendering; used for `resolvedOptions().timeZone` on bootstrap

## Testing Strategy (Future)

- Test conversions at DST boundaries for major US, EU, and non-DST zones
- Test spring-forward gap detection
- Test fall-back ambiguity detection
- Test cross-DST scheduling (arm in EDT, fire in EST)
- Test countdown accuracy within 1-second tolerance
- Property-based tests: `localToUtc(utcToLocal(utc, tz), tz) ≈ utc` (within DST constraints)
