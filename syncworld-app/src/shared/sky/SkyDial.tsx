// ──────────────────────────────────────────────
// SkyDial.tsx — world-time watch: fixed city bezel, rotating 24h sky ring,
// a small landscape in the middle. You sit at the top.
// ──────────────────────────────────────────────

import React, { useId, useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { DateTime } from 'luxon';
import { bezelAngleDeg, localMinutes, oddHour, ringRotationDeg } from './skyGeometry';
import { angleDelta, dragToUtc, pointAngleDeg } from './dialDrag';
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
  /** Overrides the default readout: big time, then up to two short lines under it. */
  readout?: { big: string; small: string; small2?: string };
};

const WEATHER_WORD = { clear: 'Clear', cloud: 'Cloudy', rain: 'Rain', fog: 'Fog' } as const;

/** Centre window radius; the ring sits just outside it. Everything is in a 200×200 box. */
export const WINDOW_R = 58;
const R0 = 62;
const R1 = 76;

/** Text sizes in dial units (×1.79 = px on a 358 px phone dial). */
export const DIAL_TEXT = { hour: 6.4, city: 6.4, sub: 6.4, sub2: 6.2 } as const;

/** Big readout: 22 units, shrunk so a long countdown still fits the ground (~92 units wide). */
export function readoutFontSize(text: string): number {
  return Math.min(22, 92 / (text.length * 0.6));
}
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

/**
 * One bezel label per time zone. Members who share a zone share a label:
 * gold if it includes you, and the tick stays dashed while any of their phones is waiting.
 */
