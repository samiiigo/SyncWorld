# SyncWorld — Master Product, Design & Technical Specification
**Version 2.0 | Unified Product Architecture · Time Logic · UI/UX Strategy · Technical Blueprint**

---

## Executive Overview

SyncWorld is a cross-platform mobile application (iOS + Android) that eliminates the friction of cross-timezone coordination. Users join a shared "Room," collaboratively scrub through a unified time interface, vote on a mutually acceptable time, and arm a synchronized alarm that fires at precisely the right local moment for every participant — regardless of their time zone or DST status.

Its four core interactions — room creation, an interactive time scrubber, a consensus vote, and a synchronized alarm — each map to distinct product states and technical subsystems. This document is the single authoritative reference combining product architecture, time-handling logic, native UI/UX strategy, technical stack, data model, and development roadmap.

---

## 1. Product Architecture & User Flow

### 1.1 End-to-End User Journey

The SyncWorld user journey is a linear funnel with five distinct states: **Identity → Room → Scrub → Vote → Armed**. Each state corresponds to a screen or overlay with clearly defined entry and exit conditions.

**State 1 — Identity & Onboarding**
The user opens the app for the first time and is asked to provide a display name and grant notification/alarm permissions. The app silently detects and records the device's IANA time zone identifier (e.g., `America/Chicago`) at this point — not a raw UTC offset — to ensure accurate DST-aware handling later. No sign-up account is strictly required for a first session; a persistent anonymous session token is issued. Returning users are dropped directly to the Home/Room Discovery screen.

**State 2 — Room Creation or Join**
The Home screen presents two primary actions: **Create a Room** (host) and **Join a Room** (guest via a 6-character alphanumeric code or shareable deep-link `syncworld://join/{roomId}`). On creation, the host names the room, optionally sets a participant cap, and is assigned the Room Host role. Guests enter the code and are immediately placed inside the room in a "Lobby" sub-state that holds until the host opens the scrubber. All participants' time zones are shown in the room's member list the moment they join.

**State 3 — The Scrubber (Active Sync)**
The host initiates the scrubbing session. The Time Scrubber activates and all members can drag the scrubber handle. As any user drags, every other member's view updates in real time via a persistent room connection — the time display for each member's local zone refreshes live. Members can see a color-coded indicator for each participant showing whether a proposed time falls in their sleep window, working hours, or available hours. The scrubber remains open until a candidate time is proposed and locked for voting.

**State 4 — Vote**
Any member can "Propose" the current scrubber position, transitioning the room into Voting State. A vote card appears as a modal overlay on each member's screen, presenting the proposed UTC time rendered in their local timezone. Members vote **Yes** or **No**. A real-time vote tally is visible to all during the voting window. If consensus is reached (all active members vote Yes), the room transitions to State 5. If a veto occurs or the timer expires, the room returns to the Scrubber with the failed proposal highlighted as a reference point.

**State 5 — Alarm Armed (Consensus UI)**
A full-screen confirmation state signals that consensus has been reached. The alarm is scheduled on each device individually. Each member's screen displays the confirmed time in *their own local timezone*, with a live countdown. The room can be dissolved by the host or persist as a passive "waiting room" until alarm time.

### 1.2 Room State Machine

Rooms are modeled as a Finite State Machine. Firestore `onSnapshot` keeps all clients in sync with the current state.

```
OPEN → PROPOSING → VOTING → LOCKED → FIRED
```

| State | Description |
|---|---|
| `OPEN` | Room created, members joining, scrubber idle |
| `PROPOSING` | Scrubber active; any member can drag |
| `VOTING` | Time proposed; scrubber frozen; vote cards visible |
| `LOCKED` | Consensus reached; alarms arming on each device |
| `FIRED` | Alarm epoch has passed; room archivable |

### 1.3 Conceptual Real-Time Data Flow

The real-time communication model follows an **event-driven broadcast pattern**. When a user moves the scrubber, a lightweight event payload containing the proposed UTC timestamp is sent to the room's sync layer. The sync layer broadcasts this single canonical UTC value to all connected members. Each client device then independently converts that UTC value into the member's local time using their stored IANA timezone identifier.

This architecture keeps the server completely agnostic to time zones — it only ever stores and transmits a single UTC integer — while the local rendering layer handles all conversion and display. Presence (online / scrubbing / voted / away) is propagated via the same connection using heartbeat-based presence detection.

---

## 2. Time Synchronization Logic

