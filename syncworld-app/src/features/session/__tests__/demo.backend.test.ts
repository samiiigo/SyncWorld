import { createDemoBackend, DEMO_VOTE_WINDOW_MS } from '../backends/demo.backend';
import type { SessionRoom, SyncBackend } from '../session.types';

jest.useFakeTimers();

const you = { displayName: 'Jordan', timezone: 'America/Chicago' };

/** Join a pre-populated demo room and keep a live reference to its state. */
async function joinedRoom(backend: SyncBackend) {
  const summary = await backend.joinRoom({ code: 'abc123', ...you });
  let latest: SessionRoom | null = null;
  backend.watchRoom(summary.id, (room) => {
    latest = room;
  });
  return { summary, room: () => latest as unknown as SessionRoom };
}

describe('demo backend', () => {
  it('creates a room you host, then simulated members join', async () => {
    const backend = createDemoBackend({ random: () => 0.5 });
    const summary = await backend.createRoom({ name: 'Standup', cap: 4, ...you });
    expect(summary.code).toHaveLength(6);

    let room: SessionRoom | null = null;
    backend.watchRoom(summary.id, (r) => (room = r));
    expect(room!.members).toHaveLength(1);
    expect(room!.members[0]).toMatchObject({ isYou: true, isHost: true, timezone: 'America/Chicago' });

    jest.advanceTimersByTime(5000);
    // Cap of 4 is respected.
    expect(room!.members).toHaveLength(4);
    expect(new Set(room!.members.map((m) => m.timezone)).size).toBe(4);
  });

  it('refuses to propose with fewer than two members', async () => {
    const backend = createDemoBackend();
    const summary = await backend.createRoom({ name: 'Solo', cap: null, ...you });
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });
    await expect(channel.propose(Date.now() + 3600_000)).rejects.toThrow(/two members/);
  });

  it('locks only on a unanimous yes', async () => {
    const backend = createDemoBackend({ random: () => 0.1 }); // < 0.8 → everyone votes yes
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });

    await channel.propose(Date.now() + 3600_000);
    expect(room().status).toBe('VOTING');

    jest.advanceTimersByTime(15_000); // all connected simulated members voted yes
    expect(room().status).toBe('VOTING'); // still waiting for you

    await backend.vote(summary.id, room().proposal!.id, 'yes');
    expect(room().status).toBe('LOCKED');
    expect(room().proposal!.status).toBe('resolved_locked');
  });

  it('a single no vetoes immediately', async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });

    await channel.propose(Date.now() + 3600_000);
    await backend.vote(summary.id, room().proposal!.id, 'no');

    expect(room().status).toBe('OPEN');
    expect(room().proposal!.status).toBe('resolved_rejected');
  });

  it('rejects a second vote from the same member', async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });
    await channel.propose(Date.now() + 3600_000);

    await backend.vote(summary.id, room().proposal!.id, 'yes');
    await expect(backend.vote(summary.id, room().proposal!.id, 'yes')).rejects.toThrow(/already voted/);
  });

  it('expires when someone never answers', async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });
    await channel.propose(Date.now() + 3600_000);

    jest.advanceTimersByTime(DEMO_VOTE_WINDOW_MS + 1);
    expect(room().status).toBe('OPEN');
    expect(room().proposal!.status).toBe('expired');
  });

  it('arms you and then the other members after a lock', async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });
    await channel.propose(Date.now() + 3600_000);
    jest.advanceTimersByTime(15_000);
    await backend.vote(summary.id, room().proposal!.id, 'yes');

    await backend.arm(summary.id, null);
    expect(room().members.find((m) => m.isYou)!.alarmArmed).toBe(true);

    jest.advanceTimersByTime(12_000);
    // Every phone that allowed alarms arms; a blocked one never does.
    expect(room().members.filter((m) => !m.alarmBlocked).every((m) => m.alarmArmed)).toBe(true);
    expect(room().members.filter((m) => m.alarmBlocked).every((m) => !m.alarmArmed)).toBe(true);

    await backend.disarm(summary.id);
    expect(room().members.find((m) => m.isYou)!.alarmArmed).toBe(false);
  });

  it('marks Marcus as blocked and wakes the others after the alarm', async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });
    const target = Date.now() + 3600_000;
    await channel.propose(target);
    jest.advanceTimersByTime(15_000);
    await backend.vote(summary.id, room().proposal!.id, 'yes');
    jest.advanceTimersByTime(15_000);

    const marcus = room().members.find((x) => x.name.startsWith('Marcus'))!;
    expect(marcus.alarmBlocked).toBe(true);
    expect(marcus.alarmArmed).toBe(false);

    const others = room().members.filter((x) => !x.isYou && !x.alarmBlocked);
    for (const o of others) {
      expect(o.wokeAt).not.toBeNull();
      expect(o.wokeAt!).toBeGreaterThanOrEqual(target + 5_000);
      expect(o.wokeAt!).toBeLessThanOrEqual(target + 40_000);
    }
    expect(room().members.find((x) => x.isYou)!.wokeAt).toBeNull();
  });

  it('a No with a suggested time starts a new vote at that time', async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });
    const first = Date.now() + 3600_000;
    await channel.propose(first);
    const firstId = room().proposal!.id;
    jest.advanceTimersByTime(1);
    await backend.vote(summary.id, firstId, 'no', first + 3600_000);
    expect(room().status).toBe('VOTING');
    expect(room().proposal!.id).not.toBe(firstId);
    expect(room().proposal!.targetTimeUtc).toBe(first + 3600_000);
    expect(room().proposal!.votes).toEqual({});
  });

  it("setMemberStatus records that you're up", async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    await backend.setMemberStatus(summary.id, { wokeUp: true });
    expect(room().members.find((x) => x.isYou)!.wokeAt).toEqual(expect.any(Number));
    await backend.setMemberStatus(summary.id, { alarmBlocked: true });
    expect(room().members.find((x) => x.isYou)!.alarmBlocked).toBe(true);
  });

  it('a locked room opens again an hour after its alarm', async () => {
    const backend = createDemoBackend({ random: () => 0.1 });
    const { summary, room } = await joinedRoom(backend);
    const channel = backend.connectRealtime(summary.id, { onScrubber: jest.fn() });
    await channel.propose(Date.now() + 10 * 60_000);
    jest.advanceTimersByTime(15_000);
    await backend.vote(summary.id, room().proposal!.id, 'yes');
    expect(room().status).toBe('LOCKED');
    jest.advanceTimersByTime(10 * 60_000 + 59 * 60_000);
    expect(room().status).toBe('LOCKED');
    jest.advanceTimersByTime(2 * 60_000);
    expect(room().status).toBe('OPEN');
  });
});

