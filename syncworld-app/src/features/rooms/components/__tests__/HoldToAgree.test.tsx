import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { HoldToAgree } from '../HoldToAgree';

jest.useFakeTimers();

const setup = async (props: Partial<React.ComponentProps<typeof HoldToAgree>> = {}) => {
  const onAgree = jest.fn();
  const r = await render(<HoldToAgree onAgree={onAgree} {...props} />);
  return { onAgree, button: r.getByRole('button'), ...r };
};

describe('HoldToAgree', () => {
  it('agrees only after holding for 600 ms', async () => {
    const { onAgree, button } = await setup();
    await fireEvent(button, 'pressIn');
    await act(() => jest.advanceTimersByTime(599));
    expect(onAgree).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(1));
    expect(onAgree).toHaveBeenCalledTimes(1);
    await fireEvent(button, 'pressOut');
    await act(() => jest.advanceTimersByTime(1000));
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('letting go early cancels', async () => {
    const { onAgree, button } = await setup();
    await fireEvent(button, 'pressIn');
    await act(() => jest.advanceTimersByTime(300));
    await fireEvent(button, 'pressOut');
    await act(() => jest.advanceTimersByTime(600));
    expect(onAgree).not.toHaveBeenCalled();
  });

  it('screen readers activate at once', async () => {
    const { onAgree, button } = await setup();
    await fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const { onAgree, button } = await setup({ disabled: true });
    await fireEvent(button, 'pressIn');
    await act(() => jest.advanceTimersByTime(1000));
    await fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onAgree).not.toHaveBeenCalled();
  });
});
