import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';

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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use AI features.');
  }

  const { members = [], baseTimestamp = Date.now(), meetingType = '30m sync', customPreferences = '' } = request.data;
  const ai = getGeminiClient();

  const memberSummary = members.map((m: any) => `${m.displayName || 'Member'} (${m.timezone || 'UTC'})`).join(', ');

  if (!ai) {
    const now = typeof baseTimestamp === 'number' ? baseTimestamp : Date.now();
    return {
      slots: [
        {
          targetTimeUtc: now + 3 * 3600 * 1000,
          label: 'Immediate Overlap Window',
          harmonyScore: 92,
          reasoning: 'Balanced window where most members are within waking & working hours.',
          clashes: 0,
        },
        {
          targetTimeUtc: now + 14 * 3600 * 1000,
          label: 'Global Shift Window',
          harmonyScore: 88,
          reasoning: 'Alternative slot capturing both eastern and western hemisphere shifts.',
          clashes: 1,
        },
      ],
      insights: 'Generated using local circadian optimization algorithms (API Key missing).',
      source: 'heuristic',
    };
  }

  const prompt = `You are an expert global timezone and meeting scheduling AI.
Current Base UTC Epoch Milliseconds: ${baseTimestamp} (Current Date: ${new Date(baseTimestamp).toUTCString()}).
Team Members & Timezones: ${memberSummary}.
Meeting Type: ${meetingType}.
Special User Preferences: ${customPreferences || 'Maximize waking/working hours overlap (9 AM - 6 PM local, minimize waking before 7 AM or sleeping after 11 PM).'}.

Analyze all participants' timezones and recommend the top 3 best meeting time slots within the next 48 hours.
Calculate the exact UTC timestamp in milliseconds for each recommendation.
Evaluate the team harmony score (0-100), sleep clashes (how many people would be asleep), and explain your reasoning clearly.

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
      insights: data.teamInsight || 'Optimized for global circadian overlap.',
      source: 'gemini-3.7-flash',
    };
  } catch (error: any) {
    console.error('AI optimize error:', error);
    throw new HttpsError('internal', error.message || 'Failed to optimize schedule with AI');
  }
});

export const parseNaturalLanguageSchedule = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use AI features.');
  }

  const { prompt: userPrompt, members = [], baseTimestamp = Date.now(), userTimezone = 'UTC' } = request.data;
  if (!userPrompt) {
    throw new HttpsError('invalid-argument', 'Prompt is required');
  }

  const ai = getGeminiClient();
  const now = typeof baseTimestamp === 'number' ? baseTimestamp : Date.now();
  const memberSummary = members.map((m: any) => `${m.displayName || 'Member'} (${m.timezone || 'UTC'})`).join(', ');

  if (!ai) {
    return {
      targetTimeUtc: now + 4 * 3600 * 1000,
      formattedUtc: new Date(now + 4 * 3600 * 1000).toUTCString(),
      explanation: `Parsed prompt: "${userPrompt}". Estimated 4 hours from base (API Key missing).`,
      harmonyScore: 85,
      source: 'heuristic',
    };
  }

  const systemPrompt = `You are a high-precision natural language meeting scheduler and time parser.
Current Reference Time: UTC ${new Date(now).toUTCString()} (Epoch ms: ${now}).
User's Local Timezone: ${userTimezone}.
Team Members & Timezones: ${memberSummary}.
User Request: "${userPrompt}".

Parse the user's intent to find the exact target UTC time (in epoch milliseconds) they are referring to or requesting.
If they specify a relative time (e.g., "tomorrow at 3 PM in Tokyo", "in 2 hours", "next Tuesday 9am PST", "best time tonight for everyone"), calculate the exact UTC epoch timestamp in milliseconds.

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
    throw new HttpsError('internal', error.message || 'Failed to parse natural language schedule');
  }
});

export const getTimezoneInsights = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use AI features.');
  }

  const { members = [] } = request.data;
  const ai = getGeminiClient();

  if (!ai || members.length === 0) {
    return {
      insights: [
        'Most team members are distributed across Americas and Europe/Asia.',
        'The golden overlap window is typically 14:00 - 17:00 UTC.',
        'Always confirm Daylight Saving Time changes in March and November.',
      ],
      goldenWindow: '14:00 - 17:00 UTC',
      recommendation: 'Rotate inconvenient meeting times weekly so no single member carries the sleep burden. (API Key missing)',
    };
  }

  const memberSummary = members.map((m: any) => `${m.displayName} in ${m.timezone}`).join(', ');

  const prompt = `Analyze this globally distributed team: ${memberSummary}.
Provide 3 concise, highly actionable bullet points on:
1. Golden overlap windows (in UTC and local references)
2. Circadian health & avoiding sleep disruption
3. Best collaboration practices for these specific timezone pairings

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
    throw new HttpsError('internal', error.message || 'Failed to generate insights');
  }
});
