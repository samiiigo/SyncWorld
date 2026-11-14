import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'react-native-reanimated';
import { DateTime } from 'luxon';
import * as THREE from 'three';

import { GLBoundary, canUseWebGL, hexToRgb } from './GLBoundary';
import { atmosphereFragment, globeFragment, globeVertex } from './shaders';
import { subsolarPoint } from './sky';

export type GlobePin = { id: string; timezone: string; isYou?: boolean };

type Props = {
  pins?: GlobePin[];
  /** Moment whose sunlight is drawn (epoch ms). Defaults to now, refreshed each minute. */
  at?: number;
  /** Time zone turned to face the viewer first. */
  faceTimezone?: string;
  size: number;
  /** Draw the room's constellation: arcs of light joining the pins. */
  constellation?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const DEG = Math.PI / 180;
const GOLD = '#E3A440';

/** Object-space point for a latitude/longitude (east positive), matching the globe shader. */
function lonLat(latDeg: number, lonDeg: number, r = 1): THREE.Vector3 {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return new THREE.Vector3(r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), -r * Math.cos(lat) * Math.sin(lon));
}

/** Rough latitude for a zone: there's no lat in IANA ids, so use the region and jitter by name. */
function latitudeFor(tz: string): number {
  const region = tz.split('/')[0];
  const base: Record<string, number> = {
    America: 32, Europe: 48, Asia: 28, Africa: 4, Australia: -30, Pacific: -12, Atlantic: 30, Indian: -10,
  };
  let h = 0;
  for (let i = 0; i < tz.length; i++) h = (h * 31 + tz.charCodeAt(i)) | 0;
  return (base[region] ?? 20) + ((Math.abs(h) % 17) - 8);
}

function longitudeFor(tz: string, ms: number): number {
  const offset = DateTime.fromMillis(ms, { zone: tz }).offset; // minutes east of UTC
  return Number.isFinite(offset) ? (offset / 60) * 15 : 0;
}

function useNow(fixed?: number) {
  const [now, setNow] = useState(() => fixed ?? Date.now());
  useEffect(() => {
    if (fixed !== undefined) {
      setNow(fixed);
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [fixed]);
  return now;
}

/** Points along the great circle from a to b, lifted off the surface in the middle. */
function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments = 48): THREE.Vector3[] {
  const ua = a.clone().normalize();
  const ub = b.clone().normalize();
  const angle = ua.angleTo(ub);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Spherical interpolation, then lift by up to ~25% of the arc's span.
    const v =
      angle < 1e-4
        ? ua.clone()
        : ua
            .clone()
            .multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle))
            .add(ub.clone().multiplyScalar(Math.sin(t * angle) / Math.sin(angle)));
    out.push(v.normalize().multiplyScalar(1.02 + Math.sin(Math.PI * t) * angle * 0.12));
  }
  return out;
}

/**
 * The room's constellation: pins joined west to east (and closed into a loop
 * when there are three or more), drawn in over ~1.4 s. Its shape depends only
 * on where the members are, so every room gets its own.
 */
function Constellation({ points, animate }: { points: THREE.Vector3[]; animate: boolean }) {
  const lines = useMemo(() => {
    const chain = points.length >= 3 ? [...points, points[0]] : points;
    const result: THREE.Line[] = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const geom = new THREE.BufferGeometry().setFromPoints(arcPoints(chain[i], chain[i + 1]));
      const mat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9, toneMapped: false });
      result.push(new THREE.Line(geom, mat));
    }
    return result;
  }, [points]);
  useEffect(
    () => () =>
      lines.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      }),
    [lines],
  );

  const progress = useRef(animate ? 0 : 1);
  useEffect(() => {
    progress.current = animate ? 0 : 1;
  }, [lines, animate]);

  useFrame((_, delta) => {
    if (progress.current < 1) progress.current = Math.min(1, progress.current + delta / 1.4);
    // Strong ease-out (cubic-bezier(0.23, 1, 0.32, 1) approximated): fast start, gentle landing.
    const eased = 1 - Math.pow(1 - progress.current, 4);
    const perLine = 1 / Math.max(lines.length, 1);
    lines.forEach((line, i) => {
      const local = Math.min(1, Math.max(0, (eased - i * perLine) / perLine));
      const count = (line.geometry.getAttribute('position') as THREE.BufferAttribute).count;
      line.geometry.setDrawRange(0, Math.ceil(count * local));
    });
  });

  return (
    <>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
    </>
  );
}

