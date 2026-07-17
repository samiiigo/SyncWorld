# Failure Modes

Comprehensive catalog of failure scenarios and planned mitigations.

## 1. Network and Connectivity

### 1.1 Socket.io Disconnect During Scrubber Drag
- **Symptom:** Local scrubber updates stop propagating to other members
- **Detection:** `SocketPort.isConnected()` returns false; `onDisconnect` handler fires
- **Mitigation:** Preserve local state; buffer outbound frames; re-sync on reconnect by fetching latest position from Firestore; re-emit local position if local seq > remote
- **Blueprint location:** `src/features/scrubber/scrubber.pipeline.ts` (reconnection reconciliation)

### 1.2 Firestore Listener Disconnect
- **Symptom:** Room state becomes stale; no real-time updates
- **Detection:** Firestore SDK `onSnapshot` error callback
- **Mitigation:** Exponential backoff reconnection; surface stale-data indicator to UI; fall back to manual refresh
- **Blueprint location:** `src/shared/lib/firebase/firebase.firestore.adapter.ts`

### 1.3 Complete Network Loss
- **Symptom:** All remote operations fail
- **Detection:** NetInfo API (react-native) or navigator.onLine
- **Mitigation:** Queue writes; show offline banner; Firestore offline persistence serves cached reads; reconnect automatically
- **Blueprint location:** `src/shared/lib/firebase/firebase.firestore.adapter.ts` (offline persistence TODO)

### 1.4 Server Unreachable (Socket.io)
- **Symptom:** Socket.io handshake fails repeatedly
- **Detection:** Connection attempt counter exceeds `SOCKET_RECONNECT_ATTEMPTS`
- **Mitigation:** Surface error; fall back to Firestore-only mode (higher latency but functional); disable scrubber real-time sync
- **Blueprint location:** `src/shared/lib/socket/socket.adapter.ts`, `src/shared/constants/app.constants.ts` → `NETWORK`

## 2. Voting and Consensus

### 2.1 Veto Cast
- **Symptom:** A member explicitly rejects the proposal
- **Detection:** Vote document with `choice: 'reject'` triggers tally recalculation
- **Mitigation:** If reject count exceeds threshold → auto-resolve as rejected; transition room to OPEN; re-enable scrubber
- **Blueprint location:** `src/features/voting/voting.orchestrator.ts`

### 2.2 Quorum Loss During Voting
- **Symptom:** Members disconnect, dropping below `QUORUM_THRESHOLD`
- **Detection:** Presence events reduce online count; quorum check fails
- **Mitigation:** Auto-reject active proposal; transition to OPEN; emit `QUORUM_STATUS_CHANGED` event
- **Blueprint location:** `src/features/voting/voting.orchestrator.ts` (quorum loss section)

### 2.3 Proposal Expiry
- **Symptom:** `PROPOSAL_TTL_MS` elapsed without consensus
- **Detection:** Client-side timer or Cloud Function trigger on `expiresAt` field
- **Mitigation:** Mark proposal as expired; transition to OPEN; emit `PROPOSAL_EXPIRED`
- **Blueprint location:** `src/features/voting/voting.orchestrator.ts` (consensus resolution section C)

### 2.4 Simultaneous Proposals
- **Symptom:** Two members submit proposals concurrently
- **Detection:** `MAX_ACTIVE_PROPOSALS` constraint check
- **Mitigation:** Firestore transaction ensures at most one active proposal per room; second write fails with conflict; surface retry message
- **Blueprint location:** `src/features/voting/constants/voting.constants.ts`, `src/features/voting/voting.repository.ts`

### 2.5 Vote During Disconnect
- **Symptom:** Member casts vote while offline
- **Detection:** Firestore offline queue
- **Mitigation:** Queue vote locally; submit on reconnect; if proposal expired during disconnect, discard vote and notify
- **Blueprint location:** `src/features/voting/README.md` (edge cases)

## 3. Alarm and Scheduling

### 3.1 Native Alarm Permission Denied
- **Symptom:** `NativeAlarmPort.canScheduleExactAlarms()` returns false
- **Detection:** Permission check on alarm arm attempt
- **Mitigation:** Fall back to push notification + in-app countdown; surface permission prompt; document user guidance for battery optimization
- **Blueprint location:** `src/shared/lib/alarms/README.md` (failure modes), `src/features/alarms/alarms.orchestrator.ts`

