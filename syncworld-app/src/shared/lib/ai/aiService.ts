// ──────────────────────────────────────────────
// aiService.ts — Service for interacting with Gemini AI via Firebase Functions
// ──────────────────────────────────────────────

// TODO: import { getFunctions, httpsCallable } from 'firebase/functions';
// TODO: import { getApp } from 'firebase/app';

export interface AIAssistantMember {
  uid: string;
  displayName: string;
  timezone: string;
}

export interface RecommendedSlot {
  targetTimeUtc: number;
  label: string;
  harmonyScore: number;
  reasoning: string;
  sleepClashes: number;
  memberLocalBreakdown: Array<{
    displayName: string;
    timezone: string;
    localTime: string;
    isWorkingHour: boolean;
  }>;
}

export const aiService = {
  /**
   * Calls the optimizeSchedule Firebase Function
   */
  async optimizeSchedule(
    members: AIAssistantMember[],
    baseTimestamp: number,
    meetingType: string,
    customPreferences: string
  ): Promise<{ slots: RecommendedSlot[]; insights: string }> {
    // Mock implementation until Firebase is fully connected in the client
    // const functions = getFunctions(getApp());
    // const optimizeFn = httpsCallable(functions, 'optimizeSchedule');
    // const result = await optimizeFn({ members, baseTimestamp, meetingType, customPreferences });
    // return result.data as any;

    console.warn('[aiService] Mock optimizeSchedule called. Connecting to actual function pending Firebase setup.');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          slots: [
            {
              targetTimeUtc: baseTimestamp + 3 * 3600 * 1000,
              label: 'Immediate Overlap Window',
              harmonyScore: 92,
              reasoning: 'Balanced window where most members are within waking & working hours.',
              sleepClashes: 0,
              memberLocalBreakdown: []
            }
          ],
          insights: 'Generated using local mock.'
        });
      }, 1000);
    });
  },

  /**
   * Calls the parseNaturalLanguageSchedule Firebase Function
   */
  async parseNaturalLanguage(
    prompt: string,
    members: AIAssistantMember[],
    baseTimestamp: number,
    userTimezone: string
  ): Promise<any> {
    // const functions = getFunctions(getApp());
    // const parseFn = httpsCallable(functions, 'parseNaturalLanguageSchedule');
    // const result = await parseFn({ prompt, members, baseTimestamp, userTimezone });
    // return result.data;

    console.warn('[aiService] Mock parseNaturalLanguage called.');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          targetTimeUtc: baseTimestamp + 4 * 3600 * 1000,
          formattedUtc: new Date(baseTimestamp + 4 * 3600 * 1000).toUTCString(),
          explanation: `Parsed prompt: "${prompt}".`,
          harmonyScore: 85,
        });
      }, 800);
    });
  },

  /**
   * Calls the getTimezoneInsights Firebase Function
   */
  async getTimezoneInsights(members: AIAssistantMember[]): Promise<any> {
    // const functions = getFunctions(getApp());
    // const insightsFn = httpsCallable(functions, 'getTimezoneInsights');
    // const result = await insightsFn({ members });
    // return result.data;

    console.warn('[aiService] Mock getTimezoneInsights called.');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          insights: [
            'Most team members are distributed across Americas and Europe/Asia.',
            'The golden overlap window is typically 14:00 - 17:00 UTC.',
          ],
          goldenWindow: '14:00 - 17:00 UTC',
          recommendation: 'Rotate inconvenient meeting times weekly.'
        });
      }, 600);
    });
  }
};