export function bezelCities(members: DialMember[]): DialMember[] {
  const byZone = new Map<string, DialMember>();
  for (const m of members) {
    const seen = byZone.get(m.timezone);
    if (!seen) {
      byZone.set(m.timezone, { ...m });
      continue;
    }
    seen.isYou = seen.isYou || m.isYou;
    if (seen.isYou && m.isYou) seen.id = m.id;
    if (m.tick === 'dashed' || seen.tick === 'dashed') seen.tick = 'dashed';
    else if (m.tick === 'gold' && seen.tick === 'gold') seen.tick = 'gold';
    else seen.tick = seen.tick ?? m.tick;
  }
  return [...byZone.values()];
}

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
  const [a, b] = pt(80.5, h * 15);
  const [c, d] = pt(six ? 76.6 : 78.6, h * 15);
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
    small2: weather ? `${WEATHER_WORD[weather.kind]} ${weather.tempC}°`.toUpperCase() : undefined,
  };
  const odd = oddHour(localMin);
  const label = `Proposed time ${local.toFormat('h:mm a, cccc d LLLL')}`;
  const step = 15 * 60_000;
  const minUtc = props.minUtc ?? -Infinity;
  const maxUtc = props.maxUtc ?? Infinity;

  // Latest props for the responder (created once).
  const live = useRef(props);
  live.current = props;
  const viewRef = useRef<View>(null);
  const drag = useRef({ cx: 0, cy: 0, startUtc: 0, last: 0, acc: 0, current: 0, active: false });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!live.current.interactive,
        onMoveShouldSetPanResponder: () => !!live.current.interactive,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const { pageX, pageY } = e.nativeEvent;
          const d = drag.current;
          d.startUtc = live.current.utcMs;
          d.current = live.current.utcMs;
          d.acc = 0;
          d.active = false;
          viewRef.current?.measure((_x, _y, w, h, px, py) => {
            d.cx = px + w / 2;
            d.cy = py + h / 2;
            d.last = pointAngleDeg(pageX, pageY, d.cx, d.cy);
            d.active = true;
          });
        },
        onPanResponderMove: (e) => {
          const d = drag.current;
          if (!d.active) return;
          const a = pointAngleDeg(e.nativeEvent.pageX, e.nativeEvent.pageY, d.cx, d.cy);
          d.acc += angleDelta(d.last, a);
          d.last = a;
          const p = live.current;
          const next = dragToUtc(d.startUtc, d.acc, p.minUtc ?? -Infinity, p.maxUtc ?? Infinity);
          if (next !== d.current) {
            d.current = next;
            p.onChange?.(next);
          }
        },
        onPanResponderRelease: () => {
          drag.current.active = false;
          live.current.onCommit?.(drag.current.current);
        },
        onPanResponderTerminate: () => {
          drag.current.active = false;
          live.current.onCommit?.(drag.current.current);
        },
      }),
    [],
  );

  const adjust = (dir: 1 | -1) => {
    const next = Math.max(minUtc, Math.min(maxUtc, utcMs + dir * step));
    props.onChange?.(next);
    props.onCommit?.(next);
  };
  const a11y = props.interactive
    ? {
        accessibilityRole: 'adjustable' as const,
        accessibilityActions: [{ name: 'increment' as const }, { name: 'decrement' as const }],
        onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => {
          if (e.nativeEvent.actionName === 'increment') adjust(1);
          if (e.nativeEvent.actionName === 'decrement') adjust(-1);
        },
        accessibilityHint: 'Turn the ring, or swipe up or down, to change the time by 15 minutes',
        ...responder.panHandlers,
      }
    : {};

  const sizeStyle = props.size ? { width: props.size, height: props.size } : { width: '100%' as const, maxWidth: 480, aspectRatio: 1 };

  return (
    <View
      ref={viewRef}
      // A mini dial is decoration next to text that already says the time.
      accessible={full || !!props.interactive}
      accessibilityLabel={full || props.interactive ? label : undefined}
      importantForAccessibility={full || props.interactive ? 'auto' : 'no-hide-descendants'}
      {...a11y}
      style={[sizeStyle, { alignSelf: 'center' }, props.interactive ? ({ cursor: 'grab', touchAction: 'none' } as object) : null]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 200 200">
        <Defs>
          <ClipPath id={`${idPrefix}-face`}>
            <Circle cx={100} cy={100} r={WINDOW_R} />
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
              const [x, y] = pt((R0 + R1) / 2, h * 15 + ringDeg);
              const common = { x, y: y + DIAL_TEXT.hour * 0.35, fontSize: DIAL_TEXT.hour, fontFamily: SANS, textAnchor: 'middle' as const };
              return (
                <G key={txt}>
                  <SvgText {...common} stroke="rgba(10,12,20,0.8)" strokeWidth={1.6} strokeLinejoin="round" fill="none">
                    {txt}
                  </SvgText>
                  <SvgText {...common} fill="#FFFFFF">
                    {txt}
                  </SvgText>
                </G>
              );
            })}
          </G>
        ) : null}

        {/* Fixed city bezel */}
        {full
          ? bezelCities(members).map((m) => {
              const ang = bezelAngleDeg(m.timezone, youTz, utcMs);
              const [ax, ay] = pt(81.5, ang);
              const [bx, by] = pt(85, ang);
              const [tx, ty] = pt(90.5, ang);
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
                    y={ty + DIAL_TEXT.city * 0.35}
                    fontSize={DIAL_TEXT.city}
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
          <SkyScene
            localMin={localMin}
            idPrefix={idPrefix}
            weather={weather}
            animate={full}
            x={100 - WINDOW_R}
            y={100 - WINDOW_R}
            width={WINDOW_R * 2}
            height={WINDOW_R * 2}
          />
          {full ? (
            <G testID="readout">
              <SvgText x={100} y={133} fontSize={readoutFontSize(readout.big)} fontFamily={MONO} fill={odd ? ODD : INK} textAnchor="middle">
                {readout.big}
              </SvgText>
              <SvgText x={100} y={144.5} fontSize={DIAL_TEXT.sub} fontFamily={MONO} fill="#B4B7C0" textAnchor="middle">
                {readout.small}
              </SvgText>
              {readout.small2 ? (
                <SvgText x={100} y={152.5} fontSize={DIAL_TEXT.sub2} fontFamily={MONO} fill="#B4B7C0" textAnchor="middle">
                  {readout.small2}
                </SvgText>
              ) : null}
            </G>
          ) : null}
        </G>
        <Circle cx={100} cy={100} r={WINDOW_R} fill="none" stroke="rgba(233,230,223,0.28)" strokeWidth={0.4} />
      </Svg>
    </View>
  );
}