### 2.1 Why UTC Is Non-Negotiable

UTC (Coordinated Universal Time) is a constant, precise global standard. Regional time zones shift throughout the year and can be altered by political decisions with little notice. For SyncWorld specifically, a single shared alarm that must fire simultaneously in New York, Berlin, and Tokyo has exactly one correct representation: a UTC timestamp. Every other display is a derivative.

If SyncWorld stored a "wall clock" time (e.g., "9:00 AM") without a timezone anchor, it would be ambiguous — especially after a DST transition or political timezone change. Storing raw UTC offsets (e.g., `-05:00`) is also insufficient, because offsets change twice a year for most users. The correct model is: **store a single UTC epoch timestamp for the alarm, plus each user's IANA time zone identifier string** (e.g., `America/New_York`) separately. The UTC timestamp provides the absolute moment; the IANA identifier governs all display-layer conversions.

### 2.2 Handling Daylight Saving Time (DST) Edge Cases

DST is the single most common source of alarm failure in scheduling applications. There are two distinct failure modes.

**The Non-Existent Time Problem (Spring Forward):** In regions observing DST, when clocks spring forward from 2:00 AM to 3:00 AM, no time exists between 2:00 and 3:00 AM locally. A wall-clock alarm scheduled for 2:30 AM on that night would point to a moment that never occurs. Because SyncWorld stores the alarm as an absolute UTC timestamp — not as a wall-clock time — this problem does not exist.

**The Ambiguous Time Problem (Fall Back):** When clocks fall back, a local time like 1:30 AM occurs twice in a single night. An alarm stored only as "1:30 AM local" would have ambiguous intent. Because SyncWorld's canonical record is a UTC epoch timestamp, there is no ambiguity. The UTC moment maps to exactly one real-world instant.

**DST Guard — Proposed Logic:**
1. When a room is created and an alarm is armed, each member's device records the IANA identifier at that moment alongside the UTC alarm epoch.
2. At alarm delivery time, the scheduling layer on the device resolves the UTC epoch to a local trigger time using the *current* IANA rules (which may have been updated since the alarm was set).
3. For iOS, the `AlarmKit` framework's `relative` schedule mode is explicitly designed to adjust for time zone changes.
4. For Android, `AlarmManager.setExactAndAllowWhileIdle()` is passed the UTC epoch in milliseconds — the OS handles the local time translation.
5. A server-side pre-alarm notification is dispatched 30 minutes before the scheduled UTC time, warning users if a DST transition is detected within their local window.

### 2.3 Timezone Handling Architecture

```
User drags slider
       │
       ▼
Local device time → Convert to UTC (Luxon / Intl.DateTimeFormat)
       │
       ▼
Write UTC epoch to Firestore proposedTimeUTC
       │
       ▼
All members receive UTC via onSnapshot
       │
       ▼
Each device converts UTC → local time
DateTime.fromMillis(utcMs, { zone: member.timezone })
```

All time data is stored and transmitted in **UTC**. Local-time display is purely a presentation-layer concern handled on the client.

---

## 3. Tech Stack

### 3.1 Full Stack Overview

| Layer | Recommended Technology | Purpose |
|---|---|---|
| **Mobile Framework** | React Native + Expo (Managed Workflow) | Cross-platform iOS/Android from one codebase |
| **Language** | TypeScript | Type safety across the entire project |
| **State Management** | Zustand | Lightweight, hook-based global state |
| **Real-Time Sync** | Firebase Cloud Firestore (`onSnapshot`) | Live room/vote synchronization |
| **WebSocket (Scrubber)** | Socket.io on Node.js (room-scoped namespaces) | ~50ms latency for time scrubber broadcasts |
| **Authentication** | Firebase Auth (Google, Apple, Anonymous) + JWT | Secure identity, token-based API calls |
| **Backend** | Node.js + Express (Cloud Run) | REST API + scheduled alarm jobs |
| **Database** | Cloud Firestore (NoSQL) | Rooms, votes, members, alarm state |
| **Push Notifications** | Expo Notifications + Firebase Cloud Messaging (FCM v1) | iOS/Android alarm delivery |
| **Time Zone Library** | Native `Intl.DateTimeFormat` (zero-dep) + Luxon | UTC conversion, DST handling, IANA zone IDs |
| **Slider Component** | `react-native-awesome-slider` (Reanimated v3) | Fluid, haptic-feedback time scrubber |
| **Scheduled Jobs** | Firebase Cloud Functions (`pubsub.schedule`) | Server-side alarm dispatch |
| **Hosting** | Railway or Fly.io (WebSocket server) | Persistent connections (not serverless) |

