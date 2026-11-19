// ──────────────────────────────────────────────
// aiService.ts — Service for interacting with Gemini AI via Firebase Functions
// ──────────────────────────────────────────────

import { httpsCallable } from 'firebase/functions';

import { loadEnvConfig } from '@/config/env';
import { getFirebase } from '@/shared/lib/firebase/firebase.app';

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
  memberLocalBreakdown: {
    displayName: string;
    timezone: string;
    localTime: string;
    isWorkingHour: boolean;
  }[];
}


/** Calls an AI Cloud Function; null in demo mode so callers use the local fallback. */
async function callAi<T>(name: string, data: unknown): Promise<T | null> {
  if (loadEnvConfig().demoMode) return null;
  const result = await httpsCallable(getFirebase().functions, name)(data);
  return result.data as T;
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

    const live = await callAi<{ slots: RecommendedSlot[]; insights: string }>('optimizeSchedule', {
      members,
      baseTimestamp,
      meetingType,
      customPreferences,
    });
    if (live) return live;
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

    const live = await callAi<any>('parseNaturalLanguageSchedule', {
      prompt,
      members,
      baseTimestamp,
      userTimezone,
    });
    if (live) return live;
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
    const live = await callAi<any>('getTimezoneInsights', { members });
    if (live) return live;
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
