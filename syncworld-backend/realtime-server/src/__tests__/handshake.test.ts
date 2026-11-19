import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer, Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

const mockVerifyAuthToken = jest.fn();
const mockVerifyAppCheckToken = jest.fn();

jest.mock('../middleware/verifyAuthToken', () => ({
  verifyAuthToken: (token: string) => mockVerifyAuthToken(token),
}));

jest.mock('../middleware/verifyAppCheck', () => ({
  verifyAppCheckToken: (token: string) => mockVerifyAppCheckToken(token),
}));

jest.mock('../lib/firebaseAdmin', () => ({
  firebaseAdminApp: {},
  firebaseAdminFirestore: {},
}));

import { registerSocketHandlers } from '../sockets/connection';

describe('Realtime Server - Handshake Authentication', () => {
  let io: Server;
  let httpServer: HttpServer;
  let clientSockets: ClientSocket[] = [];
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: { origin: '*' },
    });
    registerSocketHandlers(io);
    httpServer.listen(() => {
      port = (httpServer.address() as any).port;
      done();
    });
  });

  afterEach(() => {
    clientSockets.forEach((s) => {
      if (s.connected) {
        s.disconnect();
      }
    });
    clientSockets = [];
    jest.clearAllMocks();
  });

  afterAll((done) => {
    io.close(() => {
      done();
    });
  });

  it('should reject connection when auth token is missing', (done) => {
    const client = Client(`http://localhost:${port}`, {
      autoConnect: true,
      transports: ['websocket'],
    });
    clientSockets.push(client);

    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Missing Firebase ID token/i);
      client.disconnect();
      done();
    });
  });

  it('should reject connection when auth token verification fails', (done) => {
    mockVerifyAuthToken.mockResolvedValueOnce({
      ok: false,
      error: 'Firebase ID token has expired',
    });

    const client = Client(`http://localhost:${port}`, {
      auth: { token: 'expired-token' },
      autoConnect: true,
      transports: ['websocket'],
    });
    clientSockets.push(client);

    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Firebase ID token has expired/i);
      expect(mockVerifyAuthToken).toHaveBeenCalledWith('expired-token');
      client.disconnect();
      done();
    });
  });

  it('should accept connection when auth token is valid', (done) => {
    mockVerifyAuthToken.mockResolvedValueOnce({
      ok: true,
      value: {
        uid: 'user-123',
        aud: 'syncworld-dev',
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'user-123',
        iss: 'https://securetoken.google.com/syncworld-dev',
      },
    });

    const client = Client(`http://localhost:${port}`, {
      auth: { token: 'valid-id-token' },
      autoConnect: true,
      transports: ['websocket'],
    });
    clientSockets.push(client);

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      expect(mockVerifyAuthToken).toHaveBeenCalledWith('valid-id-token');
      client.disconnect();
      done();
    });
  });

  it('should connect in warn-only mode when App Check token is missing', (done) => {
    mockVerifyAuthToken.mockResolvedValueOnce({
      ok: true,
      value: { uid: 'user-456' },
    });

    const client = Client(`http://localhost:${port}`, {
      auth: { token: 'valid-id-token-no-appcheck' },
      autoConnect: true,
      transports: ['websocket'],
    });
    clientSockets.push(client);

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });
  });
});
