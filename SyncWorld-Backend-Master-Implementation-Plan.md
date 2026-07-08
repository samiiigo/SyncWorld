# SyncWorld Backend — Master Implementation Plan

**Scope:** Everything the frontend blueprint expects but does not own: the Node.js/Express + Socket.io realtime server, Firebase Cloud Functions, Firestore schema and Security Rules, and the alarm-firing pipeline.

**Source of truth for frontend expectations:** the frontend contracts and FSM in `syncworld-app/src/constants/room.constants.ts`, `syncworld-app/src/features/rooms/rooms.fsm.ts`, and `syncworld-app/src/services/socket/socket.events.ts`.

---

## 0. Build Rules That Come First

Before any feature code lands, lock these decisions:

1. **Use the frontend event names exactly.** Keep the backend aligned with `scrubber:update`, `scrubber:proposal`, `presence:heartbeat`, `presence:changed`, `room:member_joined`, `room:member_left`, and `room:status_changed`.
2. **Do not allow direct client writes to authoritative room state.** Room creation, membership claims, room-code writes, proposal resolution, and room status changes should go through callable functions or Admin SDK only.
3. **Treat Firestore rules as the actual trust boundary.** Client-side FSM checks are UX only.
4. **Use one canonical FSM table.** The backend must match the frontend transition table in `syncworld-app/src/constants/room.constants.ts`.
5. **Use App Check in production, but define a dev/emulator path.** Without that, local Expo and function testing becomes unnecessarily painful.
6. **Treat minute-level alarm sweeps as recovery, not magic precision.** If sub-minute exactness becomes a product requirement, move the alarm dispatch onto a tighter queue/job model.

---

## 1. Recommended Repo Structure

Create a separate backend workspace, or add a sibling `syncworld-backend/` directory:

```text
syncworld-backend/
├── functions/
│   ├── src/
│   │   ├── index.ts
│   │   ├── callable/
│   │   │   ├── createRoom.ts
│   │   │   ├── joinRoom.ts
│   │   │   ├── transitionRoomStatus.ts
│   │   │   └── resolveConsensus.ts
│   │   ├── triggers/
│   │   │   └── onProposalWrite.ts
│   │   ├── scheduled/
│   │   │   ├── fireAlarms.ts
│   │   │   └── cleanupOrphanedRooms.ts
│   │   ├── lib/
│   │   │   ├── firebaseAdmin.ts
│   │   │   ├── roomFsm.ts
│   │   │   ├── validation.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── appCheck.ts
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
├── realtime-server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── middleware/
│   │   │   ├── verifyAuthToken.ts
│   │   │   ├── verifyAppCheck.ts
│   │   │   └── rateLimiter.ts
│   │   ├── sockets/
│   │   │   ├── connection.ts
│   │   │   ├── scrubber.handlers.ts
│   │   │   ├── presence.handlers.ts
│   │   │   └── roomMembership.guard.ts
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   └── roomLookup.ts
│   │   ├── lib/
│   │   │   └── firebaseAdmin.ts
│   │   └── config/
│   │       └── env.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── firestore/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── firestore.rules.test.ts
├── firebase.json
├── .firebaserc
└── SECURITY.md
```

---

## 2. Firestore Schema

Use the following data model as the backend contract.

```text
users/{userId}
  uid: string
  displayName: string | null
  isAnonymous: boolean
  timezone: string
  createdAt: Timestamp
  updatedAt: Timestamp

rooms/{roomId}
  roomId: string
  code: string
  status: 'OPEN' | 'PROPOSING' | 'VOTING' | 'LOCKED' | 'FIRED'
  hostId: string
  memberCount: number
  createdAt: Timestamp
  lastActivityAt: Timestamp
  lastStatusChangeAt: Timestamp
  scrubberPosition: number

rooms/{roomId}/members/{memberId}
  uid: string
  displayName: string
  timezone: string
  isOnline: boolean
  lastSeenAt: Timestamp
  joinedAt: Timestamp

rooms/{roomId}/proposals/{proposalId}
  proposalId: string
  createdBy: string
  targetTimeUtc: number
  createdAt: Timestamp
  expiresAt: Timestamp
  status: 'active' | 'resolved_locked' | 'resolved_rejected' | 'expired'

rooms/{roomId}/proposals/{proposalId}/votes/{voteId}
  userId: string
  choice: 'accept' | 'reject'
  castAt: Timestamp

rooms/{roomId}/push_tokens/{userId}
  userId: string
  expoPushToken: string
  platform: 'ios' | 'android'
  updatedAt: Timestamp

room_codes/{code}
  roomId: string
  createdAt: Timestamp
```

### Schema Notes

- `room_codes` is the canonical code lookup table and must never be listable from clients.
- `rooms/{roomId}.status` must be changed only by Admin SDK code.
- `push_tokens` must be server-readable only.
- If the frontend needs direct membership creation, do not expose it through rules; route it through a callable join flow.

---

## 3. Firestore Security Rules

