// ──────────────────────────────────────────────
// firebase.firestore.adapter.ts — Cloud Firestore SDK adapter
// SRP: maps Firestore SDK calls to FirestorePort contract
// LSP: can be replaced by any FirestorePort implementation
// ──────────────────────────────────────────────

import type { FirestorePort } from './firebase.contracts';

/**
 * Creates a concrete FirestorePort backed by Cloud Firestore.
 *
 * TODO: import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
 * TODO: map SDK responses to Result<T> shape
 * TODO: handle offline persistence and cache-first reads
 * TODO: handle permission-denied errors gracefully
 * TODO: implement batch write support for atomic multi-doc updates
 */
export function createFirestoreAdapter(): FirestorePort {
  // TODO: initialize with getFirestore(firebaseApp)
  throw new Error('createFirestoreAdapter not implemented');
}
