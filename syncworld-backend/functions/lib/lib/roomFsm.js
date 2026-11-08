"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOM_TRANSITIONS = void 0;
exports.isValidTransition = isValidTransition;
// Keep this table aligned with syncworld-app/src/constants/room.constants.ts.
exports.ROOM_TRANSITIONS = [
    { from: 'OPEN', to: 'PROPOSING', trigger: 'scrubber_confirmed' },
    { from: 'PROPOSING', to: 'VOTING', trigger: 'proposal_created' },
    { from: 'VOTING', to: 'LOCKED', trigger: 'consensus_reached' },
    { from: 'VOTING', to: 'OPEN', trigger: 'proposal_rejected' },
    { from: 'VOTING', to: 'OPEN', trigger: 'proposal_expired' },
    { from: 'VOTING', to: 'OPEN', trigger: 'quorum_lost' },
    { from: 'LOCKED', to: 'FIRED', trigger: 'alarm_fired' },
    { from: 'LOCKED', to: 'OPEN', trigger: 'alarm_cancelled' },
];
function isValidTransition(currentStatus, targetStatus) {
    return exports.ROOM_TRANSITIONS.some((transition) => transition.from === currentStatus && transition.to === targetStatus);
}
