// ──────────────────────────────────────────────
// SkyWindow.tsx — the small landscape in the middle of the dial:
// sky above the horizon (y = 108), sun or crescent moon on an arc that
// leaves the frame, stars at night, ground below. Dial space is 200×200.
// ──────────────────────────────────────────────

import React, { useEffect, useMemo } from 'react';
import { Circle, Defs, G, Line, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { GROUND, skyAt } from './skyColors';
import { bodyPosition } from './skyGeometry';
import { starField, starOpacity } from './stars';

export type WeatherNow = { kind: 'clear' | 'cloud' | 'rain' | 'fog'; tempC: number };

export const HORIZON_Y = 108;

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);

type SkySceneProps = {
  /** Local minutes after midnight for the place being shown. */
  localMin: number;
  /** Unique per instance; used for gradient and mask ids. */
  idPrefix: string;
  weather?: WeatherNow | null;
  /** Twinkle and shooting star. Always off when the OS asks for reduced motion. */
  animate?: boolean;
  /** Area to fill, in dial units. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

const STARS = starField(7, 22, 58, 104);
const SHOOT_LEN = 52;

function Twinkle({ children }: { children: React.ReactNode }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(0.35, { duration: 1600 }), withTiming(1, { duration: 1600 })), -1);
  }, [o]);
  const props = useAnimatedProps(() => ({ opacity: o.value }));
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

/** One streak every ~12 s, drawn by moving the dash along a fixed line. */
function ShootingStar() {
  const off = useSharedValue(SHOOT_LEN);
  useEffect(() => {
    off.value = withRepeat(
      withSequence(
        withTiming(SHOOT_LEN, { duration: 0 }),
        withDelay(11000, withTiming(-SHOOT_LEN, { duration: 900, easing: Easing.out(Easing.quad) })),
      ),
      -1,
    );
  }, [off]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: off.value }));
  return (
    <AnimatedLine
      testID="shooting-star"
      x1={70}
      y1={66}
      x2={118}
      y2={88}
      stroke="#fff"
      strokeWidth={0.5}
      strokeLinecap="round"
      strokeDasharray={`${SHOOT_LEN * 0.4} ${SHOOT_LEN * 2}`}
      animatedProps={props}
    />
  );
}

/** Sky, sun or moon, stars, horizon and ground. Callers clip it. */
export function SkyScene({ localMin, idPrefix, weather, animate = true, x = 56, y = 56, width = 88, height = 88 }: SkySceneProps) {
  const reduced = useReducedMotion();
  const moving = animate && !reduced;
  const sky = skyAt(localMin);
  const kind = weather?.kind ?? 'clear';
  const body = bodyPosition(localMin);
  const stars = starOpacity(localMin, kind);
  const gradId = `${idPrefix}-sky`;
  const maskId = `${idPrefix}-crescent`;
  const bodyDim = kind === 'clear' ? 1 : kind === 'cloud' ? 0.75 : 0.5;

  const [still, twinkling] = useMemo(() => [STARS.filter((_, i) => i % 3 !== 0), STARS.filter((_, i) => i % 3 === 0)], []);
  const dots = (list: typeof STARS) => list.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" />);

  return (
    <G>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky.top} />
          <Stop offset="1" stopColor={sky.bottom} />
        </LinearGradient>
        <Mask id={maskId} x="-10" y="-10" width="20" height="20" maskUnits="userSpaceOnUse">
          <Circle cx={0} cy={0} r={5.2} fill="#fff" />
          <Circle cx={2.4} cy={-1.4} r={4.6} fill="#000" />
        </Mask>
      </Defs>
      <Rect x={x} y={y} width={width} height={HORIZON_Y - y} fill={`url(#${gradId})`} />

      {stars > 0.02 ? (
        <G testID="stars" opacity={stars}>
          {dots(still)}
          {moving ? <Twinkle>{dots(twinkling)}</Twinkle> : dots(twinkling)}
          {moving && stars > 0.8 && kind === 'clear' ? <ShootingStar /> : null}
        </G>
      ) : null}

      {body.kind === 'sun' ? (
        <G testID="sun" transform={`translate(${body.x} ${body.y})`} opacity={bodyDim}>
          <Circle r={7.2} fill="none" stroke="rgba(255,214,120,0.35)" strokeWidth={0.5} />
          <Circle r={5} fill="#F6C453" />
        </G>
      ) : (
        <G testID="moon" transform={`translate(${body.x} ${body.y}) rotate(-20)`} opacity={kind === 'clear' ? 1 : 0.55}>
          <Circle r={5.2} fill="#E8E5D8" mask={`url(#${maskId})`} />
        </G>
      )}

      <Rect x={x} y={HORIZON_Y} width={width} height={y + height - HORIZON_Y} fill={GROUND} />
      <Line x1={x} y1={HORIZON_Y} x2={x + width} y2={HORIZON_Y} stroke="rgba(233,230,223,0.35)" strokeWidth={0.35} />
    </G>
  );
}
