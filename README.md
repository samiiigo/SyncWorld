# SyncWorld
SyncWorld is a **cross-platform mobile app** (iOS + Android) that solves international scheduling by acting as a shared time-picker, consensus-voting tool, and coordinated alarm system — all in one.

***

## App Architecture

The system uses a **3-tier layered architecture**:

1. **Client Layer** — React Native (Expo) app handling UI, real-time socket updates, and client-side timezone conversion
2. **API + Real-time Layer** — Node.js + Express server running Socket.io for WebSocket broadcasts (the Time Scrubber), hosted on Railway/Fly.io for persistent connections
3. **Data + Notification Pipeline** — Firebase Firestore for room/vote state, plus a Cloud Scheduler + Cloud Function that fires FCM multicast to all devices at the exact agreed UTC epoch

***

## Core Technical Decisions

| Decision | Rationale |
|---|---|
| **UTC epoch as source of truth** | All times stored/transmitted as `epoch ms`. Conversion happens client-side via `Intl.DateTimeFormat` — eliminates server-side DST bugs |
| **Rooms as Finite State Machines** | Room transitions: `OPEN → PROPOSING → VOTING → LOCKED → FIRED`. Firestore `onSnapshot` keeps all clients in sync |
| **WebSocket for scrubbing, Firestore for votes** | The scrubber needs ~50ms latency (WebSocket); votes need durability and offline handling (Firestore) |
| **Expo Push Notifications** | Single API call delivers to both APNs (iOS) and FCM (Android), with Expo managing device token complexity |

***

## Full Tech Stack

- **Frontend:** React Native + Expo, Zustand state management, React Navigation
- **Real-time:** Socket.io (room-scoped namespaces for the Time Scrubber)
- **Database:** Firebase Firestore (rooms, votes, alarm schedules)
- **Auth:** Firebase Auth (Google, Apple, anonymous guest)
- **Timezone:** Native `Intl.DateTimeFormat` API with IANA zone IDs — zero dependencies
- **Alarms:** Firebase Cloud Scheduler + Cloud Functions → `admin.messaging().sendMulticast()`
- **Hosting:** Railway or Fly.io for the WebSocket server (not serverless — requires persistent connections)

***

## Key Screens Designed

1. **Time Scrubber Screen** — Slider broadcasts UTC epoch via WebSocket; every member's phone shows their local equivalent in real-time
2. **Consensus Vote Screen** — Live Firestore `onSnapshot` view of all member votes; 100% required to advance
3. **Shared Alarm Screen** — Coordinated push alarm with animated bell, showing "4/4 alarms delivered"

***

## Roadmap Overview

- **Phase 1 (Weeks 1–6):** MVP — auth, rooms, scrubber, vote, alarm
- **Phase 2 (Weeks 7–10):** Recurring events, room history, in-room chat
- **Phase 3 (Weeks 11–16):** Calendar export, "best time" ML suggestions, App Store launch
- **Phase 4:** Pro/Team subscription tiers ($4.99/mo and $12/mo)

The downloadable file above is a fully interactive spec document with sidebar navigation, live-rendered phone mockups, code snippets, data models, and both light/dark mode.