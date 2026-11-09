import { z } from 'zod';

export const createRoomInputSchema = z.object({
  roomName: z.string().min(1).max(64),
  participantCap: z.number().int().min(2).max(50).nullable().optional(),
  timezone: z.string().min(1),
  displayName: z.string().min(1).max(64).nullable().optional(),
});

export const joinRoomInputSchema = z.object({
  roomCode: z.string().min(6).max(6),
  timezone: z.string().min(1),
  displayName: z.string().min(1).max(64),
});

export const transitionRoomStatusInputSchema = z.object({
  roomId: z.string().min(1),
  targetStatus: z.enum(['OPEN', 'PROPOSING', 'VOTING', 'LOCKED', 'FIRED']),
});

export const castVoteInputSchema = z.object({
  roomId: z.string().min(1),
  proposalId: z.string().min(1),
  choice: z.enum(['accept', 'reject']),
});

// ── AI features ──

const aiMemberSchema = z.object({
  uid: z.string().max(128).optional(),
  displayName: z.string().max(64).nullable().optional(),
  timezone: z.string().min(1).max(64),
});

const aiMembersSchema = z.array(aiMemberSchema).max(50).default([]);
const baseTimestampSchema = z.number().int().positive().optional();

export const optimizeScheduleInputSchema = z.object({
  members: aiMembersSchema,
  baseTimestamp: baseTimestampSchema,
  meetingType: z.string().max(64).default('30m sync'),
  customPreferences: z.string().max(500).default(''),
});

export const parseNaturalLanguageScheduleInputSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  members: aiMembersSchema,
  baseTimestamp: baseTimestampSchema,
  userTimezone: z.string().min(1).max(64).default('UTC'),
});

export const getTimezoneInsightsInputSchema = z.object({
  members: aiMembersSchema,
});

// ── Membership and alarm delivery ──

export const leaveRoomInputSchema = z.object({
  roomId: z.string().min(1),
});

export const registerPushTokenInputSchema = z.object({
  roomId: z.string().min(1),
  /** Expo push token (iOS/Android) or FCM web registration token (browsers). */
  token: z.string().min(1).max(4096),
  kind: z.enum(['expo', 'fcm']),
  platform: z.enum(['ios', 'android', 'web']),
});

export const disarmAlarmInputSchema = z.object({
  roomId: z.string().min(1),
});
