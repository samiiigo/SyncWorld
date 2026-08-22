import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

export { createRoom } from './callable/createRoom';
export { joinRoom } from './callable/joinRoom';
export { castVote } from './callable/castVote';
export { transitionRoomStatus } from './callable/transitionRoomStatus';
export { onProposalWrite } from './triggers/onProposalWrite';
export { expireProposals } from './scheduled/expireProposals';
export { fireAlarms } from './scheduled/fireAlarms';
export { cleanupOrphanedRooms } from './scheduled/cleanupOrphanedRooms';

// AI Features
export { optimizeSchedule, parseNaturalLanguageSchedule, getTimezoneInsights } from './callable/aiFeatures';
