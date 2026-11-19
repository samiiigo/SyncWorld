import { z } from 'zod';

export const JoinRoomPayloadSchema = z.object({
  roomId: z.string().min(1),
});

export const ScrubberUpdatePayloadSchema = z.object({
  roomId: z.string().min(1),
  position: z.number().finite(),
});

export const ScrubberProposalPayloadSchema = z.object({
  roomId: z.string().min(1),
  position: z.number().finite(),
  proposedBy: z.string().min(1),
});

export const PresenceHeartbeatPayloadSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1),
  timestamp: z.number().finite(),
});

export type JoinRoomPayload = z.infer<typeof JoinRoomPayloadSchema>;
export type ScrubberUpdatePayload = z.infer<typeof ScrubberUpdatePayloadSchema>;
export type ScrubberProposalPayload = z.infer<typeof ScrubberProposalPayloadSchema>;
export type PresenceHeartbeatPayload = z.infer<typeof PresenceHeartbeatPayloadSchema>;
