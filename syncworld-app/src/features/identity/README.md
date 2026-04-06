# features/identity/

Identity and anonymous session bootstrap.

## Responsibility

Manages the user identity lifecycle: anonymous session creation, auth provider linking, display name assignment, and timezone detection. This is the first step in the core product flow (Identity -> Room Create/Join -> Scrubber -> Vote -> Armed).

## Scope

- Anonymous session auto-creation on cold start
- Firebase Auth state observation
- Auth provider upgrade (anonymous -> Google/Apple)
- Display name persistence
- IANA timezone detection and storage per user
- Session expiry and re-authentication

## Key State Domains

| State Field | Description |
|-------------|-------------|
| `userId` | Branded `UserId` from Firebase Auth UID |
| `sessionId` | Ephemeral session identifier |
| `isAnonymous` | Whether current auth is anonymous |
| `isAuthenticated` | Whether any auth exists |
| `displayName` | User-chosen name for room display |
| `timezone` | Auto-detected or manually set IANATimezone |
| `isBootstrapping` | True during initial auth check |

## Inputs / Outputs

**Inputs:**
- Firebase Auth state change events
- User-provided display name
- Device timezone (via `Intl.DateTimeFormat().resolvedOptions().timeZone`)

**Outputs:**
- Authenticated `UserId` for all downstream features
- `IANATimezone` stored per member in Firestore
- Auth token for Socket.io handshake

## Data Dependencies

- `services/firebase` (AuthPort) — authentication operations
- `services/firebase` (FirestorePort) — user profile persistence
- `store/identity.slice` — client-side auth state

## Events / Actions

- `IDENTITY_ANONYMOUS_SESSION_STARTED`
- `IDENTITY_AUTH_LINKED`
- `IDENTITY_SESSION_EXPIRED`
- `IDENTITY_SESSION_RESTORED`

## Edge Cases

- **No network on first launch** — queue anonymous sign-in; retry on connectivity
- **Auth token expiry** — Firebase SDK handles refresh; surface error if refresh fails
- **Multiple devices** — same UID; presence tracks per-device via sessionId
- **Timezone change** — detect on app foreground; prompt update if changed
- **Anonymous data loss** — warn before provider link if merge fails

## Integration Points

- **services/firebase** — AuthPort for sign-in, FirestorePort for user profile
- **features/rooms** — userId required before room create/join
- **services/socket** — auth token passed during socket handshake
- **lib/time** — timezone detection utilities

## Future Implementation Notes

- Consider biometric re-auth for sensitive actions
- Plan for account deletion (GDPR/CCPA)
- Evaluate anonymous session TTL and cleanup
