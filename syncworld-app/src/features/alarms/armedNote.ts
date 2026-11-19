// ──────────────────────────────────────────────
// armedNote.ts — the one line on the Armed screen naming who isn't ready.
// ──────────────────────────────────────────────

import type { SessionMember } from '@/features/session/session.types';

const first = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * A phone that refused alarms counts as blocked even if it registered (the
 * live backend marks every registered phone armed, with or without permission).
 */
export function memberAlarmState(m: Pick<SessionMember, 'alarmArmed' | 'alarmBlocked'>): 'blocked' | 'ready' | 'waiting' {
  if (m.alarmBlocked) return 'blocked';
  return m.alarmArmed ? 'ready' : 'waiting';
}

/** Up for this alarm: tapped "I'm up" after it rang (a receipt from an earlier round doesn't count). */
export function isUp(m: Pick<SessionMember, 'isYou' | 'wokeAt'>, alarmUtc: number, now: number): boolean {
  return !m.isYou && m.wokeAt != null && m.wokeAt >= alarmUtc && m.wokeAt <= now;
}

/** null when every other phone has its alarm set. A blocked phone is named before an unconfirmed one. */
export function armedNote(members: SessionMember[]): string | null {
  const others = members.filter((m) => !m.isYou && memberAlarmState(m) !== 'ready');
  const blocked = others.find((m) => m.alarmBlocked);
  if (blocked) return `${first(blocked.name)} hasn't allowed alarms yet`;
  const waiting = others[0];
  return waiting ? `${first(waiting.name)}'s phone hasn't confirmed yet` : null;
}

/** Countdown for the dial centre: "10:44:37", or "1d 2:05:00" past a day. */
export function countdownClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hms = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}
