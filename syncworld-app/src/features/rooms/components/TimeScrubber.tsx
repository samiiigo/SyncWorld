// ──────────────────────────────────────────────
// TimeScrubber.tsx — the shared 48h time slider (prototype Layout A).
//
// Input on every target:
// - touch/mouse: drag the track (horizontal-only so vertical scrolling of
//   the page still works — spec "directional lock"), tap to jump (spring)
// - keyboard (desktop/web): ←/→ 15 min, Shift+←/→ 1 h, Home/End, Enter proposes
// - screen readers: adjustable role with increment/decrement actions
// ──────────────────────────────────────────────

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { MS_PER_HOUR, SCRUBBER_TICK_MS, SCRUBBER_WINDOW_MS } from '@/shared/lib/time/time.constants';
import { formatLocalTime, formatUtcClock, relativeDayLabel } from '@/shared/lib/time/time.conversions';
import { useThemedColors, withAppFont } from '@/shared/theme';
import { midnightsInWindow } from './scrubberBands';
import { LinearGradient } from 'expo-linear-gradient';
import { DateTime } from 'luxon';
import { withMonoFont } from '@/shared/theme/fonts';
import { GlassLayer } from '@/shared/visuals/glass/GlassLayer';
import { skyLaneStops } from '@/shared/visuals/skyRamp';

const TRACK_HEIGHT = 60;
/** Spec: thumb at least 44pt / 48dp. */
const THUMB_SIZE = 48;
const BADGE_GAP = 12;

/** Width of the gold meridian (the proposed time) through the Sky Lane. */
const MERIDIAN_WIDTH = 3;

export type TimeScrubberProps = {
  windowStart: number;
  scrubberUtc: number;
  thumbPercent: number;
  timezone: string;
  ghostMarkers: number[];
  dragging: boolean;
  disabled?: boolean;
  onDraggingChange: (dragging: boolean) => void;
  onScrubTo: (fraction: number) => void;
  onNudge: (deltaMs: number) => void;
  onSubmit?: () => void;
};