### 3.2 App Killed Before Alarm Fire
- **Symptom:** In-app countdown not running at fire time
- **Detection:** N/A (app not running)
- **Mitigation:** Native OS alarm persists; push notification triggers app relaunch; BOOT_COMPLETED receiver re-registers on Android
- **Blueprint location:** `src/shared/lib/alarms/README.md` (platform considerations)

### 3.3 Device Reboot Between Arm and Fire
- **Symptom:** Android clears AlarmManager entries on reboot
- **Detection:** BOOT_COMPLETED broadcast receiver
- **Mitigation:** Re-register all pending alarms from local registry on boot
- **Blueprint location:** `src/shared/lib/alarms/alarms.adapter.ts`

### 3.4 Alarm Time in the Past
- **Symptom:** By the time consensus resolves, the proposed time has passed
- **Detection:** `targetTimeUtc < nowUtc() + MIN_LEAD_TIME_MS`
- **Mitigation:** Reject alarm arm; transition room back to OPEN; surface message suggesting a new time
- **Blueprint location:** `src/features/alarms/alarms.orchestrator.ts` (arm validation)

### 3.5 Clock Skew Between Devices
- **Symptom:** Countdown displays differ by seconds across members
- **Detection:** N/A (inherent to distributed systems)
- **Mitigation:** Use Firestore server timestamp for arm time; native alarm uses device clock for trigger; accept ±2s tolerance
- **Blueprint location:** `src/features/alarms/README.md` (edge cases)

## 4. DST Edge Cases

### 4.1 Spring-Forward Gap
- **Symptom:** Proposed alarm time doesn't exist in member's timezone
- **Detection:** `checkDSTSafety()` returns `isSkipped: true`
- **Mitigation:** Suggest next valid time; surface warning in UI before proposal submission
- **Blueprint location:** `src/shared/lib/time/time.dst-edge-cases.ts` (CASE 1)

### 4.2 Fall-Back Overlap
- **Symptom:** Proposed alarm time is ambiguous in member's timezone
- **Detection:** `checkDSTSafety()` returns `isAmbiguous: true`
- **Mitigation:** Default to earlier offset; annotate in UI
- **Blueprint location:** `src/shared/lib/time/time.dst-edge-cases.ts` (CASE 2)

### 4.3 Cross-DST Scheduling
- **Symptom:** UTC offset changes between alarm arm and fire
- **Detection:** Luxon detects offset change for the member's timezone at fire time
- **Mitigation:** UTC is source of truth; alarm fires at correct absolute instant; local display updates to reflect new offset
- **Blueprint location:** `src/shared/lib/time/time.dst-edge-cases.ts` (CASE 3)

### 4.4 Multi-Region DST Divergence
- **Symptom:** Members in US and EU see different relative offsets during the 2-week gap
- **Detection:** Compare offsets for all members in lobby
- **Mitigation:** Always show UTC offset label next to member names; make the UTC time visible alongside local time
- **Blueprint location:** `src/shared/lib/time/time.dst-edge-cases.ts` (CASE 4)

## 5. Identity and Session

### 5.1 Anonymous Session Expiry
- **Symptom:** Firebase Auth token cannot be refreshed
- **Detection:** Auth state change listener fires with null user
- **Mitigation:** Attempt silent re-authentication; if fails, prompt re-sign-in; preserve local state for session restore
- **Blueprint location:** `src/features/auth/README.md` (edge cases)

### 5.2 Auth Provider Link Failure
- **Symptom:** Merging anonymous account with provider fails (data conflict)
- **Detection:** `linkWithProvider()` returns error result
- **Mitigation:** Surface error; offer retry; warn about potential data loss before link attempt
- **Blueprint location:** `src/features/auth/auth.contracts.ts`

## 6. Room Lifecycle

### 6.1 Host Disconnect
- **Symptom:** Room host goes offline
- **Detection:** Presence heartbeat timeout exceeds `DISCONNECT_THRESHOLD_MS`
- **Mitigation:** Auto-assign host role to longest-present online member; surface host-transfer notification
- **Blueprint location:** `src/features/rooms/README.md` (edge cases)

### 6.2 Last Member Leaves
- **Symptom:** Room has zero members
- **Detection:** Member count reaches 0
- **Mitigation:** Mark room for cleanup; Cloud Function deletes after TTL
- **Blueprint location:** `src/features/rooms/rooms.orchestrator.ts` (leave flow)

### 6.3 Orphaned Room
- **Symptom:** Room exists in Firestore with no active members
- **Detection:** Cloud Function scheduled scan
- **Mitigation:** Delete room and subcollections after configurable TTL
- **Blueprint location:** `src/features/rooms/README.md` (edge cases)