These rules are the trust boundary. The safe default is to deny client writes to authoritative data.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function hasAppCheck() {
      return request.app != null;
    }

    function isSelf(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    match /users/{userId} {
      allow read, create, update: if isSelf(userId) && hasAppCheck();
      allow delete: if false;
    }

    match /rooms/{roomId} {
      allow read: if isSignedIn() && hasAppCheck()
        && exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
      allow create, update, delete: if false;

      match /members/{memberId} {
        allow read: if isSignedIn() && hasAppCheck()
          && exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
        allow create, update, delete: if false;
      }

      match /proposals/{proposalId} {
        allow read: if isSignedIn() && hasAppCheck()
          && exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
        allow create, update, delete: if false;

        match /votes/{voteId} {
          allow read: if isSignedIn() && hasAppCheck()
            && exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
          allow create: if isSelf(voteId) && hasAppCheck()
            && request.resource.data.userId == request.auth.uid;
          allow update, delete: if false;
        }
      }

      match /push_tokens/{userId} {
        allow read: if false;
        allow create, update: if isSelf(userId) && hasAppCheck();
        allow delete: if isSelf(userId) && hasAppCheck();
      }
    }

    match /room_codes/{code} {
      allow get: if isSignedIn() && hasAppCheck();
      allow list: if false;
      allow write: if false;
    }
  }
}
```

### Rules Guidance

- Room creation should happen in a callable that uses Admin SDK.
- Joining a room should also be callable, or a two-step flow that creates membership with admin privileges.
- Client code should never be able to self-attach to a room by writing a membership doc directly.

---

## 4. Cloud Functions

### 4.1 `createRoom`

- Verify authentication and App Check.
- Rate-limit by UID.
- Generate the room code with `crypto.randomBytes`.
- Write `rooms/{roomId}` and `room_codes/{code}` atomically.
- Add the host as the first member via Admin SDK.

### 4.2 `joinRoom`

- Look up `room_codes/{code}`.
- Verify membership cap and room status.
- Create `rooms/{roomId}/members/{uid}` via Admin SDK.
- Return only the room ID and minimal safe metadata.

### 4.3 `transitionRoomStatus`

- Revalidate the FSM transition against the canonical table.
- Enforce guards server-side.
- For `VOTING -> LOCKED`, recompute actual votes from Firestore.
- Use Admin SDK to write `rooms/{roomId}.status`.

### 4.4 `resolveConsensus`

- Trigger on proposal or vote changes.
- Recount votes and member eligibility from Firestore.
- Mark proposals as resolved or expired.
- Transition the room back to `OPEN` on rejection or expiry.

### 4.5 `fireAlarms`

- Query rooms in `LOCKED` state whose alarm time is due.
- Read push tokens with Admin SDK.
- Send multicast pushes.
- Transition `LOCKED -> FIRED` after successful dispatch.
- Prune invalid tokens.

### 4.6 `cleanupOrphanedRooms`

- Remove empty or stale rooms.
- Recursively delete child collections.
- Remove room-code entries.

---

## 5. Realtime Server

### 5.1 Authentication

- Accept Firebase ID token on socket handshake.
- Verify the token with `firebase-admin`.
- Reject expired or invalid tokens immediately.
- Attach the decoded UID to `socket.data.uid`.

### 5.2 Room Join

- Require a membership doc before `socket.join(roomId)`.
- Never trust the room ID or code alone.
- Re-check membership on reconnect and periodically for long-lived sessions.

### 5.3 Event Handling

- `scrubber:update`: validate range, require joined room, broadcast to the room, debounce Firestore persistence.
- `scrubber:proposal`: treat as the room’s proposal trigger and route through backend validation.
- `presence:heartbeat`: debounce presence updates.
- `room:member_joined` and `room:member_left`: server-generated only.
- `room:status_changed`: server-generated only.

### 5.4 REST Surface

- `GET /health` for platform health checks.
- `GET /room-lookup?code=XXXXXX` for a rate-limited code lookup proxy.

---

## 6. Alarm Delivery Strategy

For the first implementation, keep `fireAlarms` as a scheduled safety net, but do not pretend it is millisecond-precise. If the product later needs tighter timing, move the firing step to a per-room scheduled job or queue-backed worker.

Practical MVP rule:

- use scheduled sweeps for robustness,
- store UTC as the source of truth,
- and let each device own its local alarm state once armed.

---

## 7. Testing Strategy

- Firestore rules tests should explicitly cover deny/allow behavior for profiles, room reads, room writes, votes, room codes, and push tokens.
- Cloud Functions should unit test pure FSM and tally logic.
- Realtime server tests should verify handshake rejection, membership checks, and scrubber validation.
- Add emulator-backed tests before any deploy pipeline is enabled.

---

## 8. Build Order

1. Scaffold the backend workspace and shared TypeScript configs.
2. Implement Firestore rules and emulator tests.
3. Add Firebase Admin initialization and auth/App Check verification.
4. Build `createRoom` and `joinRoom`.
5. Add `transitionRoomStatus` and consensus resolution.
6. Build the realtime server handshake and room membership checks.
7. Wire scrubber and presence events.
8. Add alarm dispatch and cleanup jobs.
9. Dockerize the realtime server.
10. Add CI, Sentry, and deploy pipelines.

---

## 9. Non-Negotiables Before Launch

- Room status changes must be admin-only.
- `room_codes` must not be enumerable from clients.
- Membership must not be self-attachable through Firestore rules.
- Frontend and backend event names must stay identical.
- App Check needs an emulator-friendly dev path.
- Alarm dispatch needs a fallback story if the scheduler misses a run.
