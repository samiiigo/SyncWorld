import functionsTestInit from 'firebase-functions-test';
import { HttpsError } from 'firebase-functions/v2/https';

const testEnv = functionsTestInit();

jest.mock('../lib/firebaseAdmin', () => ({ firebaseAdminFirestore: {} }));

const assertWithinRateLimit = jest.fn();
jest.mock('../lib/rateLimit', () => ({
  assertWithinRateLimit: (...args: unknown[]) => assertWithinRateLimit(...args),
}));

import {
  AI_RATE_LIMIT_PER_HOUR,
  getTimezoneInsights,
  optimizeSchedule,
  parseNaturalLanguageSchedule,
} from '../callable/aiFeatures';

// No GEMINI_API_KEY in tests, so every callable takes its heuristic fallback path.
const auth = { uid: 'user-1' };
const members = [
  { uid: 'u1', displayName: 'Ana', timezone: 'America/New_York' },
  { uid: 'u2', displayName: 'Kenji', timezone: 'Asia/Tokyo' },
];

describe('AI callables', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeAll(() => {
    delete process.env.GEMINI_API_KEY;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    assertWithinRateLimit.mockReset().mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalKey;
    testEnv.cleanup();
  });

  it.each([
    ['optimizeSchedule', optimizeSchedule],
    ['parseNaturalLanguageSchedule', parseNaturalLanguageSchedule],
    ['getTimezoneInsights', getTimezoneInsights],
  ])('%s rejects unauthenticated callers', async (_name, fn) => {
    const wrapped = testEnv.wrap(fn as any);
    await expect(wrapped({ data: { prompt: 'x' }, auth: undefined } as any)).rejects.toThrow(HttpsError);
    expect(assertWithinRateLimit).not.toHaveBeenCalled();
  });

  it('rate-limits under a shared "ai" key', async () => {
    const wrapped = testEnv.wrap(optimizeSchedule as any);
    await wrapped({ data: { members }, auth } as any);
    expect(assertWithinRateLimit).toHaveBeenCalledWith('user-1', 'ai', AI_RATE_LIMIT_PER_HOUR);
  });

  it('propagates rate-limit rejection', async () => {
    assertWithinRateLimit.mockRejectedValue(new HttpsError('resource-exhausted', 'Rate limit exceeded'));
    const wrapped = testEnv.wrap(getTimezoneInsights as any);
    await expect(wrapped({ data: { members }, auth } as any)).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('rejects an empty natural-language prompt', async () => {
    const wrapped = testEnv.wrap(parseNaturalLanguageSchedule as any);
    await expect(wrapped({ data: { prompt: '   ', members }, auth } as any)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(assertWithinRateLimit).not.toHaveBeenCalled();
  });

  it('rejects oversized prompts and member lists', async () => {
    const wrapped = testEnv.wrap(parseNaturalLanguageSchedule as any);
    await expect(wrapped({ data: { prompt: 'a'.repeat(501) }, auth } as any)).rejects.toMatchObject({
      code: 'invalid-argument',
    });

    const tooMany = Array.from({ length: 51 }, (_, i) => ({ timezone: 'UTC', displayName: `m${i}` }));
    const optimize = testEnv.wrap(optimizeSchedule as any);
    await expect(optimize({ data: { members: tooMany }, auth } as any)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rejects members with a non-string timezone', async () => {
    const wrapped = testEnv.wrap(getTimezoneInsights as any);
    await expect(wrapped({ data: { members: [{ timezone: 42 }] }, auth } as any)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('returns heuristic slots for a valid request without an API key', async () => {
    const wrapped = testEnv.wrap(optimizeSchedule as any);
    const result = await wrapped({ data: { members, baseTimestamp: 1_700_000_000_000 }, auth } as any);
    expect(result.source).toBe('heuristic');
    expect(result.slots[0].targetTimeUtc).toBe(1_700_000_000_000 + 3 * 3600 * 1000);
  });
});
