import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { HoldToAgree } from '../HoldToAgree';

jest.useFakeTimers();

const setup = (props: Partial<React.ComponentProps<typeof HoldToAgree>> = {}) => {
  const onAgree = jest.fn();
  const r = render(<HoldToAgree onAgree={onAgree} {...props} />);
  return { onAgree, button: r.getByRole('button'), ...r };
};

describe('HoldToAgree', () => {
  it('agrees only after holding for 600 ms', () => {
    const { onAgree, button } = setup();
    fireEvent(button, 'pressIn');
    act(() => jest.advanceTimersByTime(599));
    expect(onAgree).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onAgree).toHaveBeenCalledTimes(1);
    fireEvent(button, 'pressOut');
    act(() => jest.advanceTimersByTime(1000));
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('letting go early cancels', () => {
    const { onAgree, button } = setup();
    fireEvent(button, 'pressIn');
    act(() => jest.advanceTimersByTime(300));
    fireEvent(button, 'pressOut');
    act(() => jest.advanceTimersByTime(600));
    expect(onAgree).not.toHaveBeenCalled();
  });

  it('screen readers activate at once', () => {
    const { onAgree, button } = setup();
    fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', () => {
    const { onAgree, button } = setup({ disabled: true });
    fireEvent(button, 'pressIn');
    act(() => jest.advanceTimersByTime(1000));
    fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onAgree).not.toHaveBeenCalled();
  });
});
