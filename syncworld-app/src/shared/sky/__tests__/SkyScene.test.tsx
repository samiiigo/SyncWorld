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

  it.each(['cloud', 'rain', 'fog'] as const)('draws %s weather', (kind) => {
    expect(scene(720, { weather: { kind, tempC: 10 } }).queryByTestId(`weather-${kind}`)).toBeTruthy();
  });

  it('draws nothing extra for a clear sky', () => {
    const r = scene(720, { weather: { kind: 'clear', tempC: 30 } });
    expect(r.queryByTestId('weather-cloud')).toBeNull();
    expect(r.queryByTestId('weather-rain')).toBeNull();
    expect(r.queryByTestId('weather-fog')).toBeNull();
  });
});
