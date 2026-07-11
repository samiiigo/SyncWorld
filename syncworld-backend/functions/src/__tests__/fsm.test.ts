import { transitionRoomStatusInputSchema } from '../lib/validation';

describe('FSM Logic - Validation', () => {
  it('should reject invalid status transitions', () => {
    const result = transitionRoomStatusInputSchema.safeParse({ roomId: '123', targetStatus: 'INVALID_STATUS' });
    expect(result.success).toBe(false);
  });
  
  it('should accept valid status transitions', () => {
    const result = transitionRoomStatusInputSchema.safeParse({ roomId: '123', targetStatus: 'LOCKED' });
    expect(result.success).toBe(true);
  });
});
