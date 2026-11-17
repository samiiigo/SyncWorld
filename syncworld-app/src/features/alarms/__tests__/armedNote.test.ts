import { armedNote } from '../armedNote';
import type { SessionMember } from '@/features/session/session.types';

const m = (over: Partial<SessionMember>): SessionMember => ({
  id: 'x',
  name: 'Priya Sharma',
  timezone: 'Europe/London',
  status: 'online',
  isYou: false,
  isHost: false,
  alarmArmed: false,
  alarmBlocked: false,
  wokeAt: null,
  ...over,
});

describe('armedNote', () => {
  it('is null when every phone is armed', () => {
    expect(armedNote([m({ alarmArmed: true }), m({ id: 'y', alarmArmed: true })])).toBeNull();
  });

  it('names a blocked member first, by first name', () => {
    const note = armedNote([m({ id: 'p' }), m({ id: 'mr', name: 'Marcus Reid', alarmBlocked: true })]);
    expect(note).toBe("Marcus hasn't allowed alarms yet");
  });

  it('otherwise names the first unconfirmed member', () => {
    expect(armedNote([m({ id: 'a', alarmArmed: true }), m({ id: 'p' })])).toBe("Priya's phone hasn't confirmed yet");
  });

  it('ignores you', () => {
    expect(armedNote([m({ isYou: true })])).toBeNull();
  });
});

describe('countdownClock', () => {
  const { countdownClock } = require('../armedNote');
  it('formats h:mm:ss, never negative', () => {
    expect(countdownClock((10 * 3600 + 44 * 60 + 37) * 1000)).toBe('10:44:37');
    expect(countdownClock(65_000)).toBe('0:01:05');
    expect(countdownClock(-5)).toBe('0:00:00');
  });
  it('shows days past 24 hours', () => {
    expect(countdownClock((26 * 3600 + 5 * 60) * 1000)).toBe('1d 2:05:00');
  });
});
