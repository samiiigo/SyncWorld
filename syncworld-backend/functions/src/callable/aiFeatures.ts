import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import type { z } from 'zod';
import { assertWithinRateLimit } from '../lib/rateLimit';
import {
  getTimezoneInsightsInputSchema,
  optimizeScheduleInputSchema,
  parseNaturalLanguageScheduleInputSchema,
} from '../lib/validation';

/** Shared hourly budget across all AI callables, per user. Gemini calls cost money. */
export const AI_RATE_LIMIT_PER_HOUR = 30;

/** Auth check, input validation, then rate limit. Returns the parsed payload. */
async function guardAiRequest<S extends z.ZodTypeAny>(request: CallableRequest, schema: S): Promise<z.output<S>> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use AI features.');
  }
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid AI request payload.');
  }
  await assertWithinRateLimit(request.auth.uid, 'ai', AI_RATE_LIMIT_PER_HOUR);
  return parsed.data;
}

/**
 * Plain-writing rules appended to every prompt whose output users read.
 * Distilled from the unslop taboo list (github.com/theclaymethod/unslop).
 */
export const WRITING_RULES = `Writing rules for every string you return:
- Plain, specific sentences. Name the member, city, local time or UTC time you mean.
- Say only what follows from the times and time zones above. Do not invent facts about the team.
- No hype or filler words: "seamless", "optimal", "golden", "harmony", "leverage", "robust", "crucial", "ensure", "delve", "navigate", "landscape", "elevate".
- No opener like "Great question", "Certainly" or "Here's". No closing summary or moral.
- No "not X but Y" contrasts, no rhetorical questions, no exclamation marks, no emoji.
- Use commas or periods instead of em dashes. Use sentence case for labels.
- Labels are at most 4 words and describe the time, e.g. "Tue 3 PM London".`;

/** Note shown in place of AI text when no Gemini key is configured. */
const NO_AI_NOTE = 'AI suggestions are off (no Gemini API key), so this is a placeholder, not based on your members.';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Using fallback heuristic responses.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
};

