/** World Timeline math + catalog (from Time Zone Visualizer design). */

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const C_DARKEST = '#20130a';
export const C_LIGHT = '#8a5a1e';
export const C_BRIGHT = '#eeb648';
export const C_DARK = '#4a2810';

export const BANDS = [
  { h0: 0, h1: 5, color: C_DARKEST },
  { h0: 5, h1: 10, color: C_LIGHT },
  { h0: 10, h1: 18, color: C_BRIGHT },
  { h0: 18, h1: 22, color: C_DARK },
  { h0: 22, h1: 24, color: C_DARKEST },
] as const;

export type City = { id: string; name: string; abbr: string; offset: number };

export const DEFAULT_CITIES: City[] = [
  { id: 'austin', name: 'Austin', abbr: 'CDT', offset: -300 },
  { id: 'dubai', name: 'Dubai', abbr: 'GST', offset: 240 },
  { id: 'nepal', name: 'Kathmandu', abbr: 'NPT', offset: 345 },
  { id: 'kl', name: 'Kuala Lumpur', abbr: 'MYT', offset: 480 },
];

export type CatalogEntry = { name: string; abbr: string; offset: number };

export const CATALOG: CatalogEntry[] = [
  { name: 'Austin', abbr: 'CDT', offset: -300 },
  { name: 'Dubai', abbr: 'GST', offset: 240 },
  { name: 'Kathmandu', abbr: 'NPT', offset: 345 },
  { name: 'Kuala Lumpur', abbr: 'MYT', offset: 480 },
  { name: 'London', abbr: 'BST', offset: 60 },
  { name: 'Paris', abbr: 'CEST', offset: 120 },
  { name: 'Berlin', abbr: 'CEST', offset: 120 },
  { name: 'New York', abbr: 'EDT', offset: -240 },
  { name: 'Los Angeles', abbr: 'PDT', offset: -420 },
  { name: 'Chicago', abbr: 'CDT', offset: -300 },
  { name: 'Toronto', abbr: 'EDT', offset: -240 },
  { name: 'Sao Paulo', abbr: 'BRT', offset: -180 },
  { name: 'Tokyo', abbr: 'JST', offset: 540 },
  { name: 'Seoul', abbr: 'KST', offset: 540 },
  { name: 'Singapore', abbr: 'SGT', offset: 480 },
  { name: 'Mumbai', abbr: 'IST', offset: 330 },
  { name: 'Sydney', abbr: 'AEST', offset: 600 },
  { name: 'Auckland', abbr: 'NZST', offset: 780 },
  { name: 'Moscow', abbr: 'MSK', offset: 180 },
  { name: 'Cairo', abbr: 'EET', offset: 120 },
];

export const FAVORITE_NAMES = ['London', 'Tokyo', 'New York', 'Sydney', 'Singapore'] as const;

export function snapMinutes(min: number, step = 5): number {
  return Math.round(min / step) * step;
}

export function selectedMomentLabel(selMin: number): string {
  const dt = new Date(selMin * 60000);
  return `${WEEKDAYS[dt.getUTCDay()]}, ${MONTHS[dt.getUTCMonth()].slice(0, 3)} ${dt.getUTCDate()}`;
}

export const PX_PER_HOUR = 22;
export const PX_PER_MIN = PX_PER_HOUR / 60;
export const BAR_INSET = 24;
export const DAY_GAP = 0;
export const HOUR_LABELS = ['00', '06', '12', '18'] as const;
export const ROW_H = 104;

export const BLUE_ON_DARK = '#2997ff';
export const RED_MARKER = '#ff3b30';
export const TILE_1 = '#272729';
export const INK_1 = '#1d1d1f';
export const MUTED_ON_DARK = '#cccccc';

export function normMod(v: number, n: number): number {
  return ((v % n) + n) % n;
}

export function fmtOffset(min: number): string {
  const sign = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return sign + h + (m ? ':' + String(m).padStart(2, '0') : '');
}