function Earth({
  pins,
  at,
  faceTimezone,
  animate,
  constellation,
}: {
  pins: GlobePin[];
  at: number;
  faceTimezone?: string;
  animate: boolean;
  constellation?: boolean;
}) {
  const spin = useRef<THREE.Group>(null);
  const float = useRef<THREE.Group>(null);
  const faceLon = faceTimezone ? longitudeFor(faceTimezone, at) : 0;

  const sun = useMemo(() => {
    const s = subsolarPoint(at);
    return lonLat(s.lat, s.lon);
  }, [at]);

  const globeUniforms = useMemo(
    () => ({
      uSun: { value: sun.clone() },
      uDay: { value: new THREE.Vector3(...hexToRgb('#2E6690')) },
      uNight: { value: new THREE.Vector3(...hexToRgb('#120F33')) },
      uGrid: { value: new THREE.Vector3(...hexToRgb('#7FB9DD')) },
      uGlow: { value: new THREE.Vector3(...hexToRgb(GOLD)) },
    }),
    // uSun is updated in place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    (globeUniforms.uSun.value as THREE.Vector3).copy(sun);
  }, [sun, globeUniforms]);

  const atmosphereUniforms = useMemo(() => ({ uGlow: { value: new THREE.Vector3(...hexToRgb('#8C80E0')) } }), []);

  const pinPoints = useMemo(
    () =>
      pins.map((p) => ({
        id: p.id,
        isYou: !!p.isYou,
        pos: lonLat(latitudeFor(p.timezone), longitudeFor(p.timezone, at), 1.015),
      })),
    [pins, at],
  );

  const ticks = useMemo(
    () => Array.from({ length: 24 }, (_, i) => lonLat(0, i * 15, 1.34)),
    [],
  );

  // West-to-east order for the constellation, one point per distinct place.
  const constellationPoints = useMemo(() => {
    const seen = new Set<string>();
    return pinPoints
      .filter((p) => {
        const key = `${p.pos.x.toFixed(2)},${p.pos.z.toFixed(2)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => Math.atan2(-a.pos.z, a.pos.x) - Math.atan2(-b.pos.z, b.pos.x))
      .map((p) => p.pos);
  }, [pinPoints]);

  useFrame((state, delta) => {
    if (!animate) return;
    if (spin.current) spin.current.rotation.y += Math.min(delta, 0.05) * 0.12;
    // Gentle float, like drei's <Float>: slow bob and sway.
    if (float.current) {
      const t = state.clock.elapsedTime;
      float.current.position.y = Math.sin(t * 0.9) * 0.045;
      float.current.rotation.z = Math.sin(t * 0.6) * 0.03;
    }
  });

  return (
    <group ref={float}>
    <group rotation={[0.38, 0, 0.12]}>
      {/* Start with the chosen zone facing the camera. */}
      <group ref={spin} rotation={[0, -Math.PI / 2 - faceLon * DEG, 0]}>
        <mesh>
          <sphereGeometry args={[1, 64, 48]} />
          <shaderMaterial uniforms={globeUniforms} vertexShader={globeVertex} fragmentShader={globeFragment} />
        </mesh>
        {pinPoints.map((p) => (
          <group key={p.id} position={p.pos}>
            <mesh>
              <sphereGeometry args={[p.isYou ? 0.05 : 0.035, 16, 12]} />
              <meshBasicMaterial color={p.isYou ? GOLD : '#F6EBDA'} toneMapped={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[p.isYou ? 0.11 : 0.075, 16, 12]} />
              <meshBasicMaterial color={GOLD} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {constellation && constellationPoints.length >= 2 ? (
          <Constellation points={constellationPoints} animate={animate} />
        ) : null}
        {/* Hour ring: 24 ticks, one per time zone. */}
        {ticks.map((t, i) => (
          <mesh key={i} position={t}>
            <sphereGeometry args={[i % 6 === 0 ? 0.022 : 0.012, 8, 6]} />
            <meshBasicMaterial color={GOLD} transparent opacity={i % 6 === 0 ? 0.95 : 0.55} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.34, 0.0035, 6, 160]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial
          uniforms={atmosphereUniforms}
          vertexShader={globeVertex}
          fragmentShader={atmosphereFragment}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
    </group>
  );
}

/** Flat fallback when GL is unavailable: a disc with the gold meridian ring. */
function GlobeFallback({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.6, borderRadius: size, backgroundColor: '#1B2550', borderWidth: 1, borderColor: GOLD }} />
    </View>
  );
}

/**
 * A 3D globe lit by the real sun position at `at`, with a pin for each
 * member's time zone. Decorative: hidden from screen readers unless a label is given.
 */
export function Globe3D({ pins = [], at, faceTimezone, size, constellation, style, accessibilityLabel }: Props) {
  const reducedMotion = useReducedMotion();
  const now = useNow(at);
  const glOk = useMemo(canUseWebGL, []);

  return (
    <View
      style={[{ width: size, height: size }, style]}
      pointerEvents="none"
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!accessibilityLabel}
    >
      {glOk ? (
        <GLBoundary fallback={<GlobeFallback size={size} />}>
          <Canvas
            style={StyleSheet.absoluteFill as object}
            dpr={[1, 2]}
            flat
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            camera={{ position: [0, 0, 4.4], fov: 36 }}
            frameloop={reducedMotion ? 'demand' : 'always'}
          >
            <Earth pins={pins} at={now} faceTimezone={faceTimezone} animate={!reducedMotion} constellation={constellation} />
          </Canvas>
        </GLBoundary>
      ) : (
        <GlobeFallback size={size} />
      )}
    </View>
  );
}
