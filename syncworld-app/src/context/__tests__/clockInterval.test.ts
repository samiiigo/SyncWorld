import { clockIntervalMs } from '../clockInterval';

describe('clockIntervalMs', () => {
  it('ticks every second while a vote or an alarm is counting down', () => {
    expect(clockIntervalMs('VOTING')).toBe(1000);
    expect(clockIntervalMs('LOCKED')).toBe(1000);
    expect(clockIntervalMs('FIRED')).toBe(1000);
  });
  it('slows down when nothing is counting down', () => {
    expect(clockIntervalMs('OPEN')).toBe(30_000);
    expect(clockIntervalMs('PROPOSING')).toBe(30_000);
    expect(clockIntervalMs(undefined)).toBe(30_000);
  });
});