export function formatClock(minOfDay: number, use24h: boolean): string {
  const m = normMod(Math.round(minOfDay), 1440);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (use24h) return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ap = h < 12 ? 'AM' : 'PM';
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

export function dateLabelForDay(dayIndex: number): string {
  const dt = new Date(dayIndex * 86400000);
  return `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
}

export function screenX(selMin: number, u: number, viewportW: number): number {
  return viewportW / 2 + (u - selMin) * PX_PER_MIN;
}

export function nowMinutes(): number {
  return Math.floor(Date.now() / 60000);
}

export type DayPill = {
  key: string;
  label: string;
  left: number;
  width: number;
};

export type CityRow = {
  id: string;
  name: string;
  sub: string;
  timeLabel: string;
  relLabel: string;
  relIsAccent: boolean;
  dayPills: DayPill[];
};

export function buildCityRows(
  cities: City[],
  selMin: number,
  currentMin: number,
  use24h: boolean,
  viewportW: number
): CityRow[] {
  const halfWinMin = viewportW / 2 / PX_PER_MIN + 60;

  return cities.map((city) => {
    const offset = city.offset;
    const dayLo = Math.floor((selMin - halfWinMin + offset) / 1440) - 1;
    const dayHi = Math.floor((selMin + halfWinMin + offset) / 1440) + 1;
    const dayPills: DayPill[] = [];

    for (let D = dayLo; D <= dayHi; D++) {
      const dayStartUTC = D * 1440 - offset;
      const dayEndUTC = dayStartUTC + 1440;
      const left = screenX(selMin, dayStartUTC, viewportW) - BAR_INSET + DAY_GAP / 2;
      const width = (dayEndUTC - dayStartUTC) * PX_PER_MIN - DAY_GAP;
      dayPills.push({
        key: `${city.id}-day-${D}`,
        label: dateLabelForDay(D),
        left,
        width,
      });
    }

    const localMinNow = normMod(selMin + offset, 1440);
    const cityDaySelected = Math.floor((selMin + offset) / 1440);
    const cityDayNow = Math.floor((currentMin + offset) / 1440);
    const dayDiff = cityDaySelected - cityDayNow;

    let relLabel: string;
    let relIsAccent: boolean;
    if (dayDiff === 0) {
      relLabel = 'TODAY';
      relIsAccent = false;
    } else if (dayDiff === 1) {
      relLabel = 'TOMORROW';
      relIsAccent = true;
    } else if (dayDiff === -1) {
      relLabel = 'YESTERDAY';
      relIsAccent = true;
    } else {
      const dt = new Date(cityDaySelected * 86400000);
      relLabel = `${MONTHS[dt.getUTCMonth()].slice(0, 3).toUpperCase()} ${dt.getUTCDate()}`;
      relIsAccent = true;
    }

    return {
      id: city.id,
      name: city.name,
      sub: `${city.abbr} UTC${fmtOffset(offset)}`,
      timeLabel: formatClock(localMinNow, use24h),
      relLabel,
      relIsAccent,
      dayPills,
    };
  });
}

export function buildGridLines(selMin: number, viewportW: number): number[] {
  const halfWinMin = viewportW / 2 / PX_PER_MIN + 60;
  const hourLo = Math.floor((selMin - halfWinMin) / 360) - 1;
  const hourHi = Math.ceil((selMin + halfWinMin) / 360) + 1;
  const xs: number[] = [];
  for (let h = hourLo; h <= hourHi; h++) {
    xs.push(screenX(selMin, h * 360, viewportW));
  }
  return xs;
}

export function dateRangeLabel(selMin: number): string {
  return selectedMomentLabel(selMin);
}

export function bandColorsForHour(hourFloat: number): { bg: string; fg: string } {
  const h = ((hourFloat % 24) + 24) % 24;
  const band = BANDS.find((b) => h >= b.h0 && h < b.h1) || BANDS[0];
  const fg = band.color === C_BRIGHT || band.color === C_LIGHT ? '#1a1206' : '#ffffff';
  return { bg: band.color, fg };
}

export function roomTrackBandFlex(): { flex: number; color: string }[] {
  return BANDS.map((b) => ({ flex: b.h1 - b.h0, color: b.color }));
}
