import { ScrubberUpdatePayloadSchema } from '../sockets/schemas';
import { registerScrubberHandlers } from '../sockets/scrubber.handlers';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { persistenceManager } from '../lib/persistenceManager';

jest.mock('../lib/persistenceManager', () => ({
  persistenceManager: {
    queueScrubberUpdate: jest.fn(),
  },
}));

describe('Scrubber Logic & Handlers', () => {
  describe('ScrubberUpdatePayloadSchema', () => {
    it('validates correct payload', () => {
      const result = ScrubberUpdatePayloadSchema.safeParse({
        roomId: 'room-abc',
        position: Date.now() + 60000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects payload with missing roomId', () => {
      const result = ScrubberUpdatePayloadSchema.safeParse({
        position: Date.now() + 60000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects payload with non-finite position', () => {
      const result = ScrubberUpdatePayloadSchema.safeParse({
        roomId: 'room-abc',
        position: NaN,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerScrubberHandlers Socket Logic', () => {
    let mockIo: any;
    let mockSocket: any;
    let connectionHandler: (socket: any) => void;
    let scrubberUpdateHandler: (payload: any) => Promise<void>;

    beforeEach(() => {
      jest.clearAllMocks();

      mockSocket = {
        data: { uid: 'user-1', authorizedRooms: new Set(['room-1']) },
        rooms: new Set(['room-1']),
        emit: jest.fn(),
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
        on: jest.fn((event: string, handler: any) => {
          if (event === 'scrubber:update') {
            scrubberUpdateHandler = handler;
          }
        }),
      };

      mockIo = {
        on: jest.fn((event: string, handler: any) => {
          if (event === 'connection') {
            connectionHandler = handler;
          }
        }),
      };

      registerScrubberHandlers(mockIo as any);
      connectionHandler(mockSocket);
    });

    it('emits error if payload is invalid schema', async () => {
      await scrubberUpdateHandler({ roomId: '', position: 'invalid' });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid scrubber payload',
      });
    });

    it('emits error if socket is unauthenticated', async () => {
      mockSocket.data.uid = undefined;
      await scrubberUpdateHandler({
        roomId: 'room-1',
        position: Date.now() + 5000,
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthenticated socket',
      });
    });

    it('emits error if position is in the past', async () => {
      await scrubberUpdateHandler({
        roomId: 'room-1',
        position: Date.now() - 50000,
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Scrubber position out of range',
      });
    });

    it('emits error if position is beyond 48 hours in the future', async () => {
      const beyond48Hours = Date.now() + 49 * 60 * 60 * 1000;
      await scrubberUpdateHandler({
        roomId: 'room-1',
        position: beyond48Hours,
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Scrubber position out of range',
      });
    });

    it('emits error if socket has not joined the room', async () => {
      mockSocket.rooms = new Set(['different-room']);
      await scrubberUpdateHandler({
        roomId: 'room-1',
        position: Date.now() + 10000,
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Join the room before scrubbing',
      });
    });

    it('emits error if socket is not cached member of the room', async () => {
      mockSocket.data.authorizedRooms = new Set(['different-room']);
      await scrubberUpdateHandler({
        roomId: 'room-1',
        position: Date.now() + 10000,
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Room membership required',
      });
    });

    it('broadcasts scrubber:update to room and queues persistence when valid', async () => {
      const targetPosition = Date.now() + 15000;
      const mockToEmit = jest.fn();
      mockSocket.to.mockReturnValue({ emit: mockToEmit });

      await scrubberUpdateHandler({
        roomId: 'room-1',
        position: targetPosition,
      });

      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
      expect(mockToEmit).toHaveBeenCalledWith(SOCKET_EVENTS.SCRUBBER_UPDATE, {
        roomId: 'room-1',
        position: targetPosition,
      });
      expect(persistenceManager.queueScrubberUpdate).toHaveBeenCalledWith('room-1', targetPosition);
    });
  });
});
