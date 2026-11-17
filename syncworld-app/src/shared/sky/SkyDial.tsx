// ──────────────────────────────────────────────
// SkyDial.tsx — world-time watch: fixed city bezel, rotating 24h sky ring,
// a small landscape in the middle. You sit at the top.
// ──────────────────────────────────────────────

import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { DateTime } from 'luxon';
import { bezelAngleDeg, localMinutes, oddHour, ringRotationDeg } from './skyGeometry';
import { INK, ODD, ringColor, YOU } from './skyColors';
import { SkyScene, type WeatherNow } from './SkyWindow';
import { monoFamily, sansFamily } from '../theme/brandFonts';

const SANS = sansFamily('600');
const MONO = monoFamily('600');

export type DialMember = {
  id: string;
  name: string;
  timezone: string;
  isYou: boolean;
  /** gold = phone confirmed, dashed = waiting, plain = no armed state shown. */
  tick?: 'gold' | 'dashed' | 'plain';
};

export type SkyDialProps = {
  utcMs: number;
  youTz: string;
  members: DialMember[];
  mode: 'full' | 'mini';
  /** Rendered size in px. Full mode defaults to filling the width (max 360). */
  size?: number;
  interactive?: boolean;
  onChange?: (utcMs: number) => void;
  onCommit?: (utcMs: number) => void;
  minUtc?: number;
  maxUtc?: number;
  weather?: WeatherNow | null;
  /** Overrides the default readout (local time / AM·date). */
  readout?: { big: string; small: string };
};

const R0 = 64;
const R1 = 74;
const LABELS: [number, string][] = [
  [0, '12 AM'],
  [6, '6 AM'],
  [12, '12 PM'],
  [18, '6 PM'],
];

const pt = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
};

/** "Asia/Kolkata" → "Kolkata", "America/New_York" → "New York". */
export const cityFromZone = (tz: string) => (tz.split('/').pop() ?? tz).replace(/_/g, ' ');

const RING_SEGMENTS = Array.from({ length: 96 }, (_, q) => {
  const d0 = q * 3.75;
  const d1 = d0 + 3.85;
  const [x0, y0] = pt(R1, d0);
  const [x1, y1] = pt(R1, d1);
  const [x2, y2] = pt(R0, d1);
  const [x3, y3] = pt(R0, d0);
  return {
    d: `M${x0},${y0} A${R1},${R1} 0 0 1 ${x1},${y1} L${x2},${y2} A${R0},${R0} 0 0 0 ${x3},${y3}Z`,
    fill: ringColor(q * 15 + 7.5),
  };
});

const HOUR_TICKS = Array.from({ length: 24 }, (_, h) => {
  const six = h % 6 === 0;
  const [a, b] = pt(80.2, h * 15);
  const [c, d] = pt(six ? 74.8 : 77.4, h * 15);
  return { h, x1: a, y1: b, x2: c, y2: d, six };
});

export function SkyDial(props: SkyDialProps) {
  const { utcMs, youTz, members, mode, weather } = props;
  const full = mode === 'full';
  const idPrefix = `dial${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const local = DateTime.fromMillis(utcMs, { zone: youTz });
  const localMin = localMinutes(utcMs, youTz);
  const ringDeg = ringRotationDeg(utcMs, youTz);
  const readout = props.readout ?? {
    big: local.toFormat('h:mm'),
    small: `${local.toFormat('a')} · ${local.toFormat('ccc d LLL')}`.toUpperCase(),
  };
  const odd = oddHour(localMin);
  const label = `Proposed time ${local.toFormat('h:mm a, cccc d LLLL')}`;
  const sizeStyle = props.size ? { width: props.size, height: props.size } : { width: '100%' as const, maxWidth: 360, aspectRatio: 1 };

  return (
    <View accessible accessibilityLabel={label} style={[sizeStyle, { alignSelf: 'center' }]}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">
        <Defs>
          <ClipPath id={`${idPrefix}-face`}>
            <Circle cx={100} cy={100} r={44} />
          </ClipPath>
        </Defs>

        {/* Rotating 24h sky ring */}
        <G transform={`rotate(${ringDeg} 100 100)`}>
          {RING_SEGMENTS.map((s, i) => (
            <Path key={i} d={s.d} fill={s.fill} />
          ))}
          {full
            ? HOUR_TICKS.map((t) => (
                <Line
                  key={t.h}
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke={t.six ? 'rgba(233,230,223,0.85)' : 'rgba(233,230,223,0.38)'}
                  strokeWidth={t.six ? 0.55 : 0.32}
                />
              ))
            : null}
          <Circle cx={100} cy={100} r={R0} fill="none" stroke="rgba(233,230,223,0.22)" strokeWidth={0.3} />
        </G>

        {/* Upright hour labels that ride with the ring */}
        {full ? (
          <G testID="ring-labels">
            {LABELS.map(([h, txt]) => {
              const [x, y] = pt(56.5, h * 15 + ringDeg);
              return (
                <SvgText key={txt} x={x} y={y + 1.2} fontSize={3.4} fontFamily={SANS} fill="rgba(233,230,223,0.7)" textAnchor="middle">
                  {txt}
                </SvgText>
              );
            })}
          </G>
        ) : null}

        {/* Fixed city bezel */}
        {full
          ? members.map((m) => {
              const ang = bezelAngleDeg(m.timezone, youTz, utcMs);
              const [ax, ay] = pt(81, ang);
              const [bx, by] = pt(85.5, ang);
              const [tx, ty] = pt(91.5, ang);
              const rot = ang > 90 || ang < -90 ? ang + 180 : ang;
              const mOdd = oddHour(localMinutes(utcMs, m.timezone));
              const tick = m.tick ?? 'plain';
              const tickColor = m.isYou || tick === 'gold' ? YOU : 'rgba(233,230,223,0.6)';
              return (
                <G key={m.id} testID={`city-${m.id}`}>
                  <Line
                    x1={ax}
                    y1={ay}
                    x2={bx}
                    y2={by}
                    stroke={tickColor}
                    strokeWidth={m.isYou || tick === 'gold' ? 0.9 : 0.45}
                    strokeDasharray={tick === 'dashed' ? '0.8 0.8' : undefined}
                  />
                  <SvgText
                    x={tx}
                    y={ty + 1}
                    fontSize={3.6}
                    fill={m.isYou ? YOU : mOdd ? ODD : INK}
                    textAnchor="middle"
                    fontFamily={SANS}
                    transform={`rotate(${rot} ${tx} ${ty})`}
                  >
                    {cityFromZone(m.timezone)}
                  </SvgText>
                </G>
              );
            })
          : null}

        {/* Centre landscape */}
        <G clipPath={`url(#${idPrefix}-face)`}>
          <SkyScene localMin={localMin} idPrefix={idPrefix} weather={weather} />
          {full ? (
            <G testID="readout">
              <SvgText x={100} y={126} fontSize={13} fontFamily={MONO} fill={odd ? ODD : INK} textAnchor="middle">
                {readout.big}
              </SvgText>
              <SvgText x={100} y={135} fontSize={3} fontFamily={MONO} fill="#8C8F99" textAnchor="middle">
                {readout.small}
              </SvgText>
            </G>
          ) : null}
        </G>
        <Circle cx={100} cy={100} r={44} fill="none" stroke="rgba(233,230,223,0.28)" strokeWidth={0.4} />
      </Svg>
    </View>
  );
}