### 3.2 Core Technical Decisions

| Decision | Rationale |
|---|---|
| **UTC epoch as source of truth** | All times stored/transmitted as `epoch ms`. Conversion happens client-side — eliminates server-side DST bugs |
| **WebSocket for scrubbing, Firestore for votes** | Scrubber needs ~50ms latency (WebSocket); votes need durability and offline handling (Firestore) |
| **Rooms as Finite State Machines** | Firestore `onSnapshot` keeps all clients in sync with deterministic transitions |
| **Expo Push Notifications** | Single API call delivers to both APNs (iOS) and FCM (Android), Expo manages device token complexity |
| **Firestore over raw WebSocket (for votes)** | Offline support, managed reconnect, security rules, no infra to maintain for real-time state |
| **Zustand over Redux** | Lower boilerplate for ~5 state domains; better React Native performance profile |
| **Server-side alarm dispatch (Cloud Function)** | Prevents client clock manipulation; fires even if app is killed |

---

## 4. Application Architecture

SyncWorld follows a **client–BaaS–serverless** architecture: the React Native frontend communicates directly with Firestore for real-time state, while a thin Node.js/Express backend on Cloud Run handles business logic, and Firebase Cloud Functions execute the time-critical alarm dispatch job.

```
┌────────────────────────────────────────────┐
│            React Native / Expo App          │
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Auth    │ │  Room UI │ │ Alarm Screen│  │
│  └────┬────┘ └────┬─────┘ └──────┬──────┘  │
│       │           │               │         │
└───────┼───────────┼───────────────┼─────────┘
        │           │               │
        ▼           ▼               ▼
┌──────────────────────────────────────────────┐
│         Firebase Cloud Firestore              │
│  /rooms/{roomId}                              │
│    /members/{uid}                             │
│    /votes/{uid}                               │
│    proposedTimeUTC, alarmTimeUTC, status      │
└──────────────────┬───────────────────────────┘
                   │  onSnapshot listeners
                   ▼
┌──────────────────────────────────────────────┐
│   Node.js / Express on Cloud Run (Backend)    │
│   - POST /rooms   (create room + invite link) │
│   - POST /rooms/:id/propose (lock proposal)   │
│   - POST /rooms/:id/alarm   (finalize alarm)  │
└──────────────────┬───────────────────────────┘
                   │  Cloud Pub/Sub trigger
                   ▼
┌──────────────────────────────────────────────┐
│   Firebase Cloud Function (scheduledAlarm)    │
│   Runs at exact alarm UTC timestamp           │
│   → FCM v1 POST to each member device token  │
└──────────────────┬───────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   Apple APNs           Google FCM / GCM
   (iOS devices)        (Android devices)
```

---

## 5. Data Model

### 5.1 Firestore Schema

```
/rooms/{roomId}
  name: "Gaming Group"
  hostUid: "uid123"
  status: "open" | "proposing" | "voting" | "locked" | "fired"
  proposedTimeUTC: Timestamp | null
  alarmTimeUTC: Timestamp | null
  createdAt: Timestamp
  participantCap: number | null

  /members/{uid}
    displayName: "Alex"
    timezone: "America/Chicago"       ← IANA identifier, not raw offset
    deviceToken: "fcm_token_abc"
    joinedAt: Timestamp
    status: "online" | "idle" | "offline"

  /votes/{uid}
    agreed: boolean
    votedAt: Timestamp
```

### 5.2 Key Data Rules

- All timestamps are stored as UTC epoch milliseconds or Firestore `Timestamp` (UTC-based).
- IANA zone identifiers are stored per-member for client-side display resolution only — the server never interprets them.
- Vote writes are restricted to `votes/{uid}` where `uid == request.auth.uid` (Firestore Security Rules).
- Alarm field writes are permitted only from service-account-authenticated Cloud Functions to prevent client manipulation.

---

## 6. Core Feature Specifications

### 6.1 The Time Scrubber

The Time Scrubber is the defining interaction of SyncWorld. It is implemented as a `react-native-awesome-slider` component (built on Reanimated v3 and Gesture Handler) mapping a continuous range to a UTC timestamp.

