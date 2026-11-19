import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'react-native-reanimated';
import * as THREE from 'three';

import { GLBoundary, canUseWebGL, hexToRgb } from './GLBoundary';
import { orbFragment, orbVertex } from './shaders';

type Props = { size: number; style?: StyleProp<ViewStyle> };

function Orb({ animate }: { animate: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStrength: { value: 0.1 },
      // Ember -> sunrise gold -> first-light cream.
      uC1: { value: new THREE.Vector3(...hexToRgb('#C8553A')) },
      uC2: { value: new THREE.Vector3(...hexToRgb('#E3A440')) },
      uC3: { value: new THREE.Vector3(...hexToRgb('#FFE7B8')) },
    }),
    [],
  );

  const corona = useMemo(() => ({ uColor: { value: new THREE.Vector3(...hexToRgb('#E3A440')) } }), []);

  useFrame((state, delta) => {
    if (!animate) return;
    const u = material.current?.uniforms;
    if (u) u.uTime.value += Math.min(delta, 0.05);
    if (mesh.current) {
      // A breathing pulse, about one beat per second, like an alarm.
      const t = state.clock.elapsedTime;
      const s = 1 + Math.pow(Math.max(0, Math.sin(t * Math.PI)), 6) * 0.06;
      mesh.current.scale.setScalar(s);
      mesh.current.rotation.y += Math.min(delta, 0.05) * 0.25;
    }
  });

  return (
    <>
    {/* Corona: a soft glow ring behind the sun. */}
    <mesh scale={1.35} position={[0, 0, -0.4]}>
      <circleGeometry args={[1, 64]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={corona}
        vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`uniform vec3 uColor; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.55, d) * 0.55; gl_FragColor = vec4(uColor, a); }`}
      />
    </mesh>
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={orbVertex} fragmentShader={orbFragment} />
    </mesh>
    </>
  );
}

/**
 * The waking sun shown while the alarm rings: ShaderGradient's sphere mode,
 * noise-folded and pulsing. Decorative, hidden from screen readers.
 */
export function SunOrb3D({ size, style }: Props) {
  const reducedMotion = useReducedMotion();
  const glOk = useMemo(() => canUseWebGL(), []);
  const fallback = (
    <View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: '#E3A440', alignSelf: 'center', marginTop: size * 0.19 }} />
  );
  return (
    <View
      style={[{ width: size, height: size }, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {glOk ? (
        <GLBoundary fallback={fallback}>
          <Canvas
            style={StyleSheet.absoluteFill as object}
            dpr={[1, 2]}
            flat
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            camera={{ position: [0, 0, 4.5], fov: 36 }}
            frameloop={reducedMotion ? 'demand' : 'always'}
          >
            <Orb animate={!reducedMotion} />
          </Canvas>
        </GLBoundary>
      ) : (
        fallback
      )}
    </View>
  );
}
