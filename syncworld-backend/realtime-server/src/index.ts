import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { realtimeServerEnv } from './config/env';
import { firebaseAdminApp } from './lib/firebaseAdmin';
import { healthRouter } from './routes/health';
import { roomLookupRouter } from './routes/roomLookup';
import { registerSocketHandlers } from './sockets/connection';
import { registerPresenceHandlers } from './sockets/presence.handlers';
import { registerProposalHandlers } from './sockets/proposal.handlers';
import { registerScrubberHandlers } from './sockets/scrubber.handlers';

if (realtimeServerEnv.SENTRY_DSN) {
  Sentry.init({
    dsn: realtimeServerEnv.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

if (realtimeServerEnv.REDIS_URL) {
  const pubClient = new Redis(realtimeServerEnv.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Redis adapter initialized for Socket.io');
}

app.use(express.json());
app.use(healthRouter);
app.use(roomLookupRouter);

Sentry.setupExpressErrorHandler(app);

registerSocketHandlers(io);
registerPresenceHandlers(io);
registerProposalHandlers(io);
registerScrubberHandlers(io);

const port = realtimeServerEnv.PORT;

httpServer.listen(port, () => {
  firebaseAdminApp;
  // Keep the Admin SDK initialized before the first socket handshake.
  console.log(`SyncWorld realtime server listening on port ${port}`);
});
