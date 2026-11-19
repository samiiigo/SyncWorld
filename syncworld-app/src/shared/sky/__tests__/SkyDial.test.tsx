import React from 'react';
import { render } from '@testing-library/react-native';
import { SkyDial } from '../SkyDial';

const T = Date.UTC(2026, 10, 18, 5, 15); // 9:15 AM in Dubai

describe('SkyDial', () => {
  it('labels the dial with the shown time in your zone', async () => {
    const { getByLabelText } = await render(<SkyDial utcMs={T} youTz="Asia/Dubai" members={[]} mode="full" />);
    expect(getByLabelText(/9:15 AM/)).toBeTruthy();
  });

  it('full mode draws ring labels and city labels', async () => {
    const members = [
      { id: 'a', name: 'Hana', timezone: 'Asia/Dubai', isYou: true },
      { id: 'b', name: 'Kenji', timezone: 'Asia/Tokyo', isYou: false },
    ];
    const { getByTestId } = await render(<SkyDial utcMs={T} youTz="Asia/Dubai" members={members} mode="full" />);
    expect(getByTestId('ring-labels')).toBeTruthy();
    expect(getByTestId('city-b')).toBeTruthy();
  });

  it('mini mode hides ring labels, cities and readout', async () => {
    const { queryByTestId } = await render(
      <SkyDial utcMs={T} youTz="Asia/Dubai" members={[{ id: 'b', name: 'K', timezone: 'Asia/Tokyo', isYou: false }]} mode="mini" />,
    );
    expect(queryByTestId('ring-labels')).toBeNull();
    expect(queryByTestId('city-b')).toBeNull();
    expect(queryByTestId('readout')).toBeNull();
  });
});

describe('SkyDial interaction', () => {
  const { fireEvent } = require('@testing-library/react-native');
  const Q = 15 * 60_000;

  it('screen-reader increment/decrement moves 15 minutes and commits', async () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    const { getByLabelText } = await render(
      <SkyDial utcMs={T} youTz="Asia/Dubai" members={[]} mode="full" interactive onChange={onChange} onCommit={onCommit} minUtc={T - Q} maxUtc={T + Q} />,
    );
    const dial = getByLabelText(/9:15 AM/);
    await fireEvent(dial, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(T + Q);
    expect(onCommit).toHaveBeenLastCalledWith(T + Q);
    await fireEvent(dial, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith(T - Q);
  });

  it('is not adjustable when not interactive', async () => {
    const { getByLabelText } = await render(<SkyDial utcMs={T} youTz="Asia/Dubai" members={[]} mode="full" />);
    expect(getByLabelText(/9:15 AM/).props.accessibilityRole).not.toBe('adjustable');
  });
});

describe('readable sizes', () => {
  const { readoutFontSize, DIAL_TEXT } = require('../SkyDial');
  it('a short time gets the full size, about 39 px on a 358 px dial', async () => {
    expect(readoutFontSize('9:15')).toBe(22);
    expect((readoutFontSize('9:15') * 358) / 200).toBeGreaterThanOrEqual(38);
  });
  it('a long countdown shrinks just enough to fit the ground', async () => {
    for (const t of ['10:44:37', '1d 2:05:00']) {
      const size = readoutFontSize(t);
      expect(size).toBeLessThan(22);
      expect(t.length * 0.6 * size).toBeLessThanOrEqual(92);
    }
  });
  it('labels are at least 11 px on a 358 px phone dial', async () => {
    for (const size of Object.values(DIAL_TEXT) as number[]) expect((size * 358) / 200).toBeGreaterThanOrEqual(11);
  });
});

describe('one label per city', () => {
  const { bezelCities } = require('../SkyDial');
  it('merges members in the same zone; you win the colour, any waiting phone keeps the tick dashed', async () => {
    const cities = bezelCities([
      { id: 'a', name: 'Aiko', timezone: 'Asia/Dubai', isYou: false, tick: 'gold' },
      { id: 'h', name: 'Hana', timezone: 'Asia/Dubai', isYou: true, tick: 'dashed' },
      { id: 'k', name: 'Kenji', timezone: 'Asia/Tokyo', isYou: false, tick: 'gold' },
    ]);
    expect(cities).toHaveLength(2);
    expect(cities[0]).toMatchObject({ timezone: 'Asia/Dubai', isYou: true, tick: 'dashed' });
    expect(cities[1]).toMatchObject({ timezone: 'Asia/Tokyo', tick: 'gold' });
  });
});
