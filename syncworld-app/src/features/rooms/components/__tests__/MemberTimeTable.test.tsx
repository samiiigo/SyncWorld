import React from 'react';
import { render } from '@testing-library/react-native';
import { MemberTimeTable } from '../MemberTimeTable';

const T = Date.UTC(2026, 10, 18, 5, 15); // 9:15 AM Dubai, 2:15 PM Tokyo, 5:15 AM London

const members = [
  { id: 'a', name: 'Hana Ali', timezone: 'Asia/Dubai', isYou: true },
  { id: 'b', name: 'Priya Sharma', timezone: 'Europe/London', isYou: false },
  { id: 'c', name: 'Kenji Sato', timezone: 'Asia/Tokyo', isYou: false },
];

describe('MemberTimeTable', () => {
  it('shows each local time and marks odd hours with a word', async () => {
    const { getByText, queryAllByText } = await render(<MemberTimeTable members={members} utcMs={T} />);
    expect(getByText('9:15 AM')).toBeTruthy();
    expect(getByText('5:15 AM')).toBeTruthy();
    expect(getByText('2:15 PM')).toBeTruthy();
    expect(queryAllByText('early')).toHaveLength(1);
  });

  it('shows a status column when given', async () => {
    const { getByText } = await render(<MemberTimeTable members={members} utcMs={T} status={{ a: 'Agreed', b: 'Waiting' }} />);
    expect(getByText('Agreed')).toBeTruthy();
    expect(getByText('Waiting')).toBeTruthy();
  });
});
