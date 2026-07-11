// ──────────────────────────────────────────────
// rooms.slice.ts — Room entity and FSM state
// SRP: room list, active room, and status transitions only
// ──────────────────────────────────────────────

import type { RoomId } from '@domain/common';
import type { Room, RoomStatus } from '@domain/room';
import type { LobbySnapshot } from '@domain/member';

// ── State Shape ──

export type RoomsState = {
  activeRoomId: RoomId | null;
  activeRoom: Room | null;
  lobby: LobbySnapshot | null;
  rooms: Record<string, Room>;
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
};

// ── Actions ──

export type RoomsActions = {
  createRoom: (name: string, maxMembers: number) => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  setActiveRoom: (roomId: RoomId) => void;
  handleStatusTransition: (roomId: RoomId, newStatus: RoomStatus) => void;
  updateLobby: (snapshot: LobbySnapshot) => void;
};

// ── Initial State ──

export const ROOMS_INITIAL_STATE: RoomsState = {
  activeRoomId: null,
  activeRoom: null,
  lobby: null,
  rooms: {},
  isCreating: false,
  isJoining: false,
  error: null,
};

import { create } from 'zustand';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useIdentityStore } from './identity.slice';

export const useRoomsStore = create<RoomsState & RoomsActions>((set, get) => ({
  ...ROOMS_INITIAL_STATE,
  createRoom: async (name, maxMembers) => {
    set({ isCreating: true, error: null });
    try {
      const { timezone, displayName } = useIdentityStore.getState();
      const createRoomFn = httpsCallable<any, { roomId: string, code: string }>(functions, 'createRoom');
      const response = await createRoomFn({ 
        roomName: name, 
        participantCap: maxMembers,
        timezone: timezone || 'UTC',
        displayName: displayName || 'Anonymous'
      });
      set({ activeRoomId: response.data.roomId as RoomId, isCreating: false });
    } catch (err: any) {
      set({ error: err.message, isCreating: false });
    }
  },
  joinRoom: async (code) => {
    set({ isJoining: true, error: null });
    try {
      const { timezone, displayName } = useIdentityStore.getState();
      const joinRoomFn = httpsCallable<any, { roomId: string, roomCode: string }>(functions, 'joinRoom');
      const response = await joinRoomFn({ 
        roomCode: code,
        timezone: timezone || 'UTC',
        displayName: displayName || 'Anonymous'
      });
      set({ activeRoomId: response.data.roomId as RoomId, isJoining: false });
    } catch (err: any) {
      set({ error: err.message, isJoining: false });
    }
  },
  leaveRoom: async () => { 
    set({ activeRoomId: null, activeRoom: null, lobby: null });
  },
  setActiveRoom: (roomId) => { 
    set({ activeRoomId: roomId });
  },
  handleStatusTransition: (roomId, newStatus) => {
    // Optimistic update of local room state
    const currentRoom = get().rooms[roomId as string];
    if (currentRoom) {
      set({
        rooms: {
          ...get().rooms,
          [roomId as string]: { ...currentRoom, status: newStatus }
        },
        ...(get().activeRoomId === roomId ? { activeRoom: { ...currentRoom, status: newStatus } } : {})
      });
    }
  },
  updateLobby: (snapshot) => { 
    set({ lobby: snapshot });
  },
}));
