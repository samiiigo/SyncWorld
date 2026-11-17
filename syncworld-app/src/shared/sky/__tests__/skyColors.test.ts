import { contrastRatio, GROUND, INK, nightness, ODD, SKY_STOPS, skyAt, YOU } from '../skyColors';

describe('skyColors', () => {
  it('bottom colour equals the stop colour at a stop minute', () => {
    const noon = SKY_STOPS.find((s) => s.min === 720)!;
    expect(skyAt(720).bottom).toBe(`rgb(${noon.rgb.join(',')})`);
  });

  it('wraps at midnight', () => {
    expect(skyAt(1440)).toEqual(skyAt(0));
    expect(skyAt(-60)).toEqual(skyAt(1380));
  });

  it('top is darker than bottom at noon', () => {
    const lum = (s: string) => s.match(/\d+/g)!.map(Number).reduce((a, b) => a + b, 0);
    expect(lum(skyAt(720).top)).toBeLessThan(lum(skyAt(720).bottom));
  });

  it('nightness is 0 by day, 1 at night, between at dawn', () => {
    expect(nightness(720)).toBe(0);
    expect(nightness(0)).toBe(1);
    const dawn = nightness(6 * 60);
    expect(dawn).toBeGreaterThan(0);
    expect(dawn).toBeLessThan(1);
  });

  it('readout colours are readable on the ground', () => {
    for (const c of [INK, ODD, YOU]) expect(contrastRatio(c, GROUND)).toBeGreaterThanOrEqual(4.5);
  });

  it('contrastRatio matches WCAG for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21);
  });
});
