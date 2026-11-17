// ──────────────────────────────────────────────
// live.backend.ts — SyncBackend over the real SyncWorld backend.
//
// Durable state (rooms, members, proposals, votes) comes from Firestore
// onSnapshot listeners; every write goes through Cloud Functions callables
// (Firestore rules deny direct client writes). The scrubber and proposals use
// the Socket.io realtime server for ~50ms broadcasts.
// ──────────────────────────────────────────────

import { onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { io, type Socket } from 'socket.io-client';

import { loadEnvConfig } from '@/config/env';
import { getFirebase } from '@/shared/lib/firebase/firebase.app';
import { SOCKET_EVENTS } from '@/shared/lib/socket/socket.events';
import type {
  MemberStatus,
  ProposalStatus,
  RealtimeChannel,
  RealtimeHandlers,
  RoomStatus,
  SessionMember,
  SessionProposal,
  SyncBackend,
  VoteChoice,
} from '../session.types';

const PRESENCE_HEARTBEAT_MS = 15_000;
/** Members seen within this window but not connected count as idle. */
const IDLE_WINDOW_MS = 2 * 60_000;

const toMillis = (value: unknown): number => {
  const ts = value as Timestamp | undefined;
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
};

export function memberStatusFrom(data: DocumentData, now: number = Date.now()): MemberStatus {
  if (data.isOnline) return 'online';
  return now - toMillis(data.lastSeenAt) < IDLE_WINDOW_MS ? 'idle' : 'disconnected';
}

function waitForUser(): Promise<User | null> {
  const { auth } = getFirebase();
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

async function currentUser(): Promise<User> {
  const { auth } = getFirebase();
  const user = auth.currentUser ?? (await waitForUser());
  if (user) return user;
  return (await signInAnonymously(auth)).user;
}

function callable<I, O>(name: string) {
  return async (input: I): Promise<O> => {
    const { functions } = getFirebase();
    const result = await httpsCallable<I, O>(functions, name)(input);
    return result.data;
  };
}

const api = {
  createRoom: callable<
    { roomName: string; participantCap: number | null; timezone: string; displayName: string },
    { roomId: string; code: string }
  >('createRoom'),
  joinRoom: callable<{ roomCode: string; timezone: string; displayName: string }, { roomId: string; roomCode: string }>(
    'joinRoom',
  ),
  leaveRoom: callable<{ roomId: string }, { left: boolean }>('leaveRoom'),
  transitionRoomStatus: callable<{ roomId: string; targetStatus: RoomStatus }, unknown>('transitionRoomStatus'),
  castVote: callable<{ roomId: string; proposalId: string; choice: 'accept' | 'reject' }, unknown>('castVote'),
  registerPushToken: callable<
    { roomId: string; kind: 'expo' | 'fcm'; token: string; platform: string } | { roomId: string; kind: 'local'; platform: string },
    unknown
  >(
    'registerPushToken',
  ),
  disarmAlarm: callable<{ roomId: string }, unknown>('disarmAlarm'),
};

export function createLiveBackend(): SyncBackend {
  const env = loadEnvConfig();

  return {
    kind: 'live',

    async signIn() {
      return (await currentUser()).uid;
    },

    async signOut() {
      await firebaseSignOut(getFirebase().auth);
    },

    async createRoom({ name, cap, displayName, timezone }) {
      const { roomId, code } = await api.createRoom({ roomName: name, participantCap: cap, timezone, displayName });
      return { id: roomId, name, code };
    },

    async joinRoom({ code, displayName, timezone }) {
      const { roomId, roomCode } = await api.joinRoom({ roomCode: code.toUpperCase(), timezone, displayName });
      return { id: roomId, name: `Room ${roomCode}`, code: roomCode };
    },

    async leaveRoom(roomId) {
      await api.leaveRoom({ roomId });
    },

    watchRoom(roomId, onChange, onError) {
      const { firestore, auth } = getFirebase();
      const uid = auth.currentUser?.uid ?? '';
      const roomRef = doc(firestore, 'rooms', roomId);

      let roomData: DocumentData | null | undefined;
      let members: SessionMember[] = [];
      let proposal: SessionProposal | null = null;
      let proposalVotes: Record<string, VoteChoice> = {};
      let unsubVotes: (() => void) | null = null;
      let votesFor: string | null = null;

      const publish = () => {
        if (roomData === undefined) return; // first snapshot not in yet
        if (roomData === null) {
          onChange(null);
          return;
        }
        onChange({
          id: roomId,
          name: (roomData.roomName as string) ?? `Room ${roomData.code}`,
          code: roomData.code as string,
          cap: (roomData.participantCap as number | null) ?? null,
          status: (roomData.status as RoomStatus) ?? 'OPEN',
          hostId: (roomData.hostId as string | null) ?? null,
          members,
          proposal: proposal ? { ...proposal, votes: proposalVotes } : null,
        });
      };

      const fail = (err: unknown) => onError?.((err as Error)?.message ?? 'Lost connection to the room.');

      const unsubRoom = onSnapshot(
        roomRef,
        (snap) => {
          roomData = snap.exists() ? snap.data() : null;
          publish();
        },
        (err) => {
          roomData = null;
          publish();
          fail(err);
        },
      );

      const unsubMembers = onSnapshot(
        collection(roomRef, 'members'),
        (snap) => {
          const hostId = (roomData?.hostId as string | undefined) ?? null;
          members = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: (data.displayName as string) || 'Member',
                timezone: (data.timezone as string) || 'UTC',
                status: memberStatusFrom(data),
                isYou: d.id === uid,
                isHost: data.role === 'host' || d.id === hostId,
                alarmArmed: Boolean(data.alarmArmed),
                alarmBlocked: Boolean(data.alarmBlocked),
                wokeAt: data.wokeAt ? toMillis(data.wokeAt) : null,
                joinedAt: toMillis(data.joinedAt),
              };
            })
            .sort((a, b) => Number(b.isYou) - Number(a.isYou) || a.joinedAt - b.joinedAt)
            .map(({ joinedAt: _joinedAt, ...m }) => m);
          publish();
        },
        fail,
      );

      const unsubProposal = onSnapshot(
        query(collection(roomRef, 'proposals'), orderBy('createdAt', 'desc'), limit(1)),
        (snap) => {
          const d = snap.docs[0];
          if (!d) {
            proposal = null;
            proposalVotes = {};
          } else {
            const data = d.data();
            proposal = {
              id: d.id,
              targetTimeUtc: data.targetTimeUtc as number,
              createdBy: data.createdBy as string,
              expiresAt: toMillis(data.expiresAt),
              status: data.status as ProposalStatus,
              votes: {},
            };
          }
          if (votesFor !== (d?.id ?? null)) {
            unsubVotes?.();
            unsubVotes = null;
            proposalVotes = {};
            votesFor = d?.id ?? null;
            if (d) {
              unsubVotes = onSnapshot(
                collection(d.ref, 'votes'),
                (votesSnap) => {
                  proposalVotes = Object.fromEntries(
                    votesSnap.docs.map((v) => [v.id, v.data().choice === 'accept' ? 'yes' : 'no'] as const),
                  );
                  publish();
                },
                fail,
              );
            }
          }
          publish();
        },
        fail,
      );

      return () => {
        unsubRoom();
        unsubMembers();
        unsubProposal();
        unsubVotes?.();
      };
    },

    connectRealtime(roomId: string, handlers: RealtimeHandlers): RealtimeChannel {
      let socket: Socket | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let closed = false;
      let uid = '';

      const ready = (async () => {
        const user = await currentUser();
        uid = user.uid;
        if (closed) return;
        socket = io(env.socketServerUrl, {
          transports: ['websocket'],
          // Fresh ID token on every (re)connect attempt; tokens expire hourly.
          auth: (cb) => {
            user
              .getIdToken()
              .then((token) => cb({ token }))
              .catch(() => cb({}));
          },
          reconnection: true,
          reconnectionDelay: 500,
          reconnectionDelayMax: 8000,
        });

        socket.on('connect', () => {
          socket?.emit('join-room', { roomId });
          handlers.onConnectionChange?.(true);
        });
        socket.on('disconnect', () => handlers.onConnectionChange?.(false));
        socket.on('connect_error', () => handlers.onConnectionChange?.(false));
        socket.on(SOCKET_EVENTS.SCRUBBER_UPDATE, (payload: { roomId?: string; position?: number }) => {
          if (payload?.roomId === roomId && typeof payload.position === 'number') {
            handlers.onScrubber(payload.position);
          }
        });
        socket.on('error', (payload: { message?: string }) => {
          if (payload?.message) handlers.onError?.(payload.message);
        });

        heartbeat = setInterval(() => {
          socket?.emit(SOCKET_EVENTS.PRESENCE_HEARTBEAT, { roomId, userId: uid, timestamp: Date.now() });
        }, PRESENCE_HEARTBEAT_MS);
      })();

      return {
        sendScrubber(targetTimeUtc: number) {
          socket?.emit(SOCKET_EVENTS.SCRUBBER_UPDATE, { roomId, position: targetTimeUtc });
        },
        async propose(targetTimeUtc: number) {
          await ready;
          if (!socket?.connected) {
            throw new Error('Not connected to the realtime server. Try again in a moment.');
          }
          // OPEN → PROPOSING is a callable (server checks the 2-member minimum);
          // PROPOSING → VOTING happens when the server records the socket proposal.
          await api.transitionRoomStatus({ roomId, targetStatus: 'PROPOSING' });
          socket.emit(SOCKET_EVENTS.SCRUBBER_PROPOSAL, { roomId, position: targetTimeUtc, proposedBy: uid });
        },
        close() {
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          socket?.removeAllListeners();
          socket?.disconnect();
          socket = null;
        },
      };
    },

    async vote(roomId, proposalId, choice) {
      await api.castVote({ roomId, proposalId, choice: choice === 'yes' ? 'accept' : 'reject' });
    },

    async arm(roomId, registration) {
      // Without a push token the device still rings from its local notification
      // (native) or the in-app alarm (web), so it counts as armed.
      const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
      await api.registerPushToken(registration ? { roomId, ...registration } : { roomId, kind: 'local', platform });
    },

    async disarm(roomId) {
      await api.disarmAlarm({ roomId });
    },
  };
}