**Representation of Time**
- The scrubber represents a rolling 48-hour window centered on "now," preventing users from proposing times in the past.
- Three distinct visual zones per 24-hour cycle (night/business/evening) are color-coded to aid comprehension, not to restrict choice.
- The current position displays a floating label with both the UTC time and a "local time" label auto-populated from the user's device time zone.

**Multi-Timezone Overlay**
- Below the main scrubber track, a horizontally scrollable secondary strip lists each room member's timezone.
- As the primary thumb moves, all timezone labels update synchronously.
- A warning indicator (⚠) appears inline if a proposed time falls between 11 PM and 6 AM local time for any member.

**Interaction Model**
- **Drag:** Standard thumb-drag gesture for fine-grained control.
- **Tap-to-jump:** Tapping anywhere on the track snaps the thumb to that position with a spring animation.
- **Haptic increments:** Both platforms emit a subtle haptic click every 15-minute interval during drag — `UISelectionFeedbackGenerator` (iOS) and `VibrationEffect.EFFECT_TICK` (Android).
- **Scroll override protection:** A directional lock ensures horizontal swipe activates the scrubber; vertical swipe passes through to the member list.

**Real-Time Broadcast**
- Scrubber position is transmitted as a UTC epoch integer via WebSocket no more than every 100ms (throttled), with a trailing "commit" event on thumb-release for final synchronization.
- Alternatively, a Firestore write with ~200ms debounce is used for vote state persistence.

**How it works (code sketch):**
```ts
import { DateTime } from 'luxon';

// Receiving a UTC ms value broadcast from the scrubber
const localTime = DateTime.fromMillis(utcMs, { zone: member.timezone });
// → "8:00 PM" for London, "5:00 AM" for Tokyo
```

### 6.2 Voting & Consensus Mechanism

**Proposal State**
When any member taps "Propose This Time," the room enters a locked Voting State. The scrubber is frozen for all members. A configurable time limit (30s / 90s / 3min, set by host at room creation — default 90s) is applied. The vote card presents the proposed time in each member's local timezone.

**Consensus Rules**
- **Unanimous Yes = Consensus.** All active members must vote Yes for the alarm to be armed.
- **Any single No = Veto.** The proposal is immediately rejected, returning to Scrubber State. The rejected time is pinned as a ghost marker ("❌ Vetoed") for reference.
- **Vote timer expiry = Auto-Abstain.** A non-voter is treated as an abstention (neutral), not a veto, *unless* they are the only non-voter — in which case the system waits for their vote or marks them unresponsive.

**Member Departure & Quorum**
- If a member disconnects during a vote, they are removed from the active quorum. The vote resolves with the remaining members. A minimum of two active members is required to propose or reach consensus.
- If a member disconnects *after* consensus has been reached, their alarm remains armed on their device — the scheduled UTC epoch is stored locally at the moment of arming, not dependent on the server.
- If a member who voted Yes later taps **Disarm Alarm**, all other members receive an in-app notification: "[Name] has disarmed their alarm. You may want to re-coordinate." Their own alarms remain armed unless they individually choose to disarm.

**Consensus Broken After Arming**
The system does not auto-cancel alarms on consensus break. Instead, the Alarm Armed screen surfaces a soft banner: "⚠ [Name] left the alarm. Still going off for you at 7:30 AM." Each user is in control of their own alarm.

A Firestore Cloud Function (`onDocumentWrite` on the votes subcollection) checks whether `votes` count equals `members` count; if so, it sets `status: "locked"` and writes the `alarmTimeUTC` timestamp — preventing race conditions on the client side.

### 6.3 Push Notifications & Native Alarm Delivery

**Notification Layers**

SyncWorld uses two distinct system capabilities: **push notifications** (for social coordination events) and **native alarm scheduling** (for the physical wake-up event).

| Event | Delivery Mechanism | User Dismissal |
|---|---|---|
| Member joins/leaves room | Push notification (silent) | Auto-dismiss |
| A vote has been proposed | Push notification (alert) | Dismissal returns to app |
| Consensus reached | Push notification (alert) + in-app deep-link | Navigates to Alarm Armed screen |
| 30-minute pre-alarm reminder | Push notification (alert) | Tap opens app |
| Alarm firing | **Native OS Alarm** — full interrupt | Requires user action (Dismiss/Snooze) |

