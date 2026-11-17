import React from 'react';
import { render } from '@testing-library/react-native';
import { SkyDial } from '../SkyDial';

const T = Date.UTC(2026, 10, 18, 5, 15); // 9:15 AM in Dubai

describe('SkyDial', () => {
  it('labels the dial with the shown time in your zone', () => {
    const { getByLabelText } = render(<SkyDial utcMs={T} youTz="Asia/Dubai" members={[]} mode="full" />);
    expect(getByLabelText(/9:15 AM/)).toBeTruthy();
  });

  it('full mode draws ring labels and city labels', () => {
    const members = [
      { id: 'a', name: 'Hana', timezone: 'Asia/Dubai', isYou: true },
      { id: 'b', name: 'Kenji', timezone: 'Asia/Tokyo', isYou: false },
    ];
    const { getByTestId } = render(<SkyDial utcMs={T} youTz="Asia/Dubai" members={members} mode="full" />);
    expect(getByTestId('ring-labels')).toBeTruthy();
    expect(getByTestId('city-b')).toBeTruthy();
  });

  it('mini mode hides ring labels, cities and readout', () => {
    const { queryByTestId } = render(
      <SkyDial utcMs={T} youTz="Asia/Dubai" members={[{ id: 'b', name: 'K', timezone: 'Asia/Tokyo', isYou: false }]} mode="mini" />,
    );
    expect(queryByTestId('ring-labels')).toBeNull();
    expect(queryByTestId('city-b')).toBeNull();
    expect(queryByTestId('readout')).toBeNull();
  });
});
