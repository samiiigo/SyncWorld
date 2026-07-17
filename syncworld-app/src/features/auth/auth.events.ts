// ──────────────────────────────────────────────
// identity.events.ts — Identity domain events (re-export subset)
// SRP: surfaces only identity-relevant events for local use
// ──────────────────────────────────────────────

export type { IdentityEvent } from '@domain/events';

export const IDENTITY_EVENT_KINDS = [
  'IDENTITY_ANONYMOUS_SESSION_STARTED',
  'IDENTITY_AUTH_LINKED',
  'IDENTITY_SESSION_EXPIRED',
  'IDENTITY_SESSION_RESTORED',
] as const;
