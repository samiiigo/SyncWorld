// ──────────────────────────────────────────────
// common.ts — Branded primitives and shared utility types
// SRP: only generic, domain-agnostic type scaffolding lives here
// ──────────────────────────────────────────────

/** Nominal branding helper — prevents accidental interchange of string/number aliases */
type Brand<T, B extends string> = T & { readonly __brand: B };

/** UTC epoch milliseconds — the single source of truth for all time values in SyncWorld */
export type UTCEpochMs = Brand<number, 'UTCEpochMs'>;

/** IANA timezone identifier (e.g. "America/New_York", "Asia/Tokyo") */
export type IANATimezone = Brand<string, 'IANATimezone'>;

/** Opaque entity identifiers — branded to prevent cross-entity key misuse */
export type UserId = Brand<string, 'UserId'>;
export type RoomId = Brand<string, 'RoomId'>;
export type MemberId = Brand<string, 'MemberId'>;
export type VoteId = Brand<string, 'VoteId'>;
export type AlarmId = Brand<string, 'AlarmId'>;
export type SessionId = Brand<string, 'SessionId'>;

/** Room invite / join code */
export type RoomCode = Brand<string, 'RoomCode'>;

/** Generic result wrapper — avoids throwing for expected failures (OCP-friendly) */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Async version for service boundaries */
export type AsyncResult<T, E = string> = Promise<Result<T, E>>;

/** Disposable subscription handle returned by event listeners */
export type Unsubscribe = () => void;

/** Pagination cursor for Firestore list queries */
export type PaginationCursor = {
  lastDocId: string | null;
  pageSize: number;
};
