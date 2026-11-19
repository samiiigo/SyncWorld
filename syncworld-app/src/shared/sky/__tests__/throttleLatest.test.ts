import { throttleLatest } from '../throttleLatest';

jest.useFakeTimers();

describe('throttleLatest', () => {
  it('sends the first value at once, then at most one per interval, always the latest', () => {
    const fn = jest.fn();
    const t = throttleLatest(fn, 120);
    t.push(1);
    expect(fn).toHaveBeenLastCalledWith(1);
    t.push(2);
    t.push(3);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(120);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
  });

  it('flush sends a pending value now and cancels the timer', () => {
    const fn = jest.fn();
    const t = throttleLatest(fn, 120);
    t.push(1);
    t.push(2);
    t.flush();
    expect(fn).toHaveBeenLastCalledWith(2);
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('flush with nothing pending does nothing', () => {
    const fn = jest.fn();
    const t = throttleLatest(fn, 120);
    t.push(1);
    t.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
