# constants/

Application-wide and domain-specific constant values.

## Responsibility

Provides a single location for tunable parameters, thresholds, magic numbers, and enumerated values used throughout the codebase. Constants are defined as `as const` objects for type narrowing.

## Files

| File | Scope |
|------|-------|
| `app.constants.ts` | App name, version, network timeouts, presence intervals |
| `room.constants.ts` | Room FSM transitions, member limits, code format |
| `voting.constants.ts` | Quorum/consensus thresholds, proposal TTL |
| `alarm.constants.ts` | Alarm timing constraints, native scheduling limits |

## Guidelines

- Never import domain logic into constants files
- All timing values are in milliseconds
- Use `as const` assertions for literal type inference
- Group related constants into a single object per concern
