import React, { useEffect, useMemo, useRef } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from 'react-native-reanimated';
import * as THREE from 'three';

import { GLBoundary, canUseWebGL, hexToRgb } from './GLBoundary';
import { gradientFragment, gradientVertex, starsFragment, starsVertex } from './shaders';
import type { SkyColors } from './sky';

/** One full cycle of the sky's motion. Every device derives its phase from UTC. */
export const SKY_LOOP_MS = 48_000;

/** Where in the loop the shared sky is right now (0..1), identical on every device. */
export function skyPhase(nowMs: number): number {
  return (nowMs % SKY_LOOP_MS) / SKY_LOOP_MS;
}

type Props = {
  colors: SkyColors;
  /** Star field opacity (0 hides it). */
  stars?: number;
  /** Fold height (ShaderGradient uStrength). */
  strength?: number;
  /** Noise scale (uDensity). */
  density?: number;
  grain?: number;
};

const vec = (hex: string) => new THREE.Vector3(...hexToRgb(hex));

function GradientPlane({
  colors,
  strength,
  density,
  grain,
  animate,
}: Required<Omit<Props, 'stars'>> & { animate: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uPhase: { value: skyPhase(Date.now()) },
      // Distance travelled through the noise per loop (ShaderGradient: 5 * speed).
      uLoopRadius: { value: 1.1 },
      uDensity: { value: density },
      uStrength: { value: strength },
      uGrain: { value: grain },
      uBrightness: { value: 1.1 },
      uC1: { value: vec(colors[0]) },
      uC2: { value: vec(colors[1]) },
      uC3: { value: vec(colors[2]) },
    }),
    // Colors are eased toward their targets in useFrame instead of rebuilding uniforms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const targets = useMemo(() => colors.map(vec), [colors]);
  // With reduced motion the loop is on demand, so ask for a frame when the palette changes.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [targets, invalidate]);

  useFrame((_, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    if (animate) u.uPhase.value = skyPhase(Date.now());
    // Ease the palette when the sky period changes (about one second).
    const k = animate ? 1 - Math.exp(-delta * 3) : 1;
    (u.uC1.value as THREE.Vector3).lerp(targets[0], k);
    (u.uC2.value as THREE.Vector3).lerp(targets[1], k);
    (u.uC3.value as THREE.Vector3).lerp(targets[2], k);
  });

  return (
    // ShaderGradient's "Halo" framing: plane tilted 50 deg, nudged left.
    <mesh rotation={[0, 0, (50 * Math.PI) / 180]} position={[-1.4, 0, 0]}>
      <planeGeometry args={[10, 10, 96, 96]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={gradientVertex} fragmentShader={gradientFragment} />
    </mesh>
  );
}

const STAR_COUNT = 160;

/** Twinkling stars in front of the sky; fades with `opacity` as night comes and goes. */
function StarField({ opacity, animate }: { opacity: number; animate: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    // Deterministic layout so the sky looks the same on every device.
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const pos = new Float32Array(STAR_COUNT * 3);
    const size = new Float32Array(STAR_COUNT);
    const seeds = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      pos[i * 3] = (rand() - 0.5) * 5.2;
      // Denser toward the top, like a real night sky over a horizon glow.
      pos[i * 3 + 1] = Math.pow(rand(), 0.7) * 3.2 - 1.2;
      pos[i * 3 + 2] = 0.6 + rand() * 0.4;
      size[i] = rand() < 0.08 ? 3.4 : 1.2 + rand() * 1.4;
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: Math.min(PixelRatio.get(), 2) } }),
    [],
  );

  useFrame((_, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    if (animate) u.uTime.value = (Date.now() % 600_000) / 1000;
    const k = animate ? 1 - Math.exp(-delta * 2) : 1;
    u.uOpacity.value += (opacity - u.uOpacity.value) * k;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={starsVertex}
        fragmentShader={starsFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Static stand-in used before GL is ready and when GL fails. */
export function GradientFallback({ colors }: { colors: SkyColors }) {
  return (
    <LinearGradient
      colors={[colors[0], colors[1], colors[2]]}
      locations={[0, 0.6, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * Animated mesh gradient (ShaderGradient port) that fills its parent.
 * Runs on iOS/Android through expo-gl and on the web through WebGL.
 */
export function ShaderGradient({ colors, stars = 0, strength = 1.5, density = 1.3, grain = 0.045 }: Props) {
  const reducedMotion = useReducedMotion();
  const glOk = useMemo(canUseWebGL, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <GradientFallback colors={colors} />
      {glOk ? (
        <GLBoundary fallback={null}>
          <Canvas
            style={StyleSheet.absoluteFill as object}
            dpr={[1, 1.5]}
            flat
            gl={{ antialias: false, powerPreference: 'low-power', alpha: false }}
            camera={{ position: [0, 0, 3.6], fov: 45 }}
            frameloop={reducedMotion ? 'demand' : 'always'}
          >
            <GradientPlane colors={colors} strength={strength} density={density} grain={grain} animate={!reducedMotion} />
            <StarField opacity={stars} animate={!reducedMotion} />
          </Canvas>
        </GLBoundary>
      ) : null}
    </View>
  );
}
