# lib/time/

UTC-first time utilities for SyncWorld.

## Responsibility

Provides all time conversion, formatting, and validation logic. This module enforces the core time model:

- **UTC epoch milliseconds** are the single source of truth
- **IANA timezone identifiers** are stored per member
- **Server remains timezone-agnostic** — never stores or processes local times
- **Client handles all local display conversion**

## Core Time Model

```
Server (Firestore/Socket.io)         Client (per member)
─────────────────────────            ──────────────────
  UTCEpochMs (stored)        →       Luxon DateTime
  No timezone awareness      →       Member's IANATimezone
  No formatting              →       Intl.DateTimeFormat
  No DST knowledge           →       DST-aware conversion
```

## Files

| File | Scope |
|------|-------|
| `time.contracts.ts` | Conversion and formatting function signatures |
| `time.conversions.ts` | Stub implementations for UTC ↔ local conversion |
| `time.constants.ts` | Time-related constants (units, bounds) |
| `time.dst-edge-cases.ts` | DST edge case catalog and mitigation notes |

## DST Edge Cases (must handle)

1. **Spring forward** — 2:00 AM skipped → proposed alarm at 2:30 AM doesn't exist
2. **Fall back** — 1:00 AM repeated → ambiguous local time for alarm display
3. **Cross-DST scheduling** — alarm set before transition fires after it
4. **Different DST dates** — US and EU transition on different weekends
5. **Non-DST zones** — UTC, IST, CST-China never shift

## Dependencies

- `luxon` — DateTime manipulation and IANA timezone support
- Native `Intl.DateTimeFormat` — locale-aware rendering fallback
