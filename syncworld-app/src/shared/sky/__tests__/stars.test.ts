import { starField, starOpacity } from '../stars';

describe('stars', () => {
  it('starField is deterministic and stays inside the band', () => {
    const a = starField(1, 20, 20, 104);
    expect(a).toHaveLength(20);
    expect(starField(1, 20, 20, 104)).toEqual(a);
    for (const s of a) {
      expect(s.y).toBeGreaterThanOrEqual(20);
      expect(s.y).toBeLessThanOrEqual(104);
    }
    expect(starField(2, 20, 20, 104)).not.toEqual(a);
  });

  it('starOpacity follows the night, dimmed by weather', () => {
    expect(starOpacity(720)).toBe(0);
    expect(starOpacity(0)).toBe(1);
    const dawn = starOpacity(375);
    expect(dawn).toBeGreaterThan(0);
    expect(dawn).toBeLessThan(1);
    expect(starOpacity(0, 'cloud')).toBeLessThan(starOpacity(0, 'clear'));
    expect(starOpacity(0, 'fog')).toBeLessThan(starOpacity(0, 'cloud'));
  });
});