export const optimizeSchedule = onCall(async (request) => {
  const { members, baseTimestamp = Date.now(), meetingType, customPreferences } = await guardAiRequest(
    request,
    optimizeScheduleInputSchema,
  );
  const ai = getGeminiClient();

  const memberSummary = members.map((m) => `${m.displayName || 'Member'} (${m.timezone || 'UTC'})`).join(', ');

  if (!ai) {
    const now = typeof baseTimestamp === 'number' ? baseTimestamp : Date.now();
    return {
      slots: [
        {
          targetTimeUtc: now + 3 * 3600 * 1000,
          label: 'In 3 hours',
          harmonyScore: 92,
          reasoning: NO_AI_NOTE,
          clashes: 0,
        },
        {
          targetTimeUtc: now + 14 * 3600 * 1000,
          label: 'In 14 hours',
          harmonyScore: 88,
          reasoning: NO_AI_NOTE,
          clashes: 1,
        },
      ],
      insights: NO_AI_NOTE,
      source: 'heuristic',
    };
  }

  const prompt = `You pick meeting times for a group spread across time zones.
Current Base UTC Epoch Milliseconds: ${baseTimestamp} (Current Date: ${new Date(baseTimestamp).toUTCString()}).
Team Members & Timezones: ${memberSummary}.
Meeting Type: ${meetingType}.
Special User Preferences: ${customPreferences || 'Maximize waking/working hours overlap (9 AM - 6 PM local, minimize waking before 7 AM or sleeping after 11 PM).'}.

Analyze all participants' timezones and recommend the top 3 best meeting time slots within the next 48 hours.
Calculate the exact UTC timestamp in milliseconds for each recommendation.
Score each slot 0-100 in harmonyScore (higher means fewer people outside 9 AM-6 PM local), count sleepClashes (how many people would be asleep), and give the reason in one or two sentences that name who is early or late.

${WRITING_RULES}

Return ONLY a JSON object matching this schema:
{
  "recommendations": [
    {
      "targetTimeUtc": number,
      "label": string,
      "harmonyScore": number,
      "reasoning": string,
      "sleepClashes": number,
      "memberLocalBreakdown": [
        { "displayName": string, "timezone": string, "localTime": string, "isWorkingHour": boolean }
      ]
    }
  ],
  "teamInsight": string
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { recommendations: [], teamInsight: text };
    }

    return {
      slots: data.recommendations || [],
      insights: data.teamInsight || '',
      source: 'gemini-3.7-flash',
    };
  } catch (error: any) {
    console.error('AI optimize error:', error);
    throw new HttpsError('internal', 'Failed to optimize schedule with AI.');
  }
});

export const parseNaturalLanguageSchedule = onCall(async (request) => {
  const { prompt: userPrompt, members, baseTimestamp = Date.now(), userTimezone } = await guardAiRequest(
    request,
    parseNaturalLanguageScheduleInputSchema,
  );

  const ai = getGeminiClient();
  const now = typeof baseTimestamp === 'number' ? baseTimestamp : Date.now();
  const memberSummary = members.map((m) => `${m.displayName || 'Member'} (${m.timezone || 'UTC'})`).join(', ');

  if (!ai) {
    return {
      targetTimeUtc: now + 4 * 3600 * 1000,
      formattedUtc: new Date(now + 4 * 3600 * 1000).toUTCString(),
      explanation: `Could not read "${userPrompt}": AI is off (no Gemini API key). Showing 4 hours from now as a placeholder.`,
      harmonyScore: 85,
      source: 'heuristic',
    };
  }

  const systemPrompt = `You turn a typed time request into an exact UTC time.
Current Reference Time: UTC ${new Date(now).toUTCString()} (Epoch ms: ${now}).
User's Local Timezone: ${userTimezone}.
Team Members & Timezones: ${memberSummary}.
User Request: "${userPrompt}".

Parse the user's intent to find the exact target UTC time (in epoch milliseconds) they are referring to or requesting.
If they specify a relative time (e.g., "tomorrow at 3 PM in Tokyo", "in 2 hours", "next Tuesday 9am PST", "best time tonight for everyone"), calculate the exact UTC epoch timestamp in milliseconds.
In "explanation", say in one sentence how you read the request and what local time that is for each member.

${WRITING_RULES}

Respond ONLY with a JSON object:
{
  "targetTimeUtc": number,
  "formattedUtc": string,
  "explanation": string,
  "harmonyScore": number,
  "isOptimalForTeam": boolean,
  "notes": string
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    return {
      ...parsed,
      source: 'gemini-3.7-flash',
    };
  } catch (error: any) {
    console.error('AI natural language schedule error:', error);
    throw new HttpsError('internal', 'Failed to parse natural language schedule.');
  }
});

export const getTimezoneInsights = onCall(async (request) => {
  const { members } = await guardAiRequest(request, getTimezoneInsightsInputSchema);
  const ai = getGeminiClient();

  if (!ai || members.length === 0) {
    return {
      insights: [
        NO_AI_NOTE,
        'Clocks change for Daylight Saving Time in March and in October or November, depending on the country. Check times again around those dates.',
      ],
      goldenWindow: '14:00-17:00 UTC (placeholder)',
      recommendation: 'Take turns with the early or late slot so the same person is not always the one losing sleep.',
    };
  }

  const memberSummary = members.map((m) => `${m.displayName || 'Member'} in ${m.timezone}`).join(', ');

  const prompt = `This group is spread across time zones: ${memberSummary}.
Write 3 short tips, one sentence each:
1. The hours when everyone is awake, in UTC and in each member's local time.
2. Who would lose sleep at the usual meeting hours, and how to avoid it.
3. One practical habit for these specific time zones.
In "goldenWindow", give only the shared hours, e.g. "14:00-17:00 UTC".

${WRITING_RULES}

Return JSON:
{
  "insights": [ "string" ],
  "goldenWindow": "string",
  "recommendation": "string"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const data = JSON.parse(response.text || '{}');
    return data;
  } catch (error: any) {
    console.error('AI timezone insights error:', error);
    throw new HttpsError('internal', 'Failed to generate insights.');
  }
});
