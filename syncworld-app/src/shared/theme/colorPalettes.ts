// ──────────────────────────────────────────────
// colorPalettes.ts — SyncWorld color tokens (light + dark)
// Source: syncworld-prototype/Sync Room App.dc.html getTheme() and the
// Apple design-system tokens in syncworld-prototype/_ds/*/tokens/colors.css.
// See DESIGN.md for usage rules.
// ──────────────────────────────────────────────

export type ColorPalette = {
  // Surfaces
  /** Page background (parchment in light, true black in dark). */
  background: string;
  /** Grouped/secondary background behind inset cards. */
  surface: string;
  /** Raised surface: cards, sheets, modals. */
  card: string;
  /** Second-level surface: inputs, chips, nested rows. */
  surfaceElevated: string;
  /** Hairline separators and outlines. */
  border: string;

  // Text
  textPrimary: string;
  /** Strong secondary copy (prototype text2). */
  textStrong: string;
  /** Muted labels and metadata (prototype text3). */
  textSecondary: string;
  /** Alias of textSecondary kept for existing screens. */
  subtext: string;
  /** Faintest text: placeholders, disabled labels. */
  textTertiary: string;

  // Accent and semantic
  /** Action Blue — the single interactive accent. */
  primary: string;
  /** Text/icon color on top of `primary`. */
  onPrimary: string;
  danger: string;
  red: string;
  green: string;
  /** Tinted background for success badges ("Armed", "Online"). */
  successSoft: string;
  orange: string;
  purple: string;

  // Time-of-day periods (scrubber track, member local-time chips)
  sleepBg: string;
  sleepFg: string;
  businessBg: string;
  businessFg: string;
  eveningBg: string;
  eveningFg: string;

  // Presence
  statusOnline: string;
  statusIdle: string;
  statusOffline: string;

  // Overlays
  /** Scrim behind sheets (40%) and modals. */
  scrim: string;
  /** Inverted pill for toasts and the scrubber's floating UTC badge. */
  inverseSurface: string;
  inverseText: string;
};

export const darkColors: ColorPalette = {
  background: '#000000',
  surface: '#000000',
  card: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  border: 'rgba(255,255,255,0.16)',

  textPrimary: '#FFFFFF',
  textStrong: '#CCCCCC',
  textSecondary: '#8E8E93',
  subtext: '#8E8E93',
  textTertiary: '#636366',

  primary: '#2997FF',
  onPrimary: '#FFFFFF',
  danger: '#FF453A',
  red: '#FF453A',
  green: '#30D158',
  successSoft: 'rgba(48,209,88,0.16)',
  orange: '#FF9F0A',
  purple: '#BF5AF2',

  sleepBg: 'rgba(90,110,150,0.28)',
  sleepFg: '#AEBEDB',
  businessBg: '#272729',
  businessFg: '#CCCCCC',
  eveningBg: 'rgba(255,159,10,0.22)',
  eveningFg: '#FFB84D',

  statusOnline: '#30D158',
  statusIdle: '#FFB84D',
  statusOffline: '#FF453A',

  scrim: 'rgba(0,0,0,0.5)',
  inverseSurface: '#FFFFFF',
  inverseText: '#1D1D1F',
};

export const lightColors: ColorPalette = {
  background: '#F5F5F7',
  surface: '#F5F5F7',
  card: '#FFFFFF',
  surfaceElevated: '#FAFAFC',
  border: '#E0E0E0',

  textPrimary: '#1D1D1F',
  textStrong: '#333333',
  textSecondary: '#7A7A7A',
  subtext: '#7A7A7A',
  textTertiary: '#A1A1A6',

  primary: '#0066CC',
  onPrimary: '#FFFFFF',
  danger: '#FF3B30',
  red: '#FF3B30',
  green: '#34C759',
  successSoft: 'rgba(52,199,89,0.14)',
  orange: '#FF9500',
  purple: '#AF52DE',

  sleepBg: '#E4E8EF',
  sleepFg: '#3A4A63',
  businessBg: '#F5F5F7',
  businessFg: '#333333',
  eveningBg: 'rgba(255,159,10,0.16)',
  eveningFg: '#A15C00',

  statusOnline: '#34C759',
  statusIdle: '#A15C00',
  statusOffline: '#FF3B30',

  scrim: 'rgba(0,0,0,0.4)',
  inverseSurface: '#1D1D1F',
  inverseText: '#FFFFFF',
};
