# services/socket/

Socket.io real-time communication layer.

## Responsibility

Provides the low-latency transport for scrubber synchronization and presence heartbeats. Feature modules interact with the socket through the `SocketPort` defined in contracts, never importing `socket.io-client` directly (DIP).

## Architecture

```
socket.contracts.ts  ← SocketPort definition
socket.adapter.ts    ← Socket.io SDK adapter
socket.events.ts     ← Wire event name constants
```

## Contracts (SocketPort)

- `connect(roomId, token)` — establish room connection
- `disconnect()` — clean teardown
- `emit(event, payload)` — type-safe event emission
- `on(event, handler)` — type-safe event subscription
- `onReconnect(handler)` — reconnection lifecycle hook
- `isConnected()` — connection status check

## Wire Events

All socket event names are string constants defined in `socket.events.ts` to prevent typo bugs and enable exhaustive handling.

## Failure Modes

- **Disconnect during scrubber drag** — local state preserved, re-synced on reconnect
- **Server unreachable** — exponential backoff with max retry limit
- **Token expiry mid-session** — reconnect with refreshed auth token
- **Duplicate connections** — guard ensures one socket per room

## Integration Points

- **features/scrubber** — primary consumer for real-time position sync
- **features/rooms** — presence heartbeat and member join/leave signals
- **store/scrubber.slice** — receives remote position updates
