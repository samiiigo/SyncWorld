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
