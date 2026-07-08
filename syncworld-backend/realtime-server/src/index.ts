import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { realtimeServerEnv } from './config/env';
import { firebaseAdminApp } from './lib/firebaseAdmin';
import { healthRouter } from './routes/health';
import { roomLookupRouter } from './routes/roomLookup';
import { registerSocketHandlers } from './sockets/connection';
import { registerPresenceHandlers } from './sockets/presence.handlers';
import { registerProposalHandlers } from './sockets/proposal.handlers';
import { registerScrubberHandlers } from './sockets/scrubber.handlers';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(express.json());
app.use(healthRouter);
app.use(roomLookupRouter);

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
