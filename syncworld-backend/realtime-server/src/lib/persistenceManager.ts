import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firebaseAdminFirestore } from './firebaseAdmin';
import { logger } from './logger';

type ScrubberUpdate = {
  roomId: string;
  position: number;
};

type PresenceUpdate = {
  roomId: string;
  userId: string;
};

class PersistenceManager {
  private scrubberUpdates = new Map<string, ScrubberUpdate>();
  private presenceUpdates = new Map<string, PresenceUpdate>();
  private flushInterval: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(private flushIntervalMs: number = 1000) {
    this.start();
  }

  public start() {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  public stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  public queueScrubberUpdate(roomId: string, position: number) {
    this.scrubberUpdates.set(roomId, { roomId, position });
  }

  public queuePresenceUpdate(roomId: string, userId: string) {
    this.presenceUpdates.set(`${roomId}:${userId}`, { roomId, userId });
  }

  private async flush() {
    if (this.isFlushing) return;
    if (this.scrubberUpdates.size === 0 && this.presenceUpdates.size === 0) return;

    this.isFlushing = true;
    const batch = firebaseAdminFirestore.batch();

    // Snapshot queues
    const currentScrubber = new Map(this.scrubberUpdates);
    const currentPresence = new Map(this.presenceUpdates);

    // Clear queues for next batch
    this.scrubberUpdates.clear();
    this.presenceUpdates.clear();

    const now = Timestamp.now();

    for (const [roomId, update] of currentScrubber.entries()) {
      const roomRef = firebaseAdminFirestore.collection('rooms').doc(roomId);
      batch.update(roomRef, {
        scrubberPosition: update.position,
        lastActivityAt: now,
      });
    }

    for (const [key, update] of currentPresence.entries()) {
      const memberRef = firebaseAdminFirestore
        .collection('rooms')
        .doc(update.roomId)
        .collection('members')
        .doc(update.userId);
      batch.update(memberRef, {
        isOnline: true,
        lastSeenAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      logger.error({ err: error }, 'Failed to flush persistence batch');
      // Optional: re-queue failed updates if needed, though they might be superseded
    } finally {
      this.isFlushing = false;
    }
  }
}

export const persistenceManager = new PersistenceManager();
