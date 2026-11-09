// ──────────────────────────────────────────────
// alarm.repository.ts — Alarm data access layer
// SRP: Firestore read/write for alarm documents only
// DIP: depends on FirestorePort abstraction
// ──────────────────────────────────────────────

import type { RoomId, AsyncResult, Unsubscribe } from '@domain/common';
import type { Alarm, AlarmStatus } from '@domain/alarm';
import type { FirestorePort } from '@services/firebase/firebase.contracts';

export type AlarmRepository = {
  createAlarm: (alarm: Alarm) => AsyncResult<void>;
  getAlarm: (roomId: RoomId) => AsyncResult<Alarm | null>;
  updateAlarmStatus: (roomId: RoomId, status: AlarmStatus) => AsyncResult<void>;
  deleteAlarm: (roomId: RoomId) => AsyncResult<void>;
  subscribeToAlarm: (roomId: RoomId, cb: (alarm: Alarm | null) => void) => Unsubscribe;
};

export type CreateAlarmRepository = (deps: {
  firestorePort: FirestorePort;
}) => AlarmRepository;

/**
 * TODO: implement createAlarmRepository
 * - alarm doc path: 'rooms/{roomId}/alarm' (single doc per room)
 * - status transitions: pending → armed → fired | cancelled
 * - use server timestamp for armedAt and firedAt fields
 * - subscribe for real-time status changes across all members
 */
