# SyncWorld needs native alarms before anything else

**Bottom line.** SyncWorld's product loop (create or join a room, scrub a 48-hour cross-zone timeline, vote unanimously, arm) works, but only against local emulators with two web clients. It has never run on an iOS device or against a deployed Firebase project ([PRODUCTION_READINESS.md:139-144](../syncworld-backend/PRODUCTION_READINESS.md), [current-status.md:32-35](../syncworld-app/notes/current-status.md)). Three blockers stop the core promise that every device rings. First, there is no build pipeline: no `eas.json`, bundle IDs or EAS projectId. Second, the alarm is a plain expo-notifications local notification. It does not ring through Silent mode or Focus on iOS and has no exact-alarm guarantee on Android. Third, the deployed callables require App Check but the client sends no App Check tokens, so any real client would be rejected. Both stores also require things the app doesn't have yet: in-app account deletion (plus a web deletion link for Play), report and block tools for user content, a privacy policy and terms, privacy manifests, Data safety answers and the new age-rating answers. The good news is that the backend is in better shape than the client. Rules deny all client writes, state changes go through callables, there are per-user rate limits and about 64 passing backend tests, so most of the work is client, native and compliance work. On competitors: Galarm already sells the "group alarm across time zones" promise, so SyncWorld has to win on choosing the moment by consent and on ringing reliably, and the reliability has to be visible to users.

## Gap table

Priority key: **Blocker** = the app can't install, ring or pass review without it. **Before launch** = needed for a credible public 1.0. **Later** = growth or polish.

