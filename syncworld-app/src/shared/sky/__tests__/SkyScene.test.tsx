import React from 'react';
import { render } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import { SkyScene } from '../SkyWindow';

const scene = (localMin: number, extra: object = {}) =>
  render(
    <Svg viewBox="0 0 200 200">
      <SkyScene localMin={localMin} idPrefix="t" animate={false} {...extra} />
    </Svg>,
  );

describe('SkyScene', () => {
  it('shows the sun at noon and no stars', () => {
    const { queryByTestId } = scene(720);
    expect(queryByTestId('sun')).toBeTruthy();
    expect(queryByTestId('moon')).toBeNull();
    expect(queryByTestId('stars')).toBeNull();
  });

  it('shows the crescent moon and stars at midnight', () => {
    const { queryByTestId } = scene(0);
    expect(queryByTestId('moon')).toBeTruthy();
    expect(queryByTestId('sun')).toBeNull();
    expect(queryByTestId('stars')).toBeTruthy();
  });

  it('no shooting star when animation is off', () => {
    expect(scene(0).queryByTestId('shooting-star')).toBeNull();
  });
});
