import { clearWeatherCache, fetchWeather, weatherCodeToKind } from '../openMeteo';
import { ZONE_COORDS } from '../zoneCoords';

const ok = (code: number, temp: number) =>
  jest.fn().mockResolvedValue({ ok: true, json: async () => ({ current: { temperature_2m: temp, weather_code: code } }) });
const MIN = 60_000;

beforeEach(() => clearWeatherCache());

describe('weatherCodeToKind', () => {
  it.each([
    [0, 'clear'],
    [1, 'clear'],
    [3, 'cloud'],
    [45, 'fog'],
    [61, 'rain'],
    [81, 'rain'],
    [95, 'rain'],
    [71, 'cloud'],
  ])('%i → %s', (code, kind) => expect(weatherCodeToKind(code)).toBe(kind));
});

describe('fetchWeather', () => {
  it('knows every demo zone', () => {
    for (const tz of ['Asia/Dubai', 'Europe/London', 'Asia/Tokyo', 'Europe/Berlin', 'Australia/Sydney']) {
      expect(ZONE_COORDS[tz]).toBeDefined();
    }
  });

  it('returns kind and rounded temperature', async () => {
    const f = ok(61, 8.6);
    await expect(fetchWeather('Europe/London', 0, f)).resolves.toEqual({ kind: 'rain', tempC: 9 });
    expect(f.mock.calls[0][0]).toContain('api.open-meteo.com/v1/forecast?latitude=');
  });

  it('returns null for unknown zone', async () => {
    const f = ok(0, 20);
    await expect(fetchWeather('Etc/UTC', 0, f)).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('returns null on fetch error and does not retry for 5 minutes', async () => {
    const f = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(fetchWeather('Asia/Tokyo', 0, f)).resolves.toBeNull();
    await expect(fetchWeather('Asia/Tokyo', 4 * MIN, f)).resolves.toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
    await fetchWeather('Asia/Tokyo', 6 * MIN, f);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('returns null on a non-OK response', async () => {
    const f = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(fetchWeather('Asia/Tokyo', 0, f)).resolves.toBeNull();
  });

  it('caches for 30 minutes', async () => {
    const f = ok(0, 20);
    await fetchWeather('Asia/Dubai', 0, f);
    await fetchWeather('Asia/Dubai', 29 * MIN, f);
    expect(f).toHaveBeenCalledTimes(1);
    await fetchWeather('Asia/Dubai', 31 * MIN, f);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