| Area | What's required (2026) | SyncWorld today | Gap | Priority |
|---|---|---|---|---|
| Build & release | Dev builds + EAS Build/Submit/Update; bundle IDs; versioning. Expo Go is "first and foremost an educational tool" ([Expo](https://expo.dev/changelog/expo-go-and-app-store-may-2026)) | No `eas.json`, no `ios.bundleIdentifier`/`android.package`, no projectId, no `expo-updates`; iOS never built ([app.json](../syncworld-app/app.json)) | Everything | **Blocker** |
| iOS alarm | AlarmKit (iOS 26+) is the only App Store–legal way to break through Silent/Focus; needs `NSAlarmKitUsageDescription` + user opt-in; `Alarm.Schedule.fixed(date)` for an absolute instant ([WWDC25 230](https://developer.apple.com/videos/play/wwdc2025/230/)). Below iOS 26: local notification, sound ≤30 s, cap of 64 pending ([Dev Forums 811171](https://developer.apple.com/forums/thread/811171)) | One DATE-trigger local notification, `timeSensitive`, no entitlement configured; AlarmKit adapter throws "not implemented" ([alarmDevice.ts:102-117](../syncworld-app/src/shared/lib/alarms/alarmDevice.ts), [alarms.adapter.ts:22](../syncworld-app/src/shared/lib/alarms/alarms.adapter.ts)) | Native AlarmKit module + fallback | **Blocker** |
| Android alarm | `setAlarmClock()` ("never adjusts… leaves low-power modes"), exact-alarm permission, full-screen intent, re-register on `BOOT_COMPLETED` ([Android](https://developer.android.com/training/scheduling/alarms)); `POST_NOTIFICATIONS` on 13+ | MAX-importance channel with `bypassDnd`, but no exact alarm, FSI, boot receiver or manifest permissions ([app.json:31-54](../syncworld-app/app.json)) | Native module + config plugin | **Blocker** |
| App Check / abuse | RNFB App Check (App Attest / Play Integrity / reCAPTCHA Enterprise); RNFB v26 needs New Arch + dev build ([RNFB](https://rnfirebase.io/app-check/usage)) | Callables enforce it but client sends none ("will reject every real client"); AI (Gemini) callables skip it; socket server warn-only ([PRODUCTION_READINESS.md:30](../syncworld-backend/PRODUCTION_READINESS.md)) | Client integration; add to AI callables | **Blocker** |
| Environments | Separate Firebase project per environment ([Firebase](https://firebase.google.com/docs/projects/dev-workflows/general-best-practices)) | Only `syncworld-dev`; deploy secrets absent; rollback never rehearsed ([.firebaserc](../syncworld-backend/.firebaserc)) | Staging + prod projects, CI secrets | **Blocker** |
| Account deletion | In-app deletion (Apple 5.1.1(v)); Play also needs a public web deletion URL in Data safety ([Apple](https://developer.apple.com/app-store/review/guidelines/), [Play](https://support.google.com/googleplay/android-developer/answer/13327111)) | None; account page shows placeholder `you@example.com` | Delete callable + web page | **Blocker** (store) |
| UGC moderation | Filter, report, block, published contact (Apple 1.2); Play UGC policy similar (unverified, page 404'd) | Room/display names are UGC; "No blocked users" is static text; no backend support | Report/block/filter + contact | **Blocker** (store) |
| Privacy & legal | Privacy policy in-app + metadata (5.1.1(i)); privacy manifests (ITMS-91053) ([Forums 748765](https://developer.apple.com/forums/thread/748765)); Data safety; terms for UGC | No policy, no terms, no `privacyManifests` | Write + wire up | **Blocker** (store) |
| Age rating | New questionnaire incl. social-media questions (required since Sept 2026, [PocketGamer](https://www.pocketgamer.biz/apple-updates-app-store-age-rating-questionnaire-with-social-media-questions/)); new descriptors due by Jan 12, 2027 ([Apple](https://developer.apple.com/news/?id=yxkh08us)) | Not started | Answer honestly; set a 13+ minimum to stay out of COPPA scope | Before launch |
| Review access | Demo account + live backend for App Review (2.1) | Demo mode exists but needs Apple's prior approval to stand in for an account | Reviewer room + test-alarm path | Before launch |
| Expo SDK | SDK 58 current (Oct 21, 2026); new Expo Go supports only SDK 58 ([Expo](https://expo.dev/blog/how-to-upgrade-to-sdk-58)) | SDK 54 / RN 0.81, four SDKs behind | Upgrade one SDK at a time (54→58) | Before launch |
| Play onboarding | Target API 36 for new apps since Aug 31, 2026 ([Play](https://support.google.com/googleplay/android-developer/answer/11926878)); new personal accounts need 12 testers × 14 days ([Play](https://support.google.com/googleplay/android-developer/answer/14151465)); exact-alarm/FSI declarations | No Play account setup noted | Start closed test early; SDK 54's target API not verified | Before launch |
| Crash/analytics | `@sentry/react-native` (sentry-expo deprecated) ([Sentry](https://docs.sentry.io/platforms/react-native/guides/expo/)); disclose SDKs in privacy label | Sentry on backend only; nothing in app | Add app Sentry + minimal funnel analytics | Before launch |
| Testing & CI | Unit + emulator integration + E2E on critical flows | ~35 app / ~64 backend tests, rules tests, PR security gate; no E2E, no app-build CI ([security-gate.yml](../.github/workflows/security-gate.yml)) | Maestro/Playwright for create→join→vote→arm; EAS in CI | Before launch |
| Ops | PITR (7-day, off by default) ([Firebase](https://firebase.google.com/docs/firestore/pitr)), budget + error alerts | No backup, no alerts, no Redis fallback | Turn on PITR, set budget alerts | Before launch |
| Web alarm | Browsers can't ring a true alarm; iOS web push only for Home Screen apps ([OneSignal](https://documentation.onesignal.com/docs/web-push-for-ios)); manifest needed | `setTimeout` in tab; VAPID key missing; no `manifest.json` | Label web as "best effort"; add VAPID + manifest | Before launch |
| Accessibility | WCAG 2.2 AA in practice: 4.5:1 contrast, a non-drag alternative (2.5.7), 24px targets ([W3C](https://www.w3.org/TR/WCAG22/), not fetched) | 77 a11y props; reduced motion honoured for GL; scrubber keyboard support; contrast over sky/glass unchecked | Scrims, Reduce Transparency, slot labels | Before launch |
| Performance | Always-on GL on low-end Android | Unverified on any device ([current-status.md:72](../syncworld-app/notes/current-status.md)) | Device profiling; pause GL off-screen | Before launch |
| Accounts | Anonymous → `linkWithCredential` upgrade ([Firebase](https://firebase.google.com/docs/auth/web/anonymous-auth)); offering Google sign-in also requires an equivalent privacy-preserving option, which in practice means Sign in with Apple (4.8) | Anonymous only; signing out loses rooms; auth stubs unused | Linking + anon cleanup | Later (anonymous use is allowed under 5.1.1(v)) |
| Offline | JS SDK on RN = memory cache only ([#7947](https://github.com/firebase/firebase-js-sdk/issues/7947)) | JS SDK everywhere | Split RNFB native / JS web | Later (needed anyway for App Check) |
| i18n | expo-localization + i18next; DST-safe UTC math | English-only, hard-coded strings | Pull strings out of the code early | Later |
| Code hygiene | — | ~77 TODOs in a dead scaffold; 5 adapters that throw; stale `DESIGN.md` | Delete/realign | Later |

## Phased plan

**Phase 1: make it installable and make it ring (blockers).** Create the EAS project, `eas.json` (development, preview and production profiles), bundle IDs and signing, and move the team to dev builds. Upgrade from SDK 54 to 58 one SDK at a time, with `expo-doctor` at each step. Do it before writing native code, because SDK 58 changes how iOS apps are set up at launch (scene lifecycle), and that affects custom native modules. Build one native alarm module behind the existing `SyncBackend`/adapter seam. On iOS, use AlarmKit `fixed(date)`, and fall back to a time-sensitive notification on iOS < 26. On Android, use `setAlarmClock` + `SCHEDULE_EXACT_ALARM` with an explainer screen, a full-screen intent, a `BOOT_COMPLETED` receiver and rescheduling on permission or time changes. Candidates: `react-native-alarm-scheduler` (both platforms) or a custom Expo module. Community AlarmKit wrappers are early (e.g. `expo-alarm-kit` v0.1.6), and their maintenance status is unverified ([pkgstats](https://www.pkgstats.com/pkg:react-native-alarm-scheduler)). Keep push only for delivering the schedule and as a backstop, never as the ring itself: Expo Push is "best effort" ([Expo FAQ](https://docs.expo.dev/push-notifications/faq/)), and `fireAlarms` runs only once a minute. Add RNFB App Check (native) and reCAPTCHA Enterprise (web): run it in monitor mode first, then enforce, and add it to the AI callables. Stand up staging and prod Firebase projects and run the live flow on real iOS and Android phones.

**Phase 2: store-ready.** Add an in-app "Delete my data" callable plus a static web deletion page. Add report and block for users and rooms, a name filter and a contact address. Publish a privacy policy and terms and link them in-app. Fill in `ios.privacyManifests`, App Privacy and Data safety. Answer the age questionnaire with a 13+ minimum. Prepare the App Review demo room and a fast test-alarm path. Submit the Play exact-alarm/FSI declarations, and start the 12-tester, 14-day closed test early because it takes about three weeks. Add `@sentry/react-native`, Maestro E2E for create→join→vote→arm, EAS builds in CI, PITR and budget alerts. Do an accessibility pass: contrast scrims over the sky, opaque surfaces under Reduce Transparency, and full date/time/zone labels on the scrubber. Profile the GL layer on low-end Android. On web, set the VAPID key, add a manifest, and state clearly that web alarms are best effort.

**Phase 3: growth.** Add account linking (if Google sign-in is added, add Sign in with Apple too), invite links with deferred deep links, .ics export and share cards. Add "armed / rang" receipts per member, an awake-hours overlap band on the timeline, i18n for 2–3 launch markets, and freemium via RevenueCat. Never paywall the alarm itself, and enroll in Apple's Small Business Program for 15% fees ([Adapty](https://adapty.io/blog/markdown/app-store-small-business-program.md)).

## Competitor positioning

Poll tools (Doodle, Rallly, When2meet, Timeful) have commoditized "everyone sees their own time zone, vote by link, no account". None of them uses unanimous veto, and none ends in an alarm. Doodle even paused its mobile apps in June 2025 ([Doodle](https://doodle.com/en/doodle-mobile-app-change/)). Time-zone tools (World Time Buddy and similar) made the per-zone hour rows and slider pattern familiar, and SyncWorld's 48-hour scrubber builds on that pattern ([App Store](https://apps.apple.com/us/app/id719765848)). The direct threat is **Galarm**: group alarms that ring "at the same time for all participants" across time zones, on iOS, Android and web, priced $0.99/mo, $9.99/yr or $24.99 lifetime, rated 4.7★ from about 4.6K ratings, and claiming 6M+ downloads. Its top complaints are alarms that don't fire, alarms marked acknowledged before they ring, ads and slow support ([App Store](https://apps.apple.com/app/id1187849174)). Galarm's recent move toward on-call/B2B alerting suggests consumer group alarms alone monetize weakly. SyncWorld's defensible position combines three things: **choosing the moment by consent** (the cross-zone timeline plus veto), **reliability users can see** (armed and rang receipts that answer Galarm's top complaint) and **a native-first experience** where Doodle has pulled back. Natural use cases are gaming raid starts (Discord users patch this together with bots and timestamps, per [peakbot](https://peakbot.pro/blog/best-discord-event-bots-2026)), long-distance family moments and launch countdowns. A web vote-only path stops one person without the app from blocking a unanimous vote.

## Key risks

**App Review may object to AlarmKit for a non-alarm-clock app.** Apple frames AlarmKit around wake-up alarms and timers. No guideline addresses social use (unverified either way), so make the alarm explicit and user-initiated. **Play policy restricts `USE_EXACT_ALARM` and FSI auto-grant** to apps whose core function is alarms or calls ([Play](https://support.google.com/googleplay/android-developer/answer/9888170)). `SCHEDULE_EXACT_ALARM` is denied by default on Android 14+ fresh installs, so expect permission drop-off, and OEM battery killers (Xiaomi, Samsung) still add risk ([dontkillmyapp](https://dontkillmyapp.com/samsung?app=Truple)). **AlarmKit has reported edge-case failures**, such as alarms firing late or not at all when many are scheduled close together on locked devices. These are single, unconfirmed reports ([Forums 825427](https://developer.apple.com/forums/thread/825427)). **iOS < 26 can't ring through Silent mode**, and Critical Alerts are very unlikely to be granted. **Unanimous veto deadlocks larger groups.** **Upgrade churn**: the jump from SDK 54 to 58 plus RNFB's New Architecture requirement is non-trivial. **Cost exposure**: the Gemini callables have no App Check, and Blaze has no hard spending cap.

**Unverified items to check before planning commitments:** whether SDK 54 meets Play's API 36 target; whether expo-notifications sets the time-sensitive entitlement or supports FSI or `setAlarmClock`; whether SDK 58 Expo Go has shipped to the stores; the current Play UGC policy text; whether a social-media "yes" forces a 13+ rating (secondary sources only); Galarm's download figures (self-reported); and the maintenance status of each AlarmKit wrapper. Repo facts come from a static audit on 2026-11-14 (branch `feat/frontend-integration`, HEAD `68959a9`). Tests and lint were not re-run during the audit.

## Conclusion

The gap between "works in two browser tabs" and "rings on every phone" is mostly native work and policy work, not product work. That makes reliability both the main engineering risk and the main way to compete. If SyncWorld can show each member that their device is armed and later prove it rang, it answers the main complaint against the leading competitor. Phase 1 should be judged on one number: the share of members' devices that actually rang at the moment, on real iOS and Android phones.

---

## Addendum (2026-11-15): features, polish and Google sign-in

This builds on the phased plan above. It doesn't replace it: the native alarm and the build setup still come first.

### Done in this pass
- **Add to calendar** on the Armed screen, with three options: Google, Outlook, and Other (.ics). The .ics option covers Apple Calendar, Outlook desktop, Proton, Thunderbird and others. No sign-in is needed.
  - The event has the room name and code. The invite link is left out for now, because `sync.app` is a placeholder domain.
  - Only the .ics file carries a reminder at the moment, and Apple Calendar honours it. Google may drop it on import, and the Google and Outlook links use the user's default reminders.
  - The code is in `syncworld-app/src/shared/lib/calendar/`, with 8 tests covering UTC `Z` times, escaping, 75-octet folding and CRLF.
  - Verified in the browser: the Google link and the downloaded .ics file are correct.
  - **Not tested on a device:** the native .ics share sheet (`expo-file-system` plus `expo-sharing`). Some Android calendar apps may not accept a shared `text/calendar` file.
- **Light/dark choice now persists.** Before this, it reset to dark on every reload or app restart. One leftover: the saved choice loads just after the first frame, so light-mode users may see a brief dark flash at launch. The fix is to hold the splash screen until settings have loaded.
- **Polish done:** P2, P3, P4, P5 and P7 below. P1 and P6 are still open.

### Polish list, from screenshots at 390 px and 1440 px in dark and light
| # | Where | Problem | Fix |
|---|---|---|---|
| P1 | Create/Join sheet | Flat grey `surfaceElevated` panel, the only opaque surface in the app | Glass sheet with a grab handle. The header fade also needs to blend into the glass, which is why it wasn't changed yet. |
| P2 | Room header | "6 members · Finding a time" sits against the header band's bottom edge | Give the subtitle 8 px clear of the band, or move it inside the band |
| P3 | Scrubber member chips | Times use the text font, but times everywhere else use Geist Mono | Use `monoFont` |
| P4 | Settings rows | "Permissions, blocked users" and "Storage & Data" wrap onto two lines | Keep values to one line and shorten them |
| P5 | Section labels on the sky ("MEMBERS ARMING", "Members · 6") | Low contrast over a moving background | Use `textSecondary` and a small text shadow on the sky |
| P6 | Icons | Ionicons in the app, Phosphor in Figma | Move to `phosphor-react-native` in a single pass |
| P7 | Tab bar | Upper-case 10 px labels are hard to read | Sentence case at 11 px, keeping the gold active state |

### Google sign-in, meeting links and calendars
Two layers. Everyone gets the first. Only users who sign in with Google get the second.

1. **Works for everyone, no sign-in.** Add to calendar (done). Next, a meeting-link field on a locked room where anyone can paste a Meet, Zoom, Teams or Discord link. It's stored by a new `attachMeeting` callable (host only, `https:` links only), because room fields can only be written by the server. The link then goes into the calendar event, and the Ringing screen shows a "Join call" button.
2. **Google-linked accounts.**
   - **Link, don't sign in fresh.** Upgrade the anonymous user with `linkWithPopup` on web and `linkWithCredential` on native. A fresh sign-in would create a new uid and orphan the user's room memberships.
   - At consensus, the host's device creates the Google Calendar event for everyone, with `conferenceDataVersion=1` and `conferenceData.createRequest` so a Meet link is generated. It adds members as guests if they've shared an email. This has to run on the device, because Firebase's Google access token is short-lived and comes with no refresh token.
   - Later: Google free/busy to grey out busy hours on the scrubber (Timeful does this). It needs the `calendar.freebusy` scope.

What you'll need to set up yourself:
- a Google Cloud OAuth client (web, iOS and Android) and a consent screen
- Google turned on in Firebase Auth
- a `GOOGLE_SIGN_IN` feature flag, so the app keeps working without them

Risks to check before committing:
- `calendar.events` is probably a sensitive scope. Production would then need Google's OAuth verification, and test mode caps the number of users.
- Offering Google login on iOS probably triggers App Store guideline 4.8, which requires Sign in with Apple as well.
- Native Google sign-in needs a development build. Web works today.

### New features, checked against the competitor notes
| Feature | Why it's uncommon | Size |
|---|---|---|
| **Armed and rang receipts.** Each device reports "scheduled with the OS" and later "rang at 05:00:02", so the room sees 5 of 6 rang. | Nobody shows proof. "Didn't ring" is Galarm's top complaint. | M |
| **Fairness ledger.** The room remembers who took the 3 AM slots. The scrubber says "Kenji had the last 3 late slots" and leans toward his daytime. | Poll tools and alarm apps don't keep a history of who lost sleep. | M |
| **Veto with a counter-offer.** "No, but +1 h works" puts a ghost marker on the scrubber. | Poll tools only offer yes or no, and a single veto stalls bigger groups (a risk noted above). | S |
| **Alarm opens the call.** Ringing screen, then one tap into the Meet, Zoom or Discord link attached to the room. | Alarm apps and meeting apps are separate. weWake comes closest, but only for phone calls. | S, after the meeting link |
| **Travel mode.** "I'm in Tokyo 20–27 Nov" changes your lane for those dates only. | World-clock apps use the device's time zone, and none of them handle a future trip. | M |
| **Discord timestamp export.** Copies `<t:1794806100:F>`, which renders in each viewer's local time. | Gaming groups use this format, and none of the tools above produce it. | S |
| **Calendar reminder at the moment.** Done for .ics imports such as Apple Calendar. | It adds a second reminder through the OS calendar. | Done |

### Functionality gaps that block the features above
- The live backend still needs App Check tokens and staging/production projects (gap table above).
- Account deletion is needed once Google linking exists.
- Deep links (`syncworld://join/{code}`) so the invite URL in calendar events opens the app.
- The invite link domain `sync.app` is a placeholder. A real domain is needed before invite links go into anyone's calendar.

### Suggested order
1. P1–P5 polish.
2. Meeting-link field and "Join call" on ringing.
3. Veto with counter-offer.
4. Google linking and Calendar plus Meet (web first).
5. Receipts and the fairness ledger, once the native alarm module exists.
