import { io as Client } from 'socket.io-client';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from '../sockets/connection';

describe('Handshake Rejection', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  let port: number;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    registerSocketHandlers(io);
    httpServer.listen(() => {
      port = (httpServer.address() as any).port;
      done();
    });
  });

  afterAll(() => {
    io.close();
  });

  it('should reject connection without auth token', (done) => {
    clientSocket = Client(`http://localhost:${port}`);
    clientSocket.on('connect_error', (err: any) => {
      expect(err.message).toMatch(/Authentication error|token/i);
      clientSocket.disconnect();
      done();
    });
  });
});
