// ──────────────────────────────────────────────
// SkyWindow.tsx — the small landscape in the middle of the dial:
// sky above the horizon (y = 108), ground below, in the dial's 200×200 space.
// ──────────────────────────────────────────────

import React from 'react';
import { Defs, G, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { GROUND, skyAt } from './skyColors';

export type WeatherNow = { kind: 'clear' | 'cloud' | 'rain' | 'fog'; tempC: number };

export const HORIZON_Y = 108;

type SkySceneProps = {
  /** Local minutes after midnight for the place being shown. */
  localMin: number;
  /** Unique per instance; used for gradient ids. */
  idPrefix: string;
  weather?: WeatherNow | null;
  /** Area to fill, in dial units. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

/** Sky, horizon and ground. Callers clip it (circle in the dial, full rect when full-bleed). */
export function SkyScene({ localMin, idPrefix, x = 56, y = 56, width = 88, height = 88 }: SkySceneProps) {
  const sky = skyAt(localMin);
  const gradId = `${idPrefix}-sky`;
  return (
    <G>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky.top} />
          <Stop offset="1" stopColor={sky.bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={x} y={y} width={width} height={HORIZON_Y - y} fill={`url(#${gradId})`} />
      <Rect x={x} y={HORIZON_Y} width={width} height={y + height - HORIZON_Y} fill={GROUND} />
      <Line x1={x} y1={HORIZON_Y} x2={x + width} y2={HORIZON_Y} stroke="rgba(233,230,223,0.35)" strokeWidth={0.35} />
    </G>
  );
}
