// ──────────────────────────────────────────────
// session.store.ts — what this device remembers between launches.
// Profile (display name + IANA zone, captured at onboarding) and the rooms
// the user has joined. Live room state is never persisted; it streams from
// the backend while a room is open.
// ──────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { RoomSummary } from './session.types';

export type SessionState = {
  displayName: string;
  timezone: string | null;
  rooms: RoomSummary[];
  /** The in-app permission explainer has been shown once (spec: ask before first create/join). */
  permissionPrimed: boolean;
  /** True once persisted state has loaded (avoid redirecting to onboarding too early). */
  hydrated: boolean;
  setDisplayName: (name: string) => void;
  setTimezone: (tz: string) => void;
  upsertRoom: (room: RoomSummary) => void;
  removeRoom: (roomId: string) => void;
  setPermissionPrimed: () => void;
  reset: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      displayName: '',
      timezone: null,
      rooms: [],
      permissionPrimed: false,
      hydrated: false,
      setDisplayName: (displayName) => set({ displayName }),
      setTimezone: (timezone) => set({ timezone }),
      upsertRoom: (room) =>
        set((s) => {
          const existing = s.rooms.find((r) => r.id === room.id);
          if (!existing) return { rooms: [...s.rooms, room] };
          // Keep a real room name over the "Room CODE" placeholder a join returns.
          const name = room.name.startsWith('Room ') && !existing.name.startsWith('Room ') ? existing.name : room.name;
          return { rooms: s.rooms.map((r) => (r.id === room.id ? { ...r, ...room, name } : r)) };
        }),
      removeRoom: (roomId) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== roomId) })),
      setPermissionPrimed: () => set({ permissionPrimed: true }),
      reset: () => set({ displayName: '', timezone: null, rooms: [], permissionPrimed: false }),
    }),
    {
      name: 'syncworld.session',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ displayName, timezone, rooms, permissionPrimed }) => ({ displayName, timezone, rooms, permissionPrimed }),
      onRehydrateStorage: () => () => {
        useSessionStore.setState({ hydrated: true });
      },
    },
  ),
);
