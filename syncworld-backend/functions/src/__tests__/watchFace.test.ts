import functionsTestInit from 'firebase-functions-test';
import { HttpsError } from 'firebase-functions/v2/https';

const testEnv = functionsTestInit();

const mockCollection = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock('../lib/firebaseAdmin', () => ({
  firebaseAdminFirestore: {
    collection: (...args: any[]) => mockCollection(...args),
    runTransaction: (cb: any) => mockRunTransaction(cb),
  },
}));
jest.mock('../lib/rateLimit', () => ({ assertWithinRateLimit: jest.fn().mockResolvedValue(undefined) }));

import { isValidTransition } from '../lib/roomFsm';
import { checkCounterOffer } from '../lib/counterOffer';
import { setMemberStatusInputSchema, castVoteInputSchema } from '../lib/validation';
import { castVote } from '../callable/castVote';
import { setMemberStatus } from '../callable/setMemberStatus';
import { onProposalWrite } from '../triggers/onProposalWrite';
import { firedRoomExpired, unlockDue } from '../scheduled/unlockFiredRooms';
import { roomAfterExpiry } from '../scheduled/expireProposals';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const NOW = Date.UTC(2026, 10, 18, 5, 0);

afterAll(() => testEnv.cleanup());
beforeEach(() => jest.clearAllMocks());

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as HttpsError).code;
  }
  return 'ok';
};

describe('counter-offers', () => {
  it('accepts a counter between 1 minute and 7 days ahead', () => {
    expect(code(() => checkCounterOffer({ choice: 'reject', counterUtcMs: NOW + 60 * MIN }, NOW))).toBe('ok');
    expect(code(() => checkCounterOffer({ choice: 'reject' }, NOW))).toBe('ok');
  });

  it('rejects counter outside window', () => {
    expect(code(() => checkCounterOffer({ choice: 'reject', counterUtcMs: NOW - MIN }, NOW))).toBe('invalid-argument');
    expect(code(() => checkCounterOffer({ choice: 'reject', counterUtcMs: NOW + 8 * DAY }, NOW))).toBe('invalid-argument');
  });

  it('rejects a counter attached to an accept', () => {
    expect(code(() => checkCounterOffer({ choice: 'accept', counterUtcMs: NOW + 60 * MIN }, NOW))).toBe('invalid-argument');
  });

  it('castVote schema allows an optional integer counter', () => {
    expect(castVoteInputSchema.safeParse({ roomId: 'r', proposalId: 'p', choice: 'reject', counterUtcMs: NOW }).success).toBe(true);
    expect(castVoteInputSchema.safeParse({ roomId: 'r', proposalId: 'p', choice: 'reject', counterUtcMs: 1.5 }).success).toBe(false);
  });

  it('castVote refuses a bad counter before touching Firestore', async () => {
    const wrapped = testEnv.wrap(castVote);
    await expect(
      wrapped({
        data: { roomId: 'r', proposalId: 'p', choice: 'reject', counterUtcMs: Date.now() - MIN },
        auth: { uid: 'u1' },
        app: { appId: 'a' },
      } as any),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('a reject with a counter opens a new proposal and keeps the room voting', async () => {
    const roomUpdate = jest.fn();
    const proposalUpdate = jest.fn();
    const newProposalSet = jest.fn();
    const proposalsDoc = jest.fn((id?: string) =>
      id === 'p1'
        ? {
            update: proposalUpdate,
            collection: () => ({ get: jest.fn().mockResolvedValue({ docs: [{ data: () => ({ choice: 'reject', userId: 'u2', counterUtcMs: NOW + 60 * MIN }) }] }) }),
          }
        : { id: 'p1-counter', create: newProposalSet },
    );
    const roomRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ status: 'VOTING' }) }),
      update: roomUpdate,
      collection: jest.fn((sub: string) =>
        sub === 'members' ? { get: jest.fn().mockResolvedValue({ size: 3 }) } : { doc: proposalsDoc },
      ),
    };
    mockCollection.mockReturnValue({ doc: jest.fn().mockReturnValue(roomRef) });

    const snap = testEnv.firestore.makeDocumentSnapshot(
      { choice: 'reject', userId: 'u2', counterUtcMs: NOW + 60 * MIN },
      'rooms/room-1/proposals/p1/votes/u2',
    );
    await testEnv.wrap(onProposalWrite)({ params: { roomId: 'room-1', proposalId: 'p1', voteId: 'u2' }, data: snap } as any);

    expect(proposalUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'resolved_rejected' }));
    expect(newProposalSet).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'p1-counter', targetTimeUtc: NOW + 60 * MIN, createdBy: 'u2', status: 'active' }),
    );
    expect(roomUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'VOTING' }));
    expect(roomUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'OPEN' }));
  });
});

