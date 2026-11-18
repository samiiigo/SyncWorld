# Store Compliance & Product-Quality Layers for SyncWorld (as of 2026-11-14)

Context: SyncWorld is a cross-platform (iOS, Android, web/PWA) social coordination app. Users create rooms, invite others by code/link, vote on one time across time zones, and every device rings an alarm. Legend: **MUST** = rejection/removal risk; **SHOULD** = strongly recommended. Items marked [verified] were fetched or searched in this session. Items marked [unverified] come from background knowledge with a canonical URL that was not re-fetched; check them before relying on them.

## App Store (Apple) requirements

### Takeaway
SyncWorld is a UGC/social app, so App Review requires the full moderation kit (filter, report, block, contact info), in-app account deletion, a privacy policy in-app and in metadata, a demo account, and an honest age-rating questionnaire. The questionnaire now includes social-media questions (mandatory since Sept 2026) and a "Shared Location" descriptor (from Nov 16, 2026, all apps by Jan 12, 2027). For alarms, iOS 26's AlarmKit is the sanctioned way to break through Silent/Focus. Critical Alerts entitlement is not appropriate.

### Cited Findings
**Minimum functionality (4.2), MUST**
- "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store." [verified] [App Review Guidelines 4.2](https://developer.apple.com/app-store/review/guidelines/)
  - Implication: a WebView wrapper of the PWA is a rejection risk. Native alarms, push, widgets and AlarmKit are the "app-like" differentiators.

**User-generated content (1.2), MUST**
- UGC/social apps must include: "A method for filtering objectionable material from being posted to the app; A mechanism to report offensive content and timely responses to concerns; The ability to block abusive users from the service; Published contact information so users can easily reach you." [verified] [Guideline 1.2](https://developer.apple.com/app-store/review/guidelines/)
- Apps used primarily for "random or anonymous chat", "Chatroulette-style experiences", bullying, and similar uses "may be removed without notice." [verified] [Guideline 1.2](https://developer.apple.com/app-store/review/guidelines/)
  - Implication: room names, display names, any chat or comments and avatars count as UGC. Join-by-code into a room of strangers can look like anonymous chat if public rooms exist.
- 4.7.1 applies the same filter/report/block requirements to chatbots and other software offered in apps. [verified] [Guideline 4.7.1](https://developer.apple.com/app-store/review/guidelines/)

**Demo account (2.1), MUST**
- "include demo account info (and turn on your back-end service!) if your app includes a login." A built-in demo mode may replace it, but only with prior Apple approval. Crashing or incomplete binaries are rejected. [verified] [Guideline 2.1](https://developer.apple.com/app-store/review/guidelines/)
  - Implication: the reviewer needs a pre-populated room plus a second account or device to see voting and alarm behavior. Notes should explain how to trigger a test alarm quickly.

**Account deletion (5.1.1(v)), MUST**
- "If your app supports account creation, you must also offer account deletion within the app." Apps should let people use the app without a login if it doesn't include "significant account-based features." Apps "may not require users to enter personal information to function, except when directly relevant to the core functionality." [verified] [Guideline 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/)
- If Sign in with Apple is used, deleting the account should also revoke the SIWA token via the REST API. [unverified] [Apple: offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

**Sign in with Apple / Login services (4.8), MUST if third-party social login is offered**
- If an app uses third-party/social login (Google, Facebook, etc.) for the primary account, it "must also offer as an equivalent option another login service" that (a) limits data collection to name and email, (b) lets users keep their email private, and (c) doesn't collect interactions for advertising without consent. Exempt: apps using only the company's own account system, among other cases. [verified] [Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/)
- The current 4.8 text does not name Sign in with Apple explicitly. SIWA is the de facto compliant option, but any equivalent service meeting the three criteria qualifies. [verified] [Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/); [ptkd.com 4.8 analysis](https://ptkd.com/app-store/guidelines/4-8)
  - Implication: if SyncWorld offers "Continue with Google", it must also offer SIWA (simplest). If it offers only email, phone or anonymous accounts, SIWA is not required.

**Privacy policy (5.1.1(i)), MUST**
- All apps need a privacy policy link in App Store Connect metadata and within the app. It must identify the data collected, how it is collected, and all uses. It must confirm that third parties (analytics, SDKs) provide equal protection, and it must explain retention/deletion and how to revoke consent or request deletion. [verified] [Guideline 5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/)

**Push notifications (4.5.4), MUST**
- "Push Notifications must not be required for the app to function." They should not carry sensitive personal information. Marketing pushes require explicit in-app opt-in consent plus an in-app opt-out. [verified] [Guideline 4.5.4](https://developer.apple.com/app-store/review/guidelines/)
  - Implication: SyncWorld must still function (show agreed time, in-app countdown) if the user denies notifications. Request permission in context, not on first launch.

**Alarms: AlarmKit (iOS 26+), SHOULD (the sanctioned route)**
- AlarmKit (iOS 26) lets third-party apps schedule alarms that "override both a device's focus and silent mode." It requires user authorization (prompted automatically on first alarm or manually) and the `NSAlarmKitUsageDescription` Info.plist key. Users can revoke it in Settings. Without authorization, alarms are not scheduled. [verified] [Apple: Scheduling an alarm with AlarmKit](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit.md); [WWDC25 session 230 notes](https://wwdcnotes.com/documentation/wwdc25-230-wake-up-to-the-alarmkit-api/); [MacRumors](https://www.macrumors.com/2025/06/11/ios-26-third-party-alarm-apps/)
- Reliability caveat: a developer forum report says densely scheduled AlarmKit alarms on a locked iOS 26.x device sometimes fire late or not at all. This is an unconfirmed single report. [verified as existing] [Apple Developer Forums thread 825427](https://developer.apple.com/forums/thread/825427)
- Critical Alerts entitlement (bypasses mute without AlarmKit) is granted by Apple on request only for health, medical, home-security and public-safety use cases. A social alarm app would very likely be denied. [unverified] [Apple: Critical Alerts entitlement request](https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/)
- Pre-iOS-26 fallback: local notifications with custom sound (max 30 s) respect the Silent switch. Time Sensitive interruption level can break through Focus if the user allows it. [unverified] [UNNotificationInterruptionLevel](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel)

**Age rating questionnaire, MUST (2025–2027 changes)**
- Apple moved to 4+, 9+, 13+, 16+, 18+ tiers and added required questionnaire questions. The original deadline for answers was Jan 31, 2026 (now past). [verified] [AppleInsider, Jul 2025](https://appleinsider.com/articles/25/07/25/app-store-developers-must-now-provide-age-rating-details); [9to5Mac](https://9to5mac.com/?p=1011484)
- New social-media capability questions: "the ability to redistribute, amplify or interact with user-generated content through a social feed or similar discovery method." Answers have been required for new apps and updates since September 2026. A secondary source says "yes" forces a 13+ minimum. [secondary] [PocketGamer.biz](https://www.pocketgamer.biz/apple-updates-app-store-age-rating-questionnaire-with-social-media-questions/); [ppc.land](https://ppc.land/apple-forces-13-rating-on-apps-with-social-feeds-from-september/); [DEV/ecorpit](https://ecorpit.com/app-store-age-rating-social-media-questions-september-2026/)
- Apple news (Nov 2, 2026): "Starting November 16, 2026, App Store Connect will include new content descriptors." These include **Shared Location** ("Sharing of real-world location with another person or group") and Dating and Relationships (forces 18+). The declarations are due with the next update/questionnaire change, and "All apps must have these declarations completed by January 12, 2027." In Brazil, Shared Location requires an A16 rating. [verified] [Apple Developer News](https://developer.apple.com/news/?id=yxkh08us)
  - Implication: sharing a time zone or city label is probably not "real-world location". If SyncWorld shows a member's city or GPS-derived location to the room, it should declare Shared Location (A16 in Brazil).
- 2.3.6: answer age questions honestly, because mis-rating can trigger regulator inquiries. 2.3.8: icons and screenshots must be 4+ appropriate. [verified] [Guidelines 2.3.6/2.3.8](https://developer.apple.com/app-store/review/guidelines/)
- Australia and Vietnam regional ratings changes took effect June 18, 2026. [secondary, search summary] [igeeksblog](https://www.igeeksblog.com/apple-app-store-age-ratings/)

**Privacy nutrition labels & privacy manifests, MUST**
- Missing required-reason API declarations trigger ITMS-91053 "Missing API declaration". Submissions not meeting this have been rejected since May 1, 2024. Common culprit: `NSPrivacyAccessedAPICategoryUserDefaults` (reason CA92.1), often pulled in by libraries. Third-party SDKs must ship their own manifests. [verified] [Apple Developer Forums 748765](https://developer.apple.com/forums/thread/748765); [Donny Wals](https://www.donnywals.com/how-to-add-a-privacy-manifest-file-to-your-app-for-required-reason-api-usage/)
- Expo: declare reasons under `expo.ios.privacyManifests` in app.json. Prebuild writes `PrivacyInfo.xcprivacy`. [secondary] [ptkd.com Expo guide](https://ptkd.com/journal/how-to-use-required-reason-api-for-userdefaults-in-expo)
- App Privacy "nutrition label" answers in App Store Connect are required for all apps and must cover third-party SDK collection (analytics, crash reporting, RevenueCat). [unverified] [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)

**Accessibility Nutrition Labels, SHOULD (optional)**
- These are optional disclosures shown on iOS 26+ store pages. To claim a feature (VoiceOver, Larger Text, Reduced Motion, Sufficient Contrast, etc.), users must be able to "complete all of the common tasks of your app using that feature." [verified] [App Store Connect Help](https://developer-mdn.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels)

**In-app purchase (3.1.1), MUST if selling digital features**
- Unlocking features or subscriptions requires IAP. License keys, QR codes and similar unlocks are not allowed. Provide a restore mechanism. [verified] [Guideline 3.1.1](https://developer.apple.com/app-store/review/guidelines/)
- Apple is proposing up to 15% fees on link-outs (Aug 2026 report). US anti-steering rules have been in flux since the Epic injunction. [secondary] [MacRumors Aug 13, 2026](https://www.macrumors.com/2026/08/13/app-store-fees-apple-link-outs/)

**Developer program cost**
- Apple Developer Program costs USD 99/year (individual or organization). Organizations need a D-U-N-S number. [unverified] [Apple Developer: enrollment](https://developer.apple.com/programs/enroll/)

### Inferences
- The biggest Apple rejection risks for SyncWorld are: 1.2 (no report/block UI on rooms or users), 5.1.1(v) (no in-app delete), 2.1 (reviewer can't exercise multi-user voting or alarm without a second account), 4.2 (if the iOS app is a thin wrapper of the web app), and 4.8 (Google login without SIWA).
- AlarmKit is the right primary iOS alarm path on iOS 26+. Older iOS gets a notification-based alarm that respects Silent mode, and the UI should say so.

### Gaps
- I could not confirm from Apple's primary documentation that answering "yes" to social-media capability forces 13+. That claim comes only from secondary sources.
- The "last updated" date of the App Review Guidelines was not captured (page truncated).
- The 2026 Apple Developer Program fee was not re-verified (assumed still USD 99).

## Google Play requirements

### Takeaway
New apps must target API 36 (Android 16) since Aug 31, 2026. New personal developer accounts must run a 12-tester, 14-day closed test before production. Account deletion requires both an in-app path and a web URL declared in Data safety. USE_EXACT_ALARM and USE_FULL_SCREEN_INTENT are restricted to apps whose core function is an alarm or calling, and both need Play Console declarations. Developer verification is enforced in 4 countries from Sept 30, 2026 and goes global in 2027.

### Cited Findings
**Target API level, MUST**
- New apps and updates must target Android 16 (API 36) or higher from August 31, 2026. Existing apps must target API 35+ to remain available to new users on newer OS versions. [verified] [Google Play target API policy](https://support.google.com/googleplay/android-developer/answer/11926878); [Android dev: target-sdk](https://developer.android.com/google/play/requirements/target-sdk)
- One source (cmarix) claims an extension to Nov 1, 2026. I found no official confirmation. [conflict noted]

**Closed testing for new personal accounts, MUST**
- Personal developer accounts created after Nov 13, 2023 must run a closed test with at least 12 testers opted in continuously for at least 14 days before applying for production access. Organization accounts are reportedly exempt. [verified] [Play Console Help 14151465](https://support.google.com/googleplay/android-developer/answer/14151465); [RevenueCat blog](https://www.revenuecat.com/blog/engineering/google-play-14-day/)
- Organization accounts need a D-U-N-S number, which a third-party estimate says can take up to about 30 days. [secondary] [Choicely](https://www.choicely.com/blog/google-play-12-tester-rule)
- Play Console registration fee is a one-time USD 25. [unverified] [Play Console Help: registration](https://support.google.com/googleplay/android-developer/answer/6112435)

**Developer verification, MUST (for distribution on certified devices)**
- From Sept 30, 2026, only apps from verified developers can be installed or updated on certified Android devices in Brazil, Indonesia, Singapore and Thailand. Global rollout follows in 2027 (no date set). Limited-distribution accounts for hobbyists launched in August 2026. ADB and an "advanced flow" still allow unverified installs. [verified, press] [The Hacker News, Jun 2026](https://thehackernews.com/2026/06/google-sets-sept-30-deadline-for.html); [Android Authority timeline](https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/)
  - Play-distributed apps from accounts that completed Play Console identity verification are generally covered. [inference]

**Account deletion, MUST**
- If users can create an account in the app, they must be able to request deletion of the account and associated data from within the app. Apps must also provide a web link where users can request deletion without reinstalling. The link must name the app or developer as on the listing. The link goes in the Data safety form's data-deletion questions, and unresolved answers can block submissions. Retention for security, fraud or legal reasons must be disclosed. Enforcement has applied since May 31, 2024. [verified] [Play Console Help 13327111](https://support.google.com/googleplay/android-developer/answer/13327111)

**Data safety form, MUST**
- All apps must complete Data safety, including third-party SDK collection, encryption in transit and deletion. This is the same form as above. [verified] [Play Console Help 13327111](https://support.google.com/googleplay/android-developer/answer/13327111)

**Exact alarm permissions, MUST declare correctly**
- On Android 12+ (target), exact alarms need "Alarms & reminders" access. On Android 13+ (target) you may declare `SCHEDULE_EXACT_ALARM` (user-granted, revocable, not pre-granted on fresh installs targeting 33+) or `USE_EXACT_ALARM` (auto-granted, non-revocable, "limited use cases", subject to Play policy). Check `canScheduleExactAlarms()` and listen for `ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED`. `setAlarmClock()` is never delayed and leaves low-power modes. Alarms are cleared on reboot, so re-register them on `BOOT_COMPLETED`. [verified] [Android dev: Schedule alarms](https://developer.android.com/develop/background-work/services/alarms/schedule)
- Play policy: declare these only if core functionality requires exact alarms. `USE_EXACT_ALARM` is for alarm clock/timer apps and calendar apps. Others should use `SCHEDULE_EXACT_ALARM`. Non-qualifying apps declaring `USE_EXACT_ALARM` "will not be permitted." The declaration is in Play Console > App content > Sensitive app permissions. [verified] [Google Play policy announcement Jul 27, 2022](https://support.google.com/googleplay/android-developer/answer/14554661) (older requirement, still in force)
  - Implication: SyncWorld's "every device rings an alarm" is arguably core alarm functionality, but it is a social coordination app first. `SCHEDULE_EXACT_ALARM` plus an in-app rationale screen is the lower-risk choice. `USE_EXACT_ALARM` invites a policy dispute.

**Full-screen intent, MUST declare**
- Apps using `USE_FULL_SCREEN_INTENT` must complete a Play Console declaration (since May 31, 2024). From Jan 22, 2025, for apps targeting Android 14+, only calling and alarm apps get it by default. Others must prompt users and degrade gracefully. Check with `NotificationManager.canUseFullScreenIntent()`. [verified] [Play Console Help 13392821](https://support.google.com/googleplay/android-developer/answer/13392821); [AOSP FSI limits](https://source.android.com/docs/core/permissions/fsi-limits)
- Foreground service types must be declared in Play Console for apps targeting Android 14+. Geofencing is being removed as an approved FGS use case (deadline listed as Jan 27, 2027). [verified] [Play Console Help 16965181](https://support.google.com/googleplay/android-developer/answer/16965181)

**Notifications permission, MUST handle**
- Android 13+ needs the runtime `POST_NOTIFICATIONS` permission. Without it, alarm notifications are silent or hidden. [unverified] [Android dev: notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)

**UGC policy, MUST**
- Play's UGC policy requires: terms/user policies accepted before users create or upload UGC; robust, effective, ongoing moderation; an in-app system for reporting objectionable UGC and users; and blocking. [unverified, the fetch 404'd] [Play Policy Center: User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937)

### Inferences
- Android alarm reliability stack: `setAlarmClock()` + `SCHEDULE_EXACT_ALARM` (rationale screen to "Alarms & reminders") + full-screen intent (prompt if not auto-granted) + high-importance notification channel + `BOOT_COMPLETED` re-registration + server push (FCM high priority) as backup.
- Budget about 3 weeks for the closed test on a new personal account, or register as an organization.

### Gaps
- The current Play UGC policy page was not retrieved (404 at the tried URL). Requirements above are from background knowledge.
- No official confirmation of the API 36 extension date (cmarix claim).
- The current text of the exact-alarm Play policy (vs 2022 announcement) was not fetched.

## Privacy & legal

### Takeaway
A privacy policy, terms of use (needed for UGC), in-app and web account deletion and disclosed retention are store-mandated. GDPR and CCPA apply based on users, not company location. Time zone plus account data is personal data. Children under 13 trigger COPPA, so set an age gate or a 13+ minimum.

### Cited Findings
- Apple requires the privacy policy to cover collection, uses, third-party sharing protections, retention/deletion, and consent revocation. [verified] [Guideline 5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/)
- Google requires disclosing retention reasons (security, fraud, legal) and deletion of all data declared in Data safety, including asking service providers to delete. [verified] [Play Console Help 13327111](https://support.google.com/googleplay/android-developer/answer/13327111)
- GDPR: "personal data" is any information relating to an identified or identifiable person, including "location data" and online identifiers (Art. 4(1)). Lawful basis (Art. 6), storage limitation (Art. 5(1)(e)), right to erasure (Art. 17), and data portability (Art. 20) apply. [unverified] [GDPR Art. 4](https://gdpr-info.eu/art-4-gdpr/); [Art. 5](https://gdpr-info.eu/art-5-gdpr/)
- CCPA/CPRA treats "precise geolocation" (within 1,850 ft) as sensitive personal information. A coarse time zone is not precise geolocation, but it is still personal information. CCPA thresholds include USD 25M+ revenue (adjusted) or 100k+ consumers. [unverified] [California AG CCPA](https://oag.ca.gov/privacy/ccpa)
- COPPA applies to services directed to children under 13 or with actual knowledge of child users. The amended COPPA Rule (finalized Jan 2025, compliance by about April 2026) tightened consent for third-party disclosure and data retention. [unverified] [FTC COPPA Rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
- Apple 5.1.4 (Kids): birthdate and parental contact may be requested only for compliance with these statutes. [verified] [Guideline 5.1.4](https://developer.apple.com/app-store/review/guidelines/)
- Apple's Declared Age Range API (iOS 26) and state app-store age-verification laws (Texas SB2420 effective Jan 1, 2026; Utah) push age signals to developers. [unverified] [Apple Declared Age Range](https://developer.apple.com/documentation/declaredagerange)

### Inferences
- MUST: privacy policy URL (store metadata, in-app, web), terms of use with a UGC conduct section, in-app delete plus a web deletion URL, and a retention schedule. Example: delete rooms N days after event, purge votes, keep minimal abuse logs for X days.
- SHOULD: collect time zone (IANA ID) only, not GPS. Make display names optional and not real-name. Use a 13+ minimum age to avoid COPPA "directed to children" status. Offer data export.

### Gaps
- No 2026 primary-source check on COPPA amendment dates or US state age-verification laws in this session.

## Accessibility

### Takeaway
WCAG 2.2 AA is the de facto standard (and the legal benchmark in the EU via the European Accessibility Act, in force June 28, 2025, and for US public entities under ADA Title II). For SyncWorld, the risk areas are contrast over animated WebGL/glass backgrounds, reduced motion, Dynamic Type at large sizes, and screen-reader labeling of time-slot voting grids.

### Cited Findings
- WCAG 2.2 (W3C Recommendation Oct 2023) adds 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum) of 24×24 CSS px, 3.3.7 Redundant Entry, and 3.3.8 Accessible Authentication (AA). Key AA contrast is 4.5:1 for text and 3:1 for UI components (1.4.3/1.4.11). 2.2.2 Pause, Stop, Hide applies to auto-moving content longer than 5 s. 2.3.3 Animation from Interactions is AAA. [unverified] [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/); [What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- European Accessibility Act obligations apply from June 28, 2025 to e-commerce and certain consumer services. A free social app may be out of scope, but paid features in the EU could bring it in. [unverified] [EU Commission EAA](https://ec.europa.eu/social/main.jsp?catId=1202)
- Apple Accessibility Nutrition Labels (optional) cover VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color, Sufficient Contrast, Reduced Motion, Captions and Audio Descriptions. A claim requires that all common tasks work. [verified] [App Store Connect Help](https://developer-mdn.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels)
- React Native: `AccessibilityInfo.isReduceMotionEnabled()` / `reduceMotionChanged`, `isReduceTransparencyEnabled` (iOS), and `allowFontScaling`/`maxFontSizeMultiplier`. Reanimated has a `useReducedMotion` hook. On web, use `prefers-reduced-motion` and `prefers-reduced-transparency`/`prefers-contrast` media queries. [unverified] [RN AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo); [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

### Inferences
- SHOULD (high priority): when Reduce Motion is on, pause or freeze the WebGL background. When Reduce Transparency is on, replace glass blur with an opaque surface. Guarantee 4.5:1 contrast against the worst frame of the animated background (use a scrim). Make the voting grid operable without drag (2.5.7) with targets of at least 44pt on iOS and 48dp on Android. Label each slot with full date, time and time zone for VoiceOver/TalkBack. Alarms need a non-audio cue (vibration, visual) for deaf and hard-of-hearing users.

### Gaps
- No session-fetched primary source for WCAG 2.2 text or EAA scope. These are from background knowledge.

## Localization / internationalization

### Takeaway
For a time-zone-centric app, correct i18n is core functionality. Use IANA zone IDs and UTC instants, locale-aware formatting (12h/24h), DST-safe math, and RTL support. In React Native/Expo the standard stack is expo-localization + i18next/react-i18next (or Lingui/FormatJS) plus the Intl API (Hermes supports Intl).

### Cited Findings
- `expo-localization` exposes `getLocales()` (languageTag, textDirection, measurement) and `getCalendars()` (timeZone, uses24hourClock, firstWeekday). [unverified] [Expo Localization docs](https://docs.expo.dev/versions/latest/sdk/localization/)
- RN RTL: `I18nManager.forceRTL`/`allowRTL` require an app reload. Expo config supports `extra.supportsRTL`. [unverified] [Expo localization guide](https://docs.expo.dev/guides/localization/)
- Apple App Store and Google Play allow localized store listings per locale. Apple's privacy and age info is not per-locale. [unverified] [App Store Connect localizations](https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information)

### Inferences
- MUST (functional): store the voted slot as a UTC instant plus the creator's IANA zone. Render in each viewer's zone and locale clock. Show the explicit zone abbreviation or offset and the "your time" vs "their time" label. Handle DST transitions between vote and event. Re-sync alarms on device time zone change (Android `ACTION_TIMEZONE_CHANGED`, iOS `NSSystemTimeZoneDidChange`).
- SHOULD: externalize all strings from day one, use ICU plural/select messages, and use a TMS (Crowdin, Lokalise, Tolgee) synced via CI. Ship English plus 2–3 languages matching the launch markets. Pseudo-localize to catch truncation in glass cards.

### Gaps
- No primary sources were fetched this session for RN i18n tooling. The citations above are canonical docs from background knowledge.

## Analytics, product metrics, crash reporting & consent

### Takeaway
Crash reporting (Sentry or Firebase Crashlytics) is effectively mandatory for quality. Product analytics (PostHog, Amplitude, Mixpanel, Firebase) must be declared in the Apple privacy label and Play Data safety. Tracking across apps for ads requires ATT on iOS. GDPR/ePrivacy requires consent for non-essential analytics cookies and identifiers in the EU.

### Cited Findings
- Apple privacy policy rules require disclosure of third-party analytics SDKs and equal protection. [verified] [Guideline 5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/)
- Third-party SDKs must ship their own privacy manifests and required-reason declarations, and missing ones trigger ITMS-91053. [verified] [Apple Forums 748765](https://developer.apple.com/forums/thread/748765)
- App Tracking Transparency is required to track users across other companies' apps and websites (5.1.2). [unverified] [Apple ATT](https://developer.apple.com/documentation/apptrackingtransparency)
- Sentry's React Native SDK supports Expo via `@sentry/react-native` with source maps through EAS. [unverified] [Sentry RN docs](https://docs.sentry.io/platforms/react-native/)

### Inferences
- Suggested north-star and funnel metrics for SyncWorld: room created → invite sent → second member joined → vote completed → alarm delivered and acknowledged on all devices (the "sync success rate"). Track alarm delivery latency per platform and OS version. Track push opt-in and exact-alarm grant rates.
- Privacy-friendly default: self-host or use EU-hosted PostHog. Avoid IDFA/ad SDKs, so ATT is not needed. Show a consent prompt for analytics in the EU and keep crash reporting under legitimate interest with PII scrubbing.

### Gaps
- No session-fetched sources compared analytics vendors or their 2026 pricing.

## Monetization & store fees

### Takeaway
Group utility apps typically use freemium plus subscriptions (larger rooms, recurring rooms, custom alarm sounds, calendar sync), via RevenueCat to unify StoreKit, Play Billing and web (Stripe). Enroll in Apple's Small Business Program (15%), and Google charges 15% on the first USD 1M per year. Ads fit poorly with an alarm and social coordination app and add ATT and consent burden.

### Cited Findings
- Apple Small Business Program: 15% commission (vs 30%) for developers with up to USD 1M proceeds in the prior calendar year. Enrollment is required (not automatic), and associated accounts are counted. [secondary] [Adapty](https://adapty.io/blog/markdown/app-store-small-business-program.md); [Apple program page, unverified](https://developer.apple.com/app-store/small-business-program/)
- Subscriptions: 15% after year one for standard developers, and 15% from day one for Small Business Program members. [secondary] [Adapty](https://adapty.io/blog/markdown/app-store-small-business-program.md)
- Google Play: 15% on the first USD 1M of annual earnings, and 15% on subscriptions. [secondary] [funnelfox](https://blog.funnelfox.com/apple-app-store-fees-2026-eu-dma/); [Google Play service fees, unverified](https://support.google.com/googleplay/android-developer/answer/112622)
- Digital unlocks must use IAP on iOS (3.1.1) with restore support. [verified] [Guideline 3.1.1](https://developer.apple.com/app-store/review/guidelines/)
- Apple is proposing up to 15% fees on external link-outs (Aug 2026). EU and China fee changes apply in 2026. [secondary] [MacRumors](https://www.macrumors.com/2026/08/13/app-store-fees-apple-link-outs/); [ppc.land EU](https://ppc.land/apple-kills-eu-per-install-fee-for-5-commission-on-non-app-store-sales/)
- RevenueCat is free up to a revenue threshold (historically USD 2.5k MTR), then charges a percentage. [unverified] [RevenueCat pricing](https://www.revenuecat.com/pricing/)

### Inferences
- Paywall MUSTs on iOS: show price, period and auto-renew terms, links to Terms and Privacy, and a Restore Purchases button. The core coordination loop should stay free so invitees on any platform can join without paying (network effect).

### Gaps
- Exact Apple Small Business Program eligibility wording (prior-year vs current-year test) conflicts between sources.
- Current RevenueCat pricing was not verified.

## PWA / desktop web

### Takeaway
iOS web push works only for Home-Screen-installed web apps (iOS 16.4+) after a user-gesture permission prompt. iOS 26 opens Home Screen sites as web apps by default. Declarative Web Push is available from iOS 18.4. No web platform can ring a true alarm when the browser or tab is closed or the device is silenced, so the PWA can't guarantee "every device rings."

### Cited Findings
- iOS/iPadOS 16.4+: web push is only available to web apps added to the Home Screen. The permission prompt appears only after a user tap inside the installed app. Safari tabs can't subscribe. [secondary] [OneSignal docs](https://documentation.onesignal.com/docs/web-push-for-ios); [Pushpad](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications)
- Pre-iOS-26 manifest `display` must be `standalone` or `fullscreen` for push. iOS 26 opens Home Screen sites as web apps by default, with an "Open as Web App" toggle. [secondary] [Mobiloud](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- Declarative Web Push is available for Home Screen web apps from iOS 18.4. Keep a service worker for other browsers, since Chrome, Edge and Firefox reportedly don't support it as of Oct 2026. [secondary] [WebKit: Meet Declarative Web Push](https://webkit.org/?p=16535); [Progressier](https://progressier.com/pwa-capabilities/declarative-web-push); [Aimtell](https://aimtell.com/blog/state-of-declarative-web-push-2026)
- The Badging API is supported for Home Screen web apps once notifications are allowed. [secondary] [Mobiloud](https://www.mobiloud.com/blog/pwa-push-notifications)
- Chromium installability needs a web app manifest (name, icons 192/512, start_url, display) served over HTTPS. [unverified] [web.dev: install criteria](https://web.dev/articles/install-criteria)

### Inferences
- Position the web/PWA as desktop participation plus fallback. It covers voting and joining via link, and the alarm is "best effort" (push notification plus in-tab audio and Wake Lock if open). In the UI, steer mobile users to the native apps for guaranteed alarms. Universal Links and Android App Links should open the native app when it is installed and fall back to the web.
- Web audio autoplay requires a prior user gesture, so an open tab can only play the alarm sound if the user interacted earlier. [inference from known autoplay policies; unverified]

### Gaps
- Apple's own WebKit documentation for iOS 26 Home Screen web app behavior was not fetched. Claims rely on vendor blogs.