**iOS Alarm Delivery**
iOS uses **AlarmKit** (available from iOS 26+), Apple's native framework that allows apps to schedule fully customizable alarms delivered as full-screen interrupts, even when the app is closed. The alarm is scheduled using a fixed schedule pointing to the UTC epoch. The `AlarmPresentation` is configured with the room name and member count in the title. AlarmKit supports custom `AppIntent` actions enabling a single tap to post an "I'm awake" status back to the room. For iOS versions below 26, a critical-priority push notification with a local `UNUserNotificationCenter` trigger scheduled at the UTC epoch is used as a fallback.

**Android Alarm Delivery**
On Android, `AlarmManager.setExactAndAllowWhileIdle()` is used to schedule the alarm trigger at the UTC epoch timestamp. This ensures the alarm fires precisely even in Doze mode. The `USE_EXACT_ALARM` permission (Android 12+) or `SCHEDULE_EXACT_ALARM` (pre-12) must be declared in the manifest. A full-screen intent (`setFullScreenIntent`) launches a custom alarm screen. A `WAKE_LOCK` permission ensures the screen activates even from deep sleep. A `BroadcastReceiver` registered for `BOOT_COMPLETED` re-registers any pending alarms after a device reboot.

**Cloud Function Alarm Dispatch**
```ts
const message = {
  token: member.deviceToken,
  notification: {
    title: "⏰ SyncWorld Alarm!",
    body: `Time for "${room.name}"`
  },
  data: { roomId, alarmTimeUTC: room.alarmTimeUTC.toISOString() }
};
await admin.messaging().send(message);
```

**Notification Permission Strategy**
On iOS, `NSAlarmKitUsageDescription` must be declared in `Info.plist`. On Android, `POST_NOTIFICATIONS` (Android 13+) and `USE_EXACT_ALARM` must be requested at runtime. Both permission requests should be triggered just before the user's first Room join or creation — not on app launch — to maximize grant rates per platform guidelines.

---

## 7. Native UI/UX Strategy & App Design

### 7.1 Cross-Platform Design Philosophy

SyncWorld is built with a **shared interaction model but distinct visual language** per platform. Logic, screen flow, and feature parity are identical. Visual components, typography, gesture vocabulary, and navigation chrome are strictly native to each platform.

| Design Element | Android (Material Design 3) | iOS (Human Interface Guidelines) |
|---|---|---|
| **Navigation chrome** | Navigation Bar (bottom, 3–5 destinations, 80dp height) | Tab Bar (bottom, 2–5 tabs, 49pt height, SF font 10pt labels) |
| **Primary typeface** | Roboto / Material type scale | SF Pro (San Francisco) |
| **Icon language** | Material Symbols (outlined/filled states) | SF Symbols (strokes, contextual fills) |
| **Color system** | Dynamic Color, tonal palettes (M3) | System colors, semantic tints, light/dark mode |
| **Elevation/depth** | Tonal surface elevation (color-based, not shadow-heavy) | Translucent blur layers, vibrancy effects |
| **Modals / sheets** | Bottom Sheet (standard or modal) | Sheet (`.medium` or `.large` detent) |
| **Feedback** | Ripple touch effect on interactive elements | Haptic feedback via Core Haptics, no ripple |
| **Time Scrubber widget** | Custom `SeekBar`-derived component | Custom `UISlider`-derived component |
| **Vote card appearance** | Material Card with filled buttons, tonal container | UIKit grouped card with filled buttons, tinted background |

The Time Scrubber is the one wholly custom component in the app. It uses the native slider interaction model on both platforms but renders custom track graphics, timezone labels, and zone markers.

### 7.2 Screen-by-Screen Wireframe Descriptions

---

#### Screen 1: Onboarding / Room Creation

**Purpose:** First-time setup, identity establishment, and room access point.

The screen opens with a minimal, full-bleed illustration of a globe with timezone rings. Below it, a single prominent text input asks for a display name. A two-button row offers **Create Room** (primary, filled) and **Join Room** (secondary, outlined).

- Tapping **Create Room** expands a form asking for a room name and optional participant cap. A "Share Link / Code" preview updates live.
- Tapping **Join Room** opens a 6-character code entry field with auto-advance keyboard and a paste-from-clipboard button.

**iOS specifics:** The "Create Room" form appears as a `.large` detent sheet, with a navigation bar close button (✕) top-left and a "Create" button (tinted) top-right.

**Android specifics:** The "Create Room" form appears as a Modal Bottom Sheet with a drag handle and an Extended FAB "Create" anchored at the bottom.

