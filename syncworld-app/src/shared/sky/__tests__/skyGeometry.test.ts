import { bezelAngleDeg, bodyPosition, localMinutes, oddHour, ringRotationDeg, snapToTick } from '../skyGeometry';

describe('skyGeometry', () => {
  it('body is off-frame at 6 AM and highest at noon / midnight', () => {
    expect(bodyPosition(360)).toMatchObject({ kind: 'sun', x: 43, y: 116 });
    const noon = bodyPosition(720);
    expect(noon.kind).toBe('sun');
    expect(noon.x).toBeCloseTo(100);
    expect(noon.y).toBeCloseTo(74);
    expect(bodyPosition(1080).kind).toBe('moon');
    const midnight = bodyPosition(0);
    expect(midnight.kind).toBe('moon');
    expect(midnight.x).toBeCloseTo(100);
    expect(midnight.y).toBeCloseTo(74);
  });

  it('oddHour', () => {
    expect(oddHour(6 * 60 + 59)).toBe('early');
    expect(oddHour(7 * 60)).toBeNull();
    expect(oddHour(22 * 60 + 59)).toBeNull();
    expect(oddHour(23 * 60)).toBe('late');
  });

  it('handles half-hour and +13 zones', () => {
    const t = Date.UTC(2026, 0, 10, 0, 0);
    expect(bezelAngleDeg('Asia/Kolkata', 'Etc/UTC', t)).toBeCloseTo(82.5);
    expect(bezelAngleDeg('Pacific/Auckland', 'Etc/UTC', t)).toBeCloseTo(-165);
  });

  it('uses offset at the instant (DST)', () => {
    expect(localMinutes(Date.UTC(2026, 2, 28, 12), 'Europe/London')).toBe(720);
    expect(localMinutes(Date.UTC(2026, 2, 29, 12), 'Europe/London')).toBe(780);
  });

  it('ringRotationDeg and snapToTick', () => {
    expect(ringRotationDeg(Date.UTC(2026, 0, 1, 6), 'Etc/UTC')).toBe(-90);
    expect(snapToTick(Date.UTC(2026, 0, 1, 6, 8))).toBe(Date.UTC(2026, 0, 1, 6, 15));
  });
});
