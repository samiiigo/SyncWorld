import { angleDelta, dragToUtc, pointAngleDeg } from '../dialDrag';

const H = 3_600_000;
const D = 24 * H;
const T = Date.UTC(2026, 10, 18, 5, 15);

describe('dialDrag', () => {
  it('a quarter turn clockwise moves the time 6 hours earlier (ring turns back)', () => {
    expect(dragToUtc(T, 90, T - D, T + D)).toBe(T - 6 * H);
    expect(dragToUtc(T, -90, T - D, T + D)).toBe(T + 6 * H);
  });

  it('snaps to 15 minutes', () => {
    expect((dragToUtc(T, 1, T - D, T + D) - T) % (15 * 60_000)).toBe(0);
  });

  it('crossing ±180 does not jump', () => {
    expect(angleDelta(170, -170)).toBeCloseTo(20);
    expect(angleDelta(-170, 170)).toBeCloseTo(-20);
    expect(Math.abs(dragToUtc(T, angleDelta(170, -170), T - D, T + D) - T)).toBeLessThanOrEqual(90 * 60_000);
  });

  it('clamps to window', () => {
    expect(dragToUtc(T, 720, T, T + 2 * D)).toBe(T);
    expect(dragToUtc(T, -720, T, T + 2 * D)).toBe(T + 2 * D);
  });

  it('pointAngleDeg is 0 at the top and 90 on the right', () => {
    expect(pointAngleDeg(50, 0, 50, 50)).toBeCloseTo(0);
    expect(pointAngleDeg(100, 50, 50, 50)).toBeCloseTo(90);
  });
});