**Permission Prompt:** The OS-native notification/alarm permission dialog is triggered after the user taps "Create" or enters a valid code — at a contextually logical moment, not on cold launch.

---

#### Screen 2: The Main Sync Room (Scrubber + Timezone List + Member Status)

**Purpose:** The core coordination interface. All real-time interaction occurs here.

**Zone A — The Time Scrubber (top 40% of screen):**
A horizontal track spanning the full screen width representing a 24-hour period. The draggable thumb is large (minimum 44pt / 48dp touch target) and displays the current proposed UTC time in a floating label. Below the track, a secondary row of city icons with local times updates for each member as the thumb moves. A gradient wash indicates "sleep hours" (midnight–6 AM) in muted color, "business hours" in neutral, and "evening" in a warm tint.

**Zone B — Member Timezone List (middle 40%):**
A vertical scrollable list where each row shows: member avatar/initials, display name, their city/timezone label (e.g., "London (GMT+1)"), and their current proposed local time (updating live). A status indicator shows: 🟢 Online & Active, 🟡 Idle, 🔴 Disconnected. A subtle "pulse" animation on the row of the user currently dragging the scrubber provides presence awareness.

**Zone C — Action Bar (bottom):**
A persistent bar with **Propose This Time** (primary filled button) and a **Room Settings** icon button. If fewer than two other members are present, "Propose This Time" is disabled with a tooltip: "Waiting for more members…"

**iOS specifics:** List uses a `UITableView` with grouped inset style. Navigation bar contains the Room Name (title) and a back button.

**Android specifics:** List uses a `RecyclerView` with `LinearLayoutManager`. The `TopAppBar` contains the Room Name and an overflow menu (⋮) for room settings.

---

#### Screen 3: Vote Modal Overlay

**Purpose:** Present the proposed time and collect Yes/No from each member.

A modal overlay appears on top of the frozen Scrubber screen. It shows:
1. **Proposed time** in the user's own local timezone (large, prominent).
2. **UTC reference** in small de-emphasized text.
3. **Vote buttons:** Yes (filled, primary tint) and No (outlined, destructive tint) — both large, minimum touch targets.
4. **Live vote tally:** A progress indicator (e.g., "3 of 5 voted") updating via Firestore `onSnapshot`.
5. **Countdown timer:** Time remaining in the voting window.

If the proposal fails (veto or timer expiry), the overlay dismisses with a brief "❌ Vetoed — returning to scrubber" message and the rejected time is pinned as a ghost marker on the track.

---

#### Screen 4: Alarm Armed / Consensus UI

**Purpose:** Confirmation state and countdown. The "calm before the alarm."

A predominantly full-bleed, calm screen showing:
1. **Primary time display:** The confirmed alarm time in the user's local timezone, formatted large (e.g., "7:30 AM" in bold display type).
2. **Secondary UTC reference:** A small, de-emphasized label (e.g., "13:30 UTC").
3. **Countdown timer:** A live digital countdown (e.g., "Fires in 4h 22m 13s") updating each second.
4. **Member grid:** A compact avatar strip showing all members who have successfully armed their alarms, each with a ✔ indicator. Members not yet confirmed show "⏳ Arming..."
5. **Actions:** A **Disarm Alarm** button (destructive tint, small) and a **Share Room** button.

**Transition animation:** On iOS, a native confetti-style particle effect (`CAEmitterLayer`) and a satisfying haptic bump (`UINotificationFeedbackGenerator .success`). On Android, a Lottie animation plays with tactile vibration via `VibrationEffect.createOneShot`.

**Background state:** While backgrounded, an iOS Live Activity (or Android persistent notification) shows the countdown in the lock screen / notification shade.

### 7.3 Key UI Components

| Component | Library / Approach | Notes |
|---|---|---|
| Time Scrubber Slider | `react-native-awesome-slider` (Reanimated v3) | Haptic feedback, custom thumb, bubble tooltip showing current time |
| Member Time Cards | Custom FlatList item | Shows avatar, name, and local equivalent of proposed time |
| Vote Progress Bar | `Animated.View` (React Native) | Real-time fill as members agree |
| Alarm Screen | Full-screen modal with sound | Triggered by FCM data payload on foreground |
| Room Invite | `expo-sharing` + deep link | Generates `syncworld://join/{roomId}` link |

### 7.4 Design Principles

