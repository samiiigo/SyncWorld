import { buildRefractionMap } from '../glass/refractionMap';
import { skyPeriodForHour, subsolarPoint } from '../sky';

describe('skyPeriodForHour', () => {
  it('maps hours to the four skies', () => {
    expect(skyPeriodForHour(3)).toBe('night');
    expect(skyPeriodForHour(6)).toBe('dawn');
    expect(skyPeriodForHour(12)).toBe('day');
    expect(skyPeriodForHour(18)).toBe('dusk');
    expect(skyPeriodForHour(22)).toBe('night');
  });

  it('wraps out-of-range hours', () => {
    expect(skyPeriodForHour(30)).toBe('dawn');
    expect(skyPeriodForHour(-12)).toBe('day');
  });
});

describe('subsolarPoint', () => {
  it('puts the sun over Greenwich at 12:00 UTC', () => {
    expect(subsolarPoint(Date.UTC(2026, 2, 20, 12, 0)).lon).toBeCloseTo(0, 5);
  });

  it('moves the sun 15 degrees west per hour', () => {
    expect(subsolarPoint(Date.UTC(2026, 2, 20, 18, 0)).lon).toBeCloseTo(-90, 5);
    // Midnight UTC: the antimeridian (-180 and 180 are the same line).
    expect(Math.abs(subsolarPoint(Date.UTC(2026, 2, 20, 0, 0)).lon)).toBeCloseTo(180, 5);
  });

  it('follows the seasons: north in June, south in December', () => {
    expect(subsolarPoint(Date.UTC(2026, 5, 21, 12)).lat).toBeGreaterThan(23);
    expect(subsolarPoint(Date.UTC(2026, 11, 21, 12)).lat).toBeLessThan(-23);
  });
});

describe('buildRefractionMap (liquid-glass-js edge refraction)', () => {
  const at = (map: ReturnType<typeof buildRefractionMap>, x: number, y: number) => {
    const i = (y * map.width + x) * 4;
    return { r: map.data[i], g: map.data[i + 1] };
  };

  it('leaves the middle of the glass undistorted', () => {
    const map = buildRefractionMap(200, 100, 24);
    const mid = at(map, 100, 50);
    expect(Math.abs(mid.r - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(mid.g - 128)).toBeLessThanOrEqual(1);
  });

  it('pushes samples outward along the edge normal', () => {
    const map = buildRefractionMap(200, 100, 24);
    expect(at(map, 199, 50).r).toBeGreaterThan(200); // right edge -> +x
    expect(at(map, 0, 50).r).toBeLessThan(56); // left edge -> -x
    expect(at(map, 100, 99).g).toBeGreaterThan(200); // bottom edge -> +y
    expect(at(map, 100, 0).g).toBeLessThan(56); // top edge -> -y
  });

  it('caps the baked size for large surfaces', () => {
    const map = buildRefractionMap(1600, 900, 32);
    expect(map.width * map.height).toBeLessThanOrEqual(61_000);
    expect(map.data.length).toBe(map.width * map.height * 4);
  });
});
