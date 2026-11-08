"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.castVoteInputSchema = exports.transitionRoomStatusInputSchema = exports.joinRoomInputSchema = exports.createRoomInputSchema = void 0;
const zod_1 = require("zod");
exports.createRoomInputSchema = zod_1.z.object({
    roomName: zod_1.z.string().min(1).max(64),
    participantCap: zod_1.z.number().int().min(2).max(50).nullable().optional(),
    timezone: zod_1.z.string().min(1),
    displayName: zod_1.z.string().min(1).max(64).nullable().optional(),
});
exports.joinRoomInputSchema = zod_1.z.object({
    roomCode: zod_1.z.string().min(6).max(6),
    timezone: zod_1.z.string().min(1),
    displayName: zod_1.z.string().min(1).max(64),
});
exports.transitionRoomStatusInputSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(1),
    targetStatus: zod_1.z.enum(['OPEN', 'PROPOSING', 'VOTING', 'LOCKED', 'FIRED']),
});
exports.castVoteInputSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(1),
    proposalId: zod_1.z.string().min(1),
    choice: zod_1.z.enum(['accept', 'reject']),
});