- **Mobile-first, dark-mode default:** Global scheduling apps are often used in evening contexts; dark mode reduces eye strain.
- **Anchor in local time:** The scrubber always shows the user's own local time prominently, with other time zones as supporting context below — reducing cognitive load.
- **Progressive disclosure:** Voting UI only appears after a time is proposed; alarm confirmation only appears after 100% agreement — each step is gated.
- **Haptic feedback on consensus:** A satisfying haptic pulse fires on every device when the last vote lands, reinforcing the "synchronized" feeling.
- **Conflict is visible, not hidden:** The Time Scrubber makes scheduling conflicts (sleep windows, incompatible timezones) visible proactively through visual affordances.

---

## 8. Authentication & Security

Firebase Authentication provides email/password and social-login (Google, Apple) flows out of the box, plus anonymous guest sessions. After sign-in, Firebase issues a **JWT ID token** which the app attaches as a `Bearer` header to all Express API calls. The Node.js middleware verifies the token using the Firebase Admin SDK.

**Firestore Security Rules restrict:**
- Room reads: only to documents where `request.auth.uid` is in the `members` subcollection.
- Vote writes: only to `votes/{uid}` where `uid == request.auth.uid`.
- Alarm field writes: only permitted from service-account-authenticated Cloud Functions (preventing client manipulation).

---

## 9. Real-Time Synchronization Strategy

SyncWorld uses a **hybrid sync strategy**: Firestore `onSnapshot` for durable state (votes, room status, member presence) and Socket.io over WebSocket for the low-latency time scrubber broadcast.

| Concern | Solution |
|---|---|
| Slider write rate | Client-side 100–200ms throttle/debounce before write |
| Offline members | Firestore queues writes locally; syncs on reconnect |
| Consensus race condition | Cloud Function (server-side) finalizes lock status |
| Multi-region latency | Firestore regional database closest to majority of users |
| Concurrent vote writes | Firestore atomic `arrayUnion` or subcollection per-user doc |
| Sub-50ms scrubber latency | Optional Redis Pub/Sub layer behind Socket.io |

---

## 10. Scalability & Infrastructure

- **Firestore** scales automatically and supports millions of concurrent `onSnapshot` listeners.
- **FCM v1** supports batch sends up to 500 device tokens per request — sufficient for group alarms of any realistic size.
- **Cloud Functions** can be triggered to the minute via Cloud Scheduler (`pubsub.schedule`). For millisecond-precise alarms at large scale, a dedicated job queue (e.g., **BullMQ** on Redis via Cloud Memorystore) is preferred over Cloud Scheduler's 1-minute granularity.
- **Expo Managed Workflow** handles OTA JavaScript updates without App Store resubmission, enabling rapid iteration on UI and logic.
- For rooms with very large membership (100+), vote-counting logic should move entirely server-side using Firestore **distributed counters** to avoid contention on the room document.

---

## 11. Development Roadmap

| Phase | Timeline | Scope |
|---|---|---|
| **Phase 1 — MVP** | Weeks 1–6 | Auth, rooms (create/join), time scrubber, consensus vote, alarm |
| **Phase 2 — Social** | Weeks 7–10 | Recurring events, room history, in-room chat |
| **Phase 3 — Intelligence** | Weeks 11–16 | Calendar export (`.ics`), "best time" ML suggestions, App Store launch |
| **Phase 4 — Monetization** | Post-launch | Pro ($4.99/mo) and Team ($12/mo) subscription tiers |

---

## 12. Core Design Principles (Summary)

1. **UTC as the Single Source of Truth.** Every stored, transmitted, and compared timestamp is a UTC epoch integer. No raw offsets are stored. IANA identifiers are stored alongside users for display resolution only.

2. **Local Time is a View Layer Concern.** The server is completely timezone-unaware. Conversion from UTC to any local time happens exclusively on the client device using the device's current IANA database.

3. **Alarms Are Owned by the Device.** Once a consensus is reached and a UTC alarm epoch is transmitted, each device owns its alarm independently. Network connectivity is not required for an alarm to fire.

4. **Native First, Shared Logic.** The interaction model, state machine, and all time logic are platform-agnostic. The component library, typography, gesture vocabulary, and navigation chrome are strictly platform-native.

5. **Conflict is Visible, Not Hidden.** The Time Scrubber makes scheduling conflicts visible proactively through visual affordances, reducing the chance of a vetoed proposal.

6. **Consensus is Sacred.** A shared alarm should only fire if everyone is genuinely ready. Unanimous Yes is the only path to arming. Any single No is a veto.
