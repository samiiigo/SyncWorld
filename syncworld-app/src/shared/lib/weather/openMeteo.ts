// ──────────────────────────────────────────────
// openMeteo.ts — current weather for a time zone's main city.
// Open-Meteo needs no API key. Credited in Settings → About.
// The sky never waits on this: any failure means a clear sky.
// ──────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { WeatherNow } from '@/shared/sky/SkyWindow';
import { ZONE_COORDS } from './zoneCoords';

export type { WeatherNow };

const OK_TTL_MS = 30 * 60_000;
const FAIL_TTL_MS = 5 * 60_000;

type Entry = { value: WeatherNow | null; expires: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<WeatherNow | null>>();

/** Test hook. */
export function clearWeatherCache() {
  cache.clear();
  inflight.clear();
}

/** WMO weather code → what the sky draws. */
export function weatherCodeToKind(code: number): WeatherNow['kind'] {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) return 'rain';
  return 'cloud';
}

export async function fetchWeather(
  tz: string,
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch,
): Promise<WeatherNow | null> {
  const coords = ZONE_COORDS[tz];
  if (!coords) return null;
  const hit = cache.get(tz);
  if (hit && hit.expires > now) return hit.value;
  const pending = inflight.get(tz);
  if (pending) return pending;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
    '&current=temperature_2m,weather_code';
  const run = (async () => {
    let value: WeatherNow | null = null;
    try {
      const res = await fetchImpl(url);
      if (res.ok) {
        const body = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
        const c = body.current;
        if (c && typeof c.temperature_2m === 'number' && typeof c.weather_code === 'number') {
          value = { kind: weatherCodeToKind(c.weather_code), tempC: Math.round(c.temperature_2m) };
        }
      }
    } catch {
      value = null;
    }
    cache.set(tz, { value, expires: now + (value ? OK_TTL_MS : FAIL_TTL_MS) });
    inflight.delete(tz);
    return value;
  })();
  inflight.set(tz, run);
  return run;
}

/** Current weather for a zone, or null while loading / unknown / offline. */
export function useWeather(tz: string | undefined): WeatherNow | null {
  const [value, setValue] = useState<WeatherNow | null>(() => (tz ? (cache.get(tz)?.value ?? null) : null));
  useEffect(() => {
    if (!tz) {
      setValue(null);
      return;
    }
    let live = true;
    void fetchWeather(tz).then((w) => {
      if (live) setValue(w);
    });
    return () => {
      live = false;
    };
  }, [tz]);
  return value;
}