describe('setMemberStatus', () => {
  it('schema needs at least one field', () => {
    expect(setMemberStatusInputSchema.safeParse({ roomId: 'r' }).success).toBe(false);
    expect(setMemberStatusInputSchema.safeParse({ roomId: 'r', wokeUp: true }).success).toBe(true);
    expect(setMemberStatusInputSchema.safeParse({ roomId: 'r', alarmBlocked: false }).success).toBe(true);
  });

  const memberRefWith = (exists: boolean, update = jest.fn()) => {
    const memberRef = { get: jest.fn().mockResolvedValue({ exists }), update };
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ status: 'LOCKED' }) }),
        collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue(memberRef) }),
      }),
    });
    return update;
  };

  it('refuses non-members', async () => {
    memberRefWith(false);
    await expect(
      testEnv.wrap(setMemberStatus)({ data: { roomId: 'r', wokeUp: true }, auth: { uid: 'u1' }, app: { appId: 'a' } } as any),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('wokeUp writes wokeAt; alarmBlocked is stored as given', async () => {
    const update = memberRefWith(true);
    await testEnv.wrap(setMemberStatus)({ data: { roomId: 'r', wokeUp: true, alarmBlocked: true }, auth: { uid: 'u1' }, app: { appId: 'a' } } as any);
    const written = update.mock.calls[0][0];
    expect(written.alarmBlocked).toBe(true);
    expect(typeof written.wokeAt?.toMillis).toBe('function');
  });
});

describe('unlocking fired rooms', () => {
  it('unlocks one hour after the alarm, not before', () => {
    expect(firedRoomExpired(NOW - 61 * MIN, NOW)).toBe(true);
    expect(firedRoomExpired(NOW - 59 * MIN, NOW)).toBe(false);
  });

  it('members cannot reopen a fired room by hand (only the unlock job does)', () => {
    expect(isValidTransition('FIRED', 'OPEN')).toBe(false);
  });

  it('a fired room with no fired proposal is left alone', () => {
    expect(unlockDue([], NOW)).toBe(false);
    expect(unlockDue([NOW - 61 * MIN], NOW)).toBe(true);
    expect(unlockDue([NOW - 120 * MIN, NOW - 30 * MIN], NOW)).toBe(false);
  });
});

describe('proposal expiry', () => {
  it('reopens a voting room only when no other proposal is still active', () => {
    expect(roomAfterExpiry('VOTING', 0)).toBe('OPEN');
    expect(roomAfterExpiry('VOTING', 1)).toBeNull();
    expect(roomAfterExpiry('LOCKED', 0)).toBeNull();
  });
});

describe('counter-offer races', () => {
  const NOW2 = NOW;
  const setup = (votes: object[], createImpl: jest.Mock) => {
    const roomUpdate = jest.fn();
    const proposalUpdate = jest.fn();
    const proposalsDoc = jest.fn((id: string) =>
      id === 'p1'
        ? { update: proposalUpdate, collection: () => ({ get: jest.fn().mockResolvedValue({ docs: votes.map((v) => ({ data: () => v })) }) }) }
        : { id, create: createImpl },
    );
    const roomRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ status: 'VOTING' }) }),
      update: roomUpdate,
      collection: jest.fn((sub: string) => (sub === 'members' ? { get: jest.fn().mockResolvedValue({ size: 3 }) } : { doc: proposalsDoc })),
    };
    mockCollection.mockReturnValue({ doc: jest.fn().mockReturnValue(roomRef) });
    return { roomUpdate, proposalsDoc };
  };
  const withoutCastAt = (vote: object) => Object.fromEntries(Object.entries(vote).filter(([k]) => k !== 'castAt'));
  const fire = (vote: object, voteId: string) =>
    testEnv.wrap(onProposalWrite)({
      params: { roomId: 'room-1', proposalId: 'p1', voteId },
      // The snapshot can't hold the fake castAt; the trigger reads all votes from the mock anyway.
      data: testEnv.firestore.makeDocumentSnapshot(withoutCastAt(vote), `rooms/room-1/proposals/p1/votes/${voteId}`),
    } as any);

  const counterVote = { choice: 'reject', userId: 'u2', counterUtcMs: NOW2 + 60 * MIN, castAt: { toMillis: () => 2 } };
  const laterCounter = { choice: 'reject', userId: 'u3', counterUtcMs: NOW2 + 120 * MIN, castAt: { toMillis: () => 5 } };

  it("a Yes vote's trigger still honours another member's counter", async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const { roomUpdate, proposalsDoc } = setup([{ choice: 'accept', userId: 'u1' }, counterVote], create);
    await fire({ choice: 'accept', userId: 'u1' }, 'u1');
    expect(proposalsDoc).toHaveBeenCalledWith('p1-counter');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ targetTimeUtc: NOW2 + 60 * MIN, createdBy: 'u2' }));
    expect(roomUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'VOTING' }));
    expect(roomUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'OPEN' }));
  });

  it('two counters: the earliest wins and only one proposal is made', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const { proposalsDoc } = setup([laterCounter, counterVote], create);
    await fire(laterCounter, 'u3');
    expect(proposalsDoc.mock.calls.filter(([id]) => id !== 'p1')).toEqual([['p1-counter']]);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ targetTimeUtc: NOW2 + 60 * MIN }));
  });

  it('a re-delivered trigger does not fail or reopen the room', async () => {
    const create = jest.fn().mockRejectedValue(Object.assign(new Error('exists'), { code: 6 }));
    const { roomUpdate } = setup([counterVote], create);
    await fire(counterVote, 'u2');
    expect(roomUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'VOTING' }));
  });
});

describe('setMemberStatus wake guard', () => {
  it("refuses I'm up when the room is not ringing", async () => {
    const memberRef = { get: jest.fn().mockResolvedValue({ exists: true }), update: jest.fn() };
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ status: 'OPEN' }) }),
        collection: jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue(memberRef) }),
      }),
    });
    await expect(
      testEnv.wrap(setMemberStatus)({ data: { roomId: 'r', wokeUp: true }, auth: { uid: 'u1' }, app: { appId: 'a' } } as any),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(memberRef.update).not.toHaveBeenCalled();
  });
});

