# Realtime Server

- Added Express + Socket.io bootstrap.
- Added Firebase ID token verification for sockets and HTTP.
- Added room membership checks before `socket.join()`.
- Added scrubber update handling with debounce persistence.
- Added presence heartbeat handling.
- Added room lookup route with per-user throttling.
