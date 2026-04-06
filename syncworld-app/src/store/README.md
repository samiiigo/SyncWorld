# store/

Zustand state management layer for SyncWorld.

## Responsibility

Houses all client-side state as independent, composable slices. Each slice owns exactly one domain's state shape and actions (SRP). The root store composes slices without coupling them.

## Architecture

```
store.root.ts          ← composes all slices
├── identity.slice.ts  ← auth & session state
├── rooms.slice.ts     ← room entity & FSM state
├── scrubber.slice.ts  ← scrubber position & sync state
├── voting.slice.ts    ← proposal, vote, tally state
└── alarm.slice.ts     ← alarm entity & countdown state
```

## Design Decisions

- **One slice per domain** — enforces SRP; a slice never manages another domain's state
- **Actions co-located with state** — Zustand convention; keeps mutations near the shape
- **No direct service calls in slices** — orchestrators mediate between slices and services (DIP)
- **Immer not used initially** — prefer explicit spread updates for transparency; add Immer if deep nesting warrants it

## Extension

To add a new slice:
1. Create `<domain>.slice.ts` in this directory
2. Define the state shape type and initial state
3. Define actions as methods on the slice
4. Register the slice in `store.root.ts`
