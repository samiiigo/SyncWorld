import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemedColors } from '@/shared/theme';
import { GlassLayer } from './glass/GlassLayer';

type Star = { x: number; y: number; r: number };

/** Deterministic PRNG from a string, so a room always gets the same constellation. */
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** 4–6 stars spread around the badge (angle-sorted so the lines don't cross), as fractions of the box. */
export function constellationFor(key: string): Star[] {
  const rand = seeded(key);
  const n = 4 + Math.floor(rand() * 3);
  const stars: (Star & { a: number })[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.9;
    const d = 0.18 + rand() * 0.2;
    stars.push({ a, x: 0.5 + Math.cos(a) * d, y: 0.5 + Math.sin(a) * d, r: i === 0 ? 2.6 : 1.4 + rand() * 0.9 });
  }
  stars.sort((p, q) => p.a - q.a);
  return stars.map(({ x, y, r }) => ({ x, y, r }));
}

/**
 * The room's emblem: a small constellation generated from its code, on a
 * glass disc. Replaces the emoji room icons (an "AI app" tell); the same
 * room always draws the same shape on every device.
 */
export function ConstellationBadge({ seed, size = 48 }: { seed: string; size?: number }) {
  const colors = useThemedColors();
  const stars = useMemo(() => constellationFor(seed), [seed]);
  const lines = stars.slice(0, -1).map((s, i) => {
    const t = stars[i + 1];
    const dx = (t.x - s.x) * size;
    const dy = (t.y - s.y) * size;
    const len = Math.hypot(dx, dy);
    return {
      key: i,
      left: ((s.x + t.x) / 2) * size - len / 2,
      top: ((s.y + t.y) / 2) * size - 0.5,
      width: len,
      angle: Math.atan2(dy, dx),
    };
  });

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <GlassLayer radius={size / 2} />
      {lines.map((l) => (
        <View
          key={l.key}
          style={[
            styles.line,
            { left: l.left, top: l.top, width: l.width, backgroundColor: colors.primary, transform: [{ rotate: `${l.angle}rad` }] },
          ]}
        />
      ))}
      {stars.map((s, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: s.x * size - s.r,
              top: s.y * size - s.r,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: s.r,
              backgroundColor: i === 0 ? colors.primary : colors.textPrimary,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', height: 1, opacity: 0.55 },
  star: { position: 'absolute' },
});
