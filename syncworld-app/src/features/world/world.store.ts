import { create } from 'zustand';

import { DEFAULT_CITIES, type CatalogEntry, type City } from './timeline';

type SettingsSheet = null | 'account' | 'notifications' | 'appearance' | 'privacy' | 'storage';

type WorldStore = {
  cities: City[];
  use24h: boolean;
  showCurrentMarker: boolean;
  accountName: string;
  notifProposals: boolean;
  notifInvites: boolean;
  notifDigest: boolean;
  privacyShowStatus: boolean;
  privacyOpenInvite: boolean;
  storageWifiOnly: boolean;
  cacheClearedAt: number;
  settingsSheet: SettingsSheet;
  settingsToast: string | null;
  setCities: (cities: City[]) => void;
  addCity: (entry: CatalogEntry) => void;
  removeCity: (id: string) => void;
  reorderCity: (from: number, to: number) => void;
  setUse24h: (v: boolean) => void;
  setShowCurrentMarker: (v: boolean) => void;
  setAccountName: (v: string) => void;
  setSettingsSheet: (v: SettingsSheet) => void;
  toggleNotifProposals: () => void;
  toggleNotifInvites: () => void;
  toggleNotifDigest: () => void;
  togglePrivacyShowStatus: () => void;
  togglePrivacyOpenInvite: () => void;
  toggleStorageWifiOnly: () => void;
  clearCache: () => void;
  showSettingsToast: (msg: string) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useWorldStore = create<WorldStore>((set, get) => ({
  cities: DEFAULT_CITIES,
  use24h: false,
  showCurrentMarker: true,
  accountName: 'You',
  notifProposals: true,
  notifInvites: true,
  notifDigest: false,
  privacyShowStatus: true,
  privacyOpenInvite: false,
  storageWifiOnly: true,
  cacheClearedAt: 0,
  settingsSheet: null,
  settingsToast: null,
  setCities: (cities) => set({ cities }),
  addCity: (entry) =>
    set((s) => {
      const city = {
        id: `${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        name: entry.name,
        abbr: entry.abbr,
        offset: entry.offset,
      };
      return { cities: s.cities.concat([city]) };
    }),
  removeCity: (id) =>
    set((s) => ({
      cities: s.cities.filter((c) => c.id !== id),
    })),
  reorderCity: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || to < 0 || from >= s.cities.length || to >= s.cities.length) {
        return s;
      }
      const next = s.cities.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { cities: next };
    }),
  setUse24h: (use24h) => set({ use24h }),
  setShowCurrentMarker: (showCurrentMarker) => set({ showCurrentMarker }),
  setAccountName: (accountName) => set({ accountName }),
  setSettingsSheet: (settingsSheet) => set({ settingsSheet }),
  toggleNotifProposals: () => set((s) => ({ notifProposals: !s.notifProposals })),
  toggleNotifInvites: () => set((s) => ({ notifInvites: !s.notifInvites })),
  toggleNotifDigest: () => set((s) => ({ notifDigest: !s.notifDigest })),
  togglePrivacyShowStatus: () => set((s) => ({ privacyShowStatus: !s.privacyShowStatus })),
  togglePrivacyOpenInvite: () => set((s) => ({ privacyOpenInvite: !s.privacyOpenInvite })),
  toggleStorageWifiOnly: () => set((s) => ({ storageWifiOnly: !s.storageWifiOnly })),
  clearCache: () => {
    set({ cacheClearedAt: Date.now() });
    get().showSettingsToast('Cache cleared — freed 24 MB');
  },
  showSettingsToast: (msg) => {
    set({ settingsToast: msg });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ settingsToast: null }), 3000);
  },
}));
