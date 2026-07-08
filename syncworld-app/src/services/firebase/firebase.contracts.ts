// ──────────────────────────────────────────────
// firebase.contracts.ts — Auth and Firestore port definitions
// SRP: contract shapes only — no implementation
// DIP: features depend on these ports, not on firebase/* SDK imports
// ISP: separate port per concern (auth vs. persistence)
// ──────────────────────────────────────────────

import type { Result, AsyncResult, Unsubscribe, UserId } from '@app-types/common';

// ── Auth Port ──

export type AuthUser = {
  uid: UserId;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
  providerId: string;
};

export type AuthStateCallback = (user: AuthUser | null) => void;

export type AuthPort = {
  signInAnonymously: () => AsyncResult<AuthUser>;
  onAuthStateChanged: (cb: AuthStateCallback) => Unsubscribe;
  linkWithProvider: (providerId: string) => AsyncResult<AuthUser>;
  signOut: () => AsyncResult<void>;
  getCurrentUser: () => AuthUser | null;
};

// ── Firestore Port ──

export type QueryConstraint = {
  field: string;
  op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
  value: unknown;
};

export type OrderConstraint = {
  field: string;
  direction: 'asc' | 'desc';
};

export type QueryOptions = {
  where?: QueryConstraint[];
  orderBy?: OrderConstraint[];
  limit?: number;
};

export type SnapshotCallback<T> = (data: T | null) => void;
export type CollectionSnapshotCallback<T> = (data: T[]) => void;

export type FirestorePort = {
  getDocument: <T>(collection: string, id: string) => AsyncResult<T | null>;
  setDocument: <T>(collection: string, id: string, data: T) => AsyncResult<void>;
  updateDocument: <T>(collection: string, id: string, partial: Partial<T>) => AsyncResult<void>;
  deleteDocument: (collection: string, id: string) => AsyncResult<void>;
  queryDocuments: <T>(collection: string, options: QueryOptions) => AsyncResult<T[]>;
  onSnapshot: <T>(collection: string, id: string, cb: SnapshotCallback<T>) => Unsubscribe;
  onCollectionSnapshot: <T>(collection: string, options: QueryOptions, cb: CollectionSnapshotCallback<T>) => Unsubscribe;
};