export function TimeScrubber({
  windowStart,
  scrubberUtc,
  thumbPercent,
  timezone,
  ghostMarkers,
  dragging,
  disabled,
  onDraggingChange,
  onScrubTo,
  onNudge,
  onSubmit,
}: TimeScrubberProps) {
  const colors = useThemedColors();
  const width = useRef(0);
  const [badgeWidth, setBadgeWidth] = React.useState(128);
  const startX = useRef(0);
  const moved = useRef(false);
  const position = useRef(new Animated.Value(thumbPercent)).current;

  // Latest callbacks for the long-lived PanResponder.
  const latest = useRef({ onScrubTo, onDraggingChange, disabled });
  latest.current = { onScrubTo, onDraggingChange, disabled };

  useEffect(() => {
    if (dragging) position.setValue(thumbPercent);
    else Animated.spring(position, { toValue: thumbPercent, useNativeDriver: false, friction: 9, tension: 80 }).start();
  }, [thumbPercent, dragging, position]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.disabled,
        // Horizontal intent only — vertical drags scroll the page.
        onMoveShouldSetPanResponder: (_e, g) => !latest.current.disabled && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          moved.current = false;
          startX.current = e.nativeEvent.locationX;
        },
        onPanResponderMove: (_e, g) => {
          if (!moved.current && Math.abs(g.dx) > 3) {
            moved.current = true;
            latest.current.onDraggingChange(true);
          }
          if (moved.current && width.current > 0) latest.current.onScrubTo((startX.current + g.dx) / width.current);
        },
        onPanResponderRelease: () => {
          if (!moved.current && width.current > 0) {
            // Tap-to-jump; the thumb springs there (spec line 233).
            latest.current.onScrubTo(startX.current / width.current);
          }
          if (moved.current) latest.current.onDraggingChange(false);
        },
        onPanResponderTerminate: () => {
          if (moved.current) latest.current.onDraggingChange(false);
        },
      }),
    [],
  );

  // Sky Lane: your sky, hour by hour, across the whole window (Figma "Sky Lane").
  const lane = useMemo(() => {
    const start = DateTime.fromMillis(windowStart, { zone: timezone });
    return skyLaneStops(start.hour + start.minute / 60, SCRUBBER_WINDOW_MS / MS_PER_HOUR);
  }, [windowStart, timezone]);
  const days = useMemo(() => midnightsInWindow(windowStart, timezone), [windowStart, timezone]);

  const onKeyDown = (e: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => {
    if (disabled) return;
    const step = e.shiftKey ? MS_PER_HOUR : SCRUBBER_TICK_MS;
    const handled = (() => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          onNudge(step);
          return true;
        case 'ArrowLeft':
        case 'ArrowDown':
          onNudge(-step);
          return true;
        case 'Home':
          onScrubTo(0);
          return true;
        case 'End':
          onScrubTo(1);
          return true;
        case 'Enter':
          onSubmit?.();
          return true;
        default:
          return false;
      }
    })();
    if (handled) e.preventDefault?.();
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') onNudge(SCRUBBER_TICK_MS);
    if (e.nativeEvent.actionName === 'decrement') onNudge(-SCRUBBER_TICK_MS);
  };

  const left = position.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  const localLabel = formatLocalTime(scrubberUtc, timezone);
  const dayLabel = relativeDayLabel(scrubberUtc, timezone);
  // Web-only props (keyboard focus); RN types don't declare them.
  const webProps = Platform.OS === 'web' ? ({ tabIndex: 0, onKeyDown } as object) : {};

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Proposed time"
      accessibilityValue={{ text: `${dayLabel} ${localLabel}, ${formatUtcClock(scrubberUtc)}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      {...webProps}
    >
      <View style={styles.badgeLane} pointerEvents="none">
        <Animated.View style={[styles.badgeAnchor, { left }]}>
          <Animated.View
            onLayout={(e: LayoutChangeEvent) => setBadgeWidth(e.nativeEvent.layout.width)}
            style={[
              styles.badge,
              {
                backgroundColor: colors.inverseSurface,
                // Slide from left-aligned at 0% to right-aligned at 100% so it never clips.
                transform: [
                  {
                    translateX: position.interpolate({
                      inputRange: [0, 100],
                      outputRange: [-THUMB_SIZE / 2, -badgeWidth + THUMB_SIZE / 2],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.badgeLocal, { color: colors.inverseText }]} numberOfLines={1}>
              {dayLabel} · {localLabel}
            </Text>
            <Text style={[styles.badgeUtc, { color: colors.inverseText }]}>{formatUtcClock(scrubberUtc)}</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View
        {...pan.panHandlers}
        onLayout={(e: LayoutChangeEvent) => {
          width.current = e.nativeEvent.layout.width;
        }}
        style={[styles.hitArea, Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'grab', touchAction: 'pan-y' } as object) : null]}
      >
        <View style={[styles.track, { borderColor: colors.glassBorder }]} pointerEvents="none">
          <LinearGradient
            colors={lane.colors as [string, string, ...string[]]}
            locations={lane.locations as [number, number, ...number[]]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Glass sheen over the lane. */}
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
          {days.map((d) => (
            <View key={d.percent} style={[styles.dayDivider, { left: `${d.percent}%` }]} />
          ))}
        </View>

        {ghostMarkers.map((g) => {
          const pct = ((g - windowStart) / SCRUBBER_WINDOW_MS) * 100;
          if (pct < 0 || pct > 100) return null;
          return (
            <View
              key={g}
              pointerEvents="none"
              style={[styles.ghost, { left: `${pct}%`, backgroundColor: colors.danger }]}
              accessibilityLabel="Vetoed time"
            />
          );
        })}

        {/* The gold meridian: the proposed time, cutting through the lane. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.meridian, { left, backgroundColor: colors.primary, transform: [{ translateX: -MERIDIAN_WIDTH / 2 }] }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left,
              borderColor: colors.primary,
              transform: [{ translateX: -THUMB_SIZE / 2 }, { scale: dragging ? 1.08 : 1 }],
            },
          ]}
        >
          <GlassLayer radius={THUMB_SIZE / 2} variant="clear" />
        </Animated.View>
      </View>

      <View style={styles.dayLabels} pointerEvents="none">
        <Text style={[styles.dayLabel, { color: colors.textSecondary, left: 0 }]}>Now</Text>
        {days.filter((d) => d.percent > 10 && d.percent < 90).map((d) => (
          <Text key={d.percent} style={[styles.dayLabel, styles.dayLabelCentered, { color: colors.textSecondary, left: `${d.percent}%` }]}>
            {d.label}
          </Text>
        ))}
        <Text style={[styles.dayLabel, { color: colors.textSecondary, right: 0 }]}>+48h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 4,
    marginBottom: 8,
  },
  badgeLane: {
    height: 52,
    marginHorizontal: THUMB_SIZE / 2,
    marginBottom: BADGE_GAP,
  },
  badgeAnchor: {
    position: 'absolute',
    top: 0,
    width: 0,
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 156,
  },
  badgeLocal: withMonoFont({ fontSize: 13, fontWeight: '600' }),
  badgeUtc: withMonoFont({ fontSize: 11, opacity: 0.75, marginTop: 1 }),
  hitArea: {
    height: TRACK_HEIGHT + 8,
    justifyContent: 'center',
    marginHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayDivider: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  meridian: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MERIDIAN_WIDTH,
    borderRadius: MERIDIAN_WIDTH / 2,
  },
  ghost: {
    position: 'absolute',
    top: 8,
    width: 3,
    height: 14,
    borderRadius: 2,
    marginLeft: -1.5,
    opacity: 0.8,
  },
  thumb: {
    position: 'absolute',
    top: (TRACK_HEIGHT + 8 - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    overflow: 'hidden',
  },
  dayLabels: {
    height: 18,
    marginTop: 6,
    marginHorizontal: THUMB_SIZE / 2,
  },
  dayLabel: withAppFont({
    position: 'absolute',
    fontSize: 11,
    fontWeight: '500',
  }),
  dayLabelCentered: {
    width: 40,
    marginLeft: -20,
    textAlign: 'center',
  },
});
