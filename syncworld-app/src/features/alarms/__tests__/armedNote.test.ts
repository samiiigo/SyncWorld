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

describe('blocked beats armed (live backend marks a blocked phone armed too)', () => {
  const { memberAlarmState } = require('../armedNote');
  it('names a member whose phone is armed but refused alarms', () => {
    const marcus = m({ id: 'mr', name: 'Marcus Reid', alarmArmed: true, alarmBlocked: true });
    expect(armedNote([m({ id: 'a', alarmArmed: true }), marcus])).toBe("Marcus hasn't allowed alarms yet");
    expect(memberAlarmState(marcus)).toBe('blocked');
  });
  it('maps the other states', () => {
    expect(memberAlarmState(m({ alarmArmed: true }))).toBe('ready');
    expect(memberAlarmState(m({}))).toBe('waiting');
  });
});

describe('isUp', () => {
  const { isUp } = require('../armedNote');
  const ALARM = 1_000_000;
  it('counts only a wake receipt from this alarm that has happened', () => {
    expect(isUp(m({ wokeAt: null }), ALARM, ALARM + 60_000)).toBe(false);
    expect(isUp(m({ wokeAt: ALARM - 3_600_000 }), ALARM, ALARM + 60_000)).toBe(false); // last round
    expect(isUp(m({ wokeAt: ALARM + 10_000 }), ALARM, ALARM + 60_000)).toBe(true);
    expect(isUp(m({ wokeAt: ALARM + 90_000 }), ALARM, ALARM + 60_000)).toBe(false); // demo: not yet
    expect(isUp(m({ wokeAt: ALARM + 10_000, isYou: true }), ALARM, ALARM + 60_000)).toBe(false);
  });
});
