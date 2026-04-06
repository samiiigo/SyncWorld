# types/

Centralized domain type definitions for SyncWorld.

## Responsibility

Single source of truth for all entity shapes, event taxonomies, and branded primitive types used across the codebase. Every feature, service, and store module imports its types from here.

## Design Decisions

- **`type` aliases only** — no `interface` declarations. Union types and intersection types compose better for discriminated unions and event modeling.
- **Branded primitives** — `UTCEpochMs`, `RoomId`, `IANATimezone`, etc. use nominal branding to prevent accidental misuse (e.g., passing a `RoomId` where a `UserId` is expected).
- **Discriminated unions** — all events use a `kind` field as the discriminant, enabling exhaustive `switch` handling.
- **Barrel export** — `domain.ts` re-exports everything so consumers use a single import path.

## File Map

| File | Scope |
|------|-------|
| `common.ts` | Branded primitives, `Result<T,E>`, `Unsubscribe`, pagination |
| `room.ts` | Room entity, FSM statuses, create/join payloads |
| `member.ts` | Member entity, presence, lobby snapshot |
| `vote.ts` | Proposal, vote, tally, consensus result |
| `alarm.ts` | Alarm entity, local view, native handle |
| `scrubber.ts` | Scrubber position, sync frame, local state |
| `events.ts` | All domain events as discriminated unions |
| `domain.ts` | Barrel re-export |

## Extension

To add a new entity or event domain:
1. Create a new file in this directory
2. Define types using `type` aliases
3. Re-export from `domain.ts`
4. Add corresponding events to `events.ts`
