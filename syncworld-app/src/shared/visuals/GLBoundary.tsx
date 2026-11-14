import React from 'react';

/**
 * Catches failures from a WebGL/expo-gl canvas (no GL context, driver or
 * shader errors) and swaps in a static fallback, so a decorative 3D layer
 * can never take a screen down.
 */
export class GLBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn('[visuals] GL layer disabled:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** '#RRGGBB' -> [r, g, b] in 0..1 (sRGB, written straight to the shader). */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** True where a WebGL context can be created (always true on native). */
export function canUseWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
