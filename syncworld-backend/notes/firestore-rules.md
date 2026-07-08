# Firestore Rules

- Added `firestore/firestore.rules`.
- Denied direct client writes to authoritative room data.
- Kept `room_codes` non-enumerable from clients.
- Blocked client reads of `push_tokens`.
- Added emulator-based rules tests for allow/deny cases.
