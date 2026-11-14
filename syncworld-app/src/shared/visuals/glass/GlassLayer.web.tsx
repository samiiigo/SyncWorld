import React, { useEffect, useId, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useResolvedColorScheme, useThemedColors } from '@/shared/theme';
import { buildRefractionMap } from './refractionMap';
import type { GlassLayerProps } from './GlassLayer';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Max backdrop shift at the very edge, in px (feDisplacementMap shifts by scale/2). */
const MAX_SHIFT = 14;

/** SVG filters in backdrop-filter only work in Chromium (Chrome, Edge, Opera, installed PWAs). */
const supportsRefraction =
  typeof navigator !== 'undefined' &&
  typeof document !== 'undefined' &&
  /Chrome\/|Chromium\//.test(navigator.userAgent) &&
  !/Firefox\//.test(navigator.userAgent);

function filterHost(): SVGSVGElement {
  let host = document.getElementById('sw-glass-filters') as SVGSVGElement | null;
  if (!host) {
    host = document.createElementNS(SVG_NS, 'svg');
    host.id = 'sw-glass-filters';
    host.setAttribute('width', '0');
    host.setAttribute('height', '0');
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'absolute';
    host.style.pointerEvents = 'none';
    document.body.appendChild(host);
  }
  return host;
}

function mapToDataUrl(width: number, height: number, radius: number): string | null {
  const map = buildRefractionMap(width, height, radius);
  const canvas = document.createElement('canvas');
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = ctx.createImageData(map.width, map.height);
  image.data.set(map.data);
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/** Builds (or updates) this layer's refraction filter: blur, then the liquid-glass displacement. */
function upsertFilter(id: string, width: number, height: number, radius: number, blur: number): boolean {
  const url = mapToDataUrl(width, height, radius);
  if (!url) return false;
  const host = filterHost();
  let filter = document.getElementById(id) as Element | null;
  if (!filter) {
    filter = document.createElementNS(SVG_NS, 'filter');
    filter.id = id;
    host.appendChild(filter);
  }
  filter.setAttribute('x', '0');
  filter.setAttribute('y', '0');
  filter.setAttribute('width', '100%');
  filter.setAttribute('height', '100%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.innerHTML =
    `<feImage href="${url}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="soft"/>` +
    `<feDisplacementMap in="soft" in2="map" scale="${MAX_SHIFT * 2}" xChannelSelector="R" yChannelSelector="G"/>`;
  return true;
}

/**
 * Web glass: backdrop blur + saturation, plus liquid-glass-js style edge
 * refraction on Chromium. Other browsers get the frosted blur only.
 */
export function GlassLayer({ radius, tint, variant = 'regular' }: GlassLayerProps) {
  const c = useThemedColors();
  const scheme = useResolvedColorScheme();
  const ref = useRef<View>(null);
  const filterId = `sw-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const blur = variant === 'clear' ? 4 : 9;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width / 4) * 4;
    const h = Math.round(e.nativeEvent.layout.height / 4) * 4;
    if (w > 0 && h > 0 && (w !== size?.w || h !== size?.h)) setSize({ w, h });
  };

  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el?.style) return;
    let value = `blur(${blur * 2}px) saturate(170%)`;
    if (supportsRefraction && size && upsertFilter(filterId, size.w, size.h, radius, blur)) {
      value = `url(#${filterId}) saturate(170%) brightness(1.04)`;
    }
    el.style.setProperty('backdrop-filter', value);
    el.style.setProperty('-webkit-backdrop-filter', `blur(${blur * 2}px) saturate(170%)`);
  }, [size, radius, blur, filterId]);

  useEffect(() => () => document.getElementById(filterId)?.remove(), [filterId]);

  const rimTop = scheme === 'dark' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.95)';
  const rimBottom = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)';

  return (
    <View
      ref={ref}
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: radius,
          backgroundColor: tint ?? (variant === 'clear' ? c.glassFill : c.glassFillStrong),
          borderWidth: 1,
          borderColor: c.glassBorder,
          // liquid-glass-js tints top-to-bottom (white -> 70% grey) and lights the rim.
          backgroundImage: `linear-gradient(180deg, ${c.glassHighlight} 0%, transparent 55%)`,
          boxShadow: `inset 0 1px 0 ${rimTop}, inset 0 -1px 0 ${rimBottom}, 0 10px 30px rgba(0,0,0,${scheme === 'dark' ? 0.35 : 0.12})`,
        } as object,
      ]}
    />
  );
}
