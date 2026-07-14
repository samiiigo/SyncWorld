import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { StackScreenHeader } from '@/components/navigation/header/StackScreenHeader';
import { SCREEN_LIST_BOTTOM_PADDING } from '@/components/navigation/layout/screenLayout';
import { useTopChromeLayout } from '@/components/navigation/layout/useTopChromeLayout';
import { SettingsSheet } from '@/components/navigation/sheet/SettingsSheet';
import { CircularIconButton } from '@/components/ui/CircularIconButton';
import { useWorldStore } from '@/features/world/world.store';
import {
  BANDS,
  BAR_INSET,
  CATALOG,
  FAVORITE_NAMES,
  formatClock,
  fmtOffset,
  HOUR_LABELS,
  nowMinutes,
  PX_PER_MIN,
  ROW_H,
  buildCityRows,
  buildGridLines,
  normMod,
  screenX,
  snapMinutes,
} from '@/features/world/timeline';
import {
  useCreateStyles,
  useResolvedColorScheme,
  useThemedColors,
  Spacing,
  BorderRadius,
  withAppFont,
} from '@/theme';
import type { ColorPalette } from '@/theme/colorPalettes';

/** Visual gap shift for rows between drag origin and hover target. */
function siblingPushY(index: number, from: number, hover: number, rowH: number): number {
  if (from < hover && index > from && index <= hover) return -rowH;
  if (from > hover && index < from && index >= hover) return rowH;
  return 0;
}

const MARKER_BAND = 28;
const DRAG_EDGE = 56;
const DRAG_SCROLL_MAX = 14;

function DayPillBar({ left, width, label }: { left: number; width: number; label: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left,
        width,
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      {BANDS.map((band) => (
        <View
          key={`${band.h0}-${band.h1}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: band.h0 * 60 * PX_PER_MIN,
            width: (band.h1 - band.h0) * 60 * PX_PER_MIN,
            backgroundColor: band.color,
          }}
        />
      ))}
      {HOUR_LABELS.map((text, hi) => (
        <View
          key={text}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: hi * 6 * 60 * PX_PER_MIN + 7,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '500' }}>{text}</Text>
        </View>
      ))}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingRight: 8,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: '#fff',
            fontSize: 10,
            fontWeight: '600',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
            opacity: 0.85,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function DashedMarkerLine({ height, color }: { height: number; color: string }) {
  const dash = 5;
  const gap = 4;
  const lines: React.ReactNode[] = [];
  for (let y = 0; y < height; y += dash + gap) {
    lines.push(
      <View
        key={y}
        style={{
          position: 'absolute',
          top: y,
          left: 0,
          width: 2,
          height: Math.min(dash, height - y),
          backgroundColor: color,
        }}
      />
    );
  }
  return <View style={{ width: 2, height, position: 'relative' }}>{lines}</View>;
}

type Sheet = 'add' | 'detail' | null;

export default function WorldTimelineScreen() {
  const { cities, use24h, showCurrentMarker, addCity, removeCity, reorderCity } =
    useWorldStore();
  const { scrollPaddingTop } = useTopChromeLayout();
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const styles = useCreateStyles(createWorldStyles);
  // Content starts below chrome; scroll still fills the screen so rows cut off at y=0.
  const listTop = scrollPaddingTop + MARKER_BAND;

  const [selectedMin, setSelectedMin] = useState(nowMinutes);
  const [currentMin, setCurrentMin] = useState(nowMinutes);
  const [viewportW, setViewportW] = useState(390);
  const [timelineH, setTimelineH] = useState(600);
  const [rowH, setRowH] = useState(ROW_H);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [citySearch, setCitySearch] = useState('');
  const [detailCityId, setDetailCityId] = useState<string | null>(null);
  const [dragCityId, setDragCityId] = useState<string | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState(-1);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [scrubbing, setScrubbing] = useState(false);

  const selectedMinRef = useRef(selectedMin);
  selectedMinRef.current = selectedMin;
  const citiesRef = useRef(cities);
  citiesRef.current = cities;
  const rowHRef = useRef(rowH);
  rowHRef.current = rowH;
  const hoverIndexRef = useRef(-1);
  const dragAnimY = useRef(new Animated.Value(0)).current;
  const settlingRef = useRef(false);
  // Cleared sync before store reorder so a zustand re-render never paints stale drag transforms.
  const dragActiveRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const listHRef = useRef(500);
  const listPageTopRef = useRef(0);
  const autoScrollRaf = useRef<number | null>(null);
  const siblingAnimsRef = useRef<Record<string, Animated.Value>>({});

  const scrub = useRef<{
    cityId: string | null;
    mode: 'pending' | 'scrub' | 'reorder';
    startX: number;
    startY: number;
    lastPageY: number;
    startSelMin: number;
    startIndex: number;
  } | null>(null);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const siblingAnim = (id: string) => {
    const map = siblingAnimsRef.current;
    if (!map[id]) map[id] = new Animated.Value(0);
    return map[id];
  };

  const resetSiblingAnims = useCallback(() => {
    Object.values(siblingAnimsRef.current).forEach((v) => v.setValue(0));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrentMin(nowMinutes()), 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      if (autoScrollRaf.current != null) cancelAnimationFrame(autoScrollRaf.current);
    },
    []
  );

  // Soft-slide neighbors into the open gap while dragging.
  useEffect(() => {
    if (!dragActiveRef.current || dragFromIndex < 0 || hoverIndex < 0 || !dragCityId) {
      return;
    }
    const springs = cities
      .map((c, i) => {
        if (c.id === dragCityId) return null;
        return Animated.spring(siblingAnim(c.id), {
          toValue: siblingPushY(i, dragFromIndex, hoverIndex, rowH),
          useNativeDriver: true,
          speed: 64,
          bounciness: 0,
        });
      })
      .filter((a) => a != null);
    if (springs.length) Animated.parallel(springs).start();
  }, [cities, dragCityId, dragFromIndex, hoverIndex, rowH]);

  const clearLp = () => {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  };

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRaf.current != null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  }, []);

  const endDragVisual = useCallback(() => {
    stopAutoScroll();
    dragActiveRef.current = false;
    dragAnimY.setValue(0);
    resetSiblingAnims();
    setDragCityId(null);
    setDragFromIndex(-1);
    setHoverIndex(-1);
    hoverIndexRef.current = -1;
    settlingRef.current = false;
  }, [dragAnimY, resetSiblingAnims, stopAutoScroll]);

  const openDetail = useCallback((cityId: string) => {
    setDetailCityId(cityId);
    setSheet('detail');
  }, []);

  const openAdd = useCallback(() => {
    setCitySearch('');
    setSheet('add');
  }, []);

  const closeSheet = () => setSheet(null);

  const jumpToNow = useCallback(() => {
    setSelectedMin(nowMinutes());
    setCurrentMin(nowMinutes());
  }, []);

  const applyReorderMove = useCallback((pageY: number, startY: number, startIndex: number) => {
    const dy = pageY - startY;
    dragAnimY.setValue(dy);
    const h = rowHRef.current;
    const last = citiesRef.current.length - 1;
    // Hysteresis: only switch slots once past ~55% of a row to reduce flicker on the boundary.
    const raw = startIndex + dy / h;
    let next = hoverIndexRef.current >= 0 ? hoverIndexRef.current : startIndex;
    if (raw >= next + 0.55) next = Math.floor(raw + 0.45);
    else if (raw <= next - 0.55) next = Math.ceil(raw - 0.45);
    next = Math.max(0, Math.min(last, next));
    if (next !== hoverIndexRef.current) {
      hoverIndexRef.current = next;
      setHoverIndex(next);
    }
  }, [dragAnimY]);

  const tickAutoScroll = useCallback(() => {
    autoScrollRaf.current = null;
    const p = scrub.current;
    if (!p || p.mode !== 'reorder' || settlingRef.current) return;

    const localY = p.lastPageY - listPageTopRef.current;
    const h = listHRef.current;
    let speed = 0;
    if (localY < DRAG_EDGE) {
      speed = -DRAG_SCROLL_MAX * (1 - Math.max(0, localY) / DRAG_EDGE);
    } else if (localY > h - DRAG_EDGE) {
      speed = DRAG_SCROLL_MAX * (1 - Math.max(0, h - localY) / DRAG_EDGE);
    }

    if (speed !== 0) {
      const contentH =
        listTop + citiesRef.current.length * rowHRef.current + SCREEN_LIST_BOTTOM_PADDING;
      const maxScroll = Math.max(0, contentH - h);
      const next = Math.max(0, Math.min(maxScroll, scrollYRef.current + speed));
      const applied = next - scrollYRef.current;
      if (applied !== 0) {
        scrollYRef.current = next;
        // Keep finger→row mapping stable while content scrolls under the touch.
        p.startY -= applied;
        scrollRef.current?.scrollTo({ y: next, animated: false });
        applyReorderMove(p.lastPageY, p.startY, p.startIndex);
      }
    }

    autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
  }, [applyReorderMove, listTop]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollRaf.current != null) return;
    autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
  }, [tickAutoScroll]);

  const beginReorder = useCallback(
    (p: NonNullable<typeof scrub.current>) => {
      // Anchor at current finger so the row doesn't jump when long-press fires.
      p.startY = p.lastPageY;
      p.mode = 'reorder';
      dragActiveRef.current = true;
      dragAnimY.setValue(0);
      resetSiblingAnims();
      hoverIndexRef.current = p.startIndex;
      setDragCityId(p.cityId);
      setDragFromIndex(p.startIndex);
      setHoverIndex(p.startIndex);
      if (Platform.OS !== 'web') Vibration.vibrate(12);
      startAutoScroll();
    },
    [dragAnimY, resetSiblingAnims, startAutoScroll]
  );

  // —— Row: tap = detail, horizontal = scrub, long-press = reorder, vertical = scroll ——
  // Touches are tracked via onTouch* so ScrollView can scroll until scrub/reorder claims the gesture.
  const rowOwnsGesture = useCallback(() => {
    const mode = scrub.current?.mode;
    return mode === 'scrub' || mode === 'reorder' || dragActiveRef.current;
  }, []);

  const onRowGrant = useCallback(
    (cityId: string, e: GestureResponderEvent) => {
      if (settlingRef.current) return;
      const idx = citiesRef.current.findIndex((c) => c.id === cityId);
      const pageY = e.nativeEvent.pageY;
      scrub.current = {
        cityId,
        mode: 'pending',
        startX: e.nativeEvent.pageX,
        startY: pageY,
        lastPageY: pageY,
        startSelMin: selectedMinRef.current,
        startIndex: idx,
      };
      clearLp();
      if (!cityId) return; // Empty-area scrub: no long-press reorder / tap-detail.
      lpTimer.current = setTimeout(() => {
        const p = scrub.current;
        if (p?.mode === 'pending' && p.cityId) beginReorder(p);
      }, 380);
    },
    [beginReorder]
  );

  const onRowMove = useCallback(
    (e: GestureResponderEvent) => {
      const p = scrub.current;
      if (!p || settlingRef.current) return;
      p.lastPageY = e.nativeEvent.pageY;
      const dx = e.nativeEvent.pageX - p.startX;
      const dy = e.nativeEvent.pageY - p.startY;
      if (p.mode === 'pending') {
        if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy) * 1.15) {
          clearLp();
          p.mode = 'scrub';
          setScrubbing(true);
        } else if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          // Yield to vertical scroll — do not hold the row gesture.
          clearLp();
          scrub.current = null;
          return;
        } else {
          return;
        }
      }
      if (p.mode === 'scrub') {
        setSelectedMin(p.startSelMin - dx / PX_PER_MIN);
      } else if (p.mode === 'reorder' && p.cityId) {
        applyReorderMove(e.nativeEvent.pageY, p.startY, p.startIndex);
      }
    },
    [applyReorderMove]
  );

  const onRowRelease = useCallback(() => {
    clearLp();
    const p = scrub.current;
    scrub.current = null;
    setScrubbing(false);
    // Idempotent: touch-end + responder-release can both fire for one gesture.
    if (!p) return;

    if (p.mode === 'pending' && p.cityId) openDetail(p.cityId);
    if (p.mode === 'scrub') setSelectedMin((m) => snapMinutes(m));

    if (p.mode === 'reorder' && p.cityId) {
      const from = p.startIndex;
      const to = hoverIndexRef.current;
      stopAutoScroll();
      if (from < 0 || to < 0 || from === to) {
        endDragVisual();
        return;
      }
      // Soft-land into the open slot, then commit store order once.
      settlingRef.current = true;
      const settleY = (to - from) * rowHRef.current;
      Animated.spring(dragAnimY, {
        toValue: settleY,
        useNativeDriver: true,
        speed: 48,
        bounciness: 4,
      }).start(({ finished }) => {
        // Drop drag chrome sync before store write so the reorder paint has no stale transforms.
        dragActiveRef.current = false;
        dragAnimY.setValue(0);
        resetSiblingAnims();
        hoverIndexRef.current = -1;
        settlingRef.current = false;
        setDragCityId(null);
        setDragFromIndex(-1);
        setHoverIndex(-1);
        if (finished) reorderCity(from, to);
      });
      return;
    }
    endDragVisual();
  }, [dragAnimY, endDragVisual, openDetail, reorderCity, resetSiblingAnims, stopAutoScroll]);

  const onContainerMove = useCallback(
    (e: GestureResponderEvent) => {
      const p = scrub.current;
      if (p?.mode === 'reorder' && p.cityId) {
        p.lastPageY = e.nativeEvent.pageY;
        applyReorderMove(e.nativeEvent.pageY, p.startY, p.startIndex);
      } else if (p) {
        onRowMove(e);
      }
    },
    [applyReorderMove, onRowMove]
  );

  const onContainerUp = useCallback(() => {
    onRowRelease();
  }, [onRowRelease]);

  const rowGestureProps = useCallback(
    (cityId: string, enabled: boolean) => ({
      onStartShouldSetResponder: () => enabled && rowOwnsGesture(),
      onMoveShouldSetResponder: () => enabled && rowOwnsGesture(),
      onResponderTerminationRequest: () => !rowOwnsGesture(),
      onTouchStart: (e: GestureResponderEvent) => {
        if (enabled) onRowGrant(cityId, e);
      },
      onTouchMove: (e: GestureResponderEvent) => {
        if (enabled) onRowMove(e);
      },
      onTouchEnd: () => {
        if (enabled) onRowRelease();
      },
      onTouchCancel: () => {
        if (enabled) onRowRelease();
      },
      onResponderMove: onRowMove,
      onResponderRelease: onRowRelease,
      onResponderTerminate: onRowRelease,
    }),
    [onRowGrant, onRowMove, onRowRelease, rowOwnsGesture]
  );

  // Whole-page scrub (marker band + empty gaps). Rows overwrite cityId on bubble start for reorder/detail.
  const pageScrubProps = useMemo(
    () => ({
      onTouchStartCapture: (e: GestureResponderEvent) => {
        if (!settlingRef.current) onRowGrant('', e);
      },
      onTouchMoveCapture: onContainerMove,
      onTouchEndCapture: onContainerUp,
      onTouchCancelCapture: onContainerUp,
      onStartShouldSetResponder: () => rowOwnsGesture(),
      onMoveShouldSetResponder: () => rowOwnsGesture(),
      onMoveShouldSetResponderCapture: () => rowOwnsGesture(),
      onResponderTerminationRequest: () => !rowOwnsGesture(),
      onResponderMove: onContainerMove,
      onResponderRelease: onContainerUp,
      onResponderTerminate: onContainerUp,
    }),
    [onContainerMove, onContainerUp, onRowGrant, rowOwnsGesture]
  );
  const addedNames = useMemo(() => new Set(cities.map((c) => c.name)), [cities]);

  const toggleCatalogCity = useCallback(
    (name: string) => {
      const existing = citiesRef.current.find((c) => c.name === name);
      if (existing) {
        removeCity(existing.id);
      } else {
        const entry = CATALOG.find((c) => c.name === name);
        if (entry) addCity(entry);
      }
      if (Platform.OS !== 'web') Vibration.vibrate(8);
    },
    [addCity, removeCity]
  );

  const rows = useMemo(
    () => buildCityRows(cities, selectedMin, currentMin, use24h, viewportW),
    [cities, selectedMin, currentMin, use24h, viewportW]
  );
  const gridLines = useMemo(() => buildGridLines(selectedMin, viewportW), [selectedMin, viewportW]);
  const curX = screenX(selectedMin, currentMin, viewportW);
  const currentMarkerVisible = showCurrentMarker && curX >= -20 && curX <= viewportW + 20;
  const nowLocal = new Date(currentMin * 60000);
  const currentMarkerText = formatClock(nowLocal.getHours() * 60 + nowLocal.getMinutes(), use24h);

  const catalogSections = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    const localOffset = -new Date().getTimezoneOffset();
    const favoriteSet = new Set<string>(FAVORITE_NAMES);
    const rows = CATALOG.filter((e) => {
      if (!q) return true;
      return `${e.name} ${e.abbr} utc${fmtOffset(e.offset)}`.toLowerCase().includes(q);
    }).map((e) => ({
      ...e,
      timeNow: formatClock(normMod(selectedMin + e.offset, 1440), use24h),
      sub: `${e.abbr} UTC${fmtOffset(e.offset)}`,
      added: addedNames.has(e.name),
      nearYou: e.offset === localOffset,
      suggested: favoriteSet.has(e.name) || e.offset === localOffset,
    }));

    const byName = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
      if (a.added !== b.added) return a.added ? 1 : -1;
      return a.name.localeCompare(b.name);
    };

    if (q) {
      return rows.length
        ? [{ title: `${rows.length} match${rows.length === 1 ? '' : 'es'}`, data: rows.sort(byName) }]
        : [];
    }

    const suggested = rows.filter((e) => e.suggested).sort(byName);
    const suggestedNames = new Set(suggested.map((e) => e.name));
    const rest = rows.filter((e) => !suggestedNames.has(e.name)).sort(byName);
    return [
      ...(suggested.length ? [{ title: 'Suggested', data: suggested }] : []),
      { title: 'All cities', data: rest },
    ];
  }, [citySearch, selectedMin, use24h, addedNames]);

  const detailCity = cities.find((c) => c.id === detailCityId);

  return (
    <View style={styles.container}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />

      <View
        style={styles.timeline}
        onLayout={(e: LayoutChangeEvent) => {
          setViewportW(e.nativeEvent.layout.width);
          setTimelineH(e.nativeEvent.layout.height);
        }}
        {...pageScrubProps}
      >
        {gridLines.map((x, i) => (
          <View key={`g-${i}`} pointerEvents="none" style={[styles.gridLine, { left: x }]} />
        ))}

        <ScrollView
          ref={scrollRef}
          style={[styles.rowScroll, { top: 0 }]}
          contentContainerStyle={[styles.rowScrollContent, { paddingTop: listTop }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!scrubbing && !dragCityId}
          scrollEventThrottle={16}
          onLayout={(e) => {
            listHRef.current = e.nativeEvent.layout.height;
            // GH ScrollView ref typing omits measureInWindow; native node still has it.
            (scrollRef.current as unknown as View | null)?.measureInWindow?.((_x, y) => {
              listPageTopRef.current = y;
            });
          }}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
        >
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No cities yet</Text>
              <Text style={styles.emptyBody}>Add cities to compare their times across the day.</Text>
              <Pressable onPress={openAdd} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Add city</Text>
              </Pressable>
            </View>
          ) : (
            rows.map((row) => {
              const dragLive = dragActiveRef.current;
              const isDragging = dragLive && dragCityId === row.id;
              return (
                <Animated.View
                  key={row.id}
                  style={[
                    styles.cityRow,
                    isDragging && styles.cityRowDragging,
                    isDragging
                      ? { transform: [{ translateY: dragAnimY }, { scale: 1.03 }] }
                      : { transform: [{ translateY: siblingAnim(row.id) }] },
                  ]}
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    if (h > 0 && Math.abs(h - rowH) > 1) setRowH(h);
                  }}
                  {...rowGestureProps(row.id, !settlingRef.current)}
                >
                  <View style={styles.cityMeta} pointerEvents="none">
                    <View style={styles.cityText}>
                      <Text
                        style={[
                          styles.relLabel,
                          {
                            color: row.relIsAccent ? colors.red : colors.subtext,
                          },
                        ]}
                      >
                        {row.relLabel}
                      </Text>
                      <Text style={styles.cityName}>{row.name}</Text>
                      <Text style={styles.citySub}>{row.sub}</Text>
                    </View>
                    <Text style={styles.cityTime}>{row.timeLabel}</Text>
                  </View>

                  <View style={styles.barTrack} pointerEvents="none">
                    {row.dayPills.map((pill) => (
                      <DayPillBar key={pill.key} left={pill.left} width={pill.width} label={pill.label} />
                    ))}
                  </View>
                </Animated.View>
              );
            })
          )}
          {/* Grows so empty viewport below the list is still a hit target. */}
          <View style={styles.scrubFill} />
        </ScrollView>

        {/* Marker overlay draws above rows. */}
        <View pointerEvents="none" style={styles.markerOverlay} collapsable={false}>
          <View style={[styles.centerMarker, { backgroundColor: colors.red }]} />
          {currentMarkerVisible ? (
            <>
              <View style={[styles.nowMarkerLine, { left: curX - 1 }]}>
                <DashedMarkerLine height={Math.max(0, timelineH)} color={colors.primary} />
              </View>
              <View
                style={[
                  styles.nowLabelWrap,
                  {
                    top: scrollPaddingTop + 4,
                    transform: [{ translateX: curX - viewportW / 2 }],
                  },
                ]}
              >
                <Text style={styles.nowLabel}>Now {currentMarkerText}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <StackScreenHeader
        title="World"
        trailing={
          <View style={styles.headerActions}>
            <CircularIconButton
              icon="locate"
              accessibilityLabel="Jump to now"
              onPress={jumpToNow}
            />
            <CircularIconButton icon="add" accessibilityLabel="Add city" onPress={openAdd} />
          </View>
        }
      />

      <SettingsSheet title="Add city" visible={sheet === 'add'} onClose={closeSheet} tall>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.subtext} />
          <TextInput
            value={citySearch}
            onChangeText={setCitySearch}
            placeholder="Search city or timezone"
            placeholderTextColor={colors.subtext}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {citySearch ? (
            <Pressable onPress={() => setCitySearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.subtext} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.sheetHint}>Tap again to remove. Stay open to add several.</Text>
        <SectionList
          style={{ flex: 1 }}
          sections={catalogSections}
          keyExtractor={(entry) => entry.name}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: Spacing.md }}
          ListEmptyComponent={<Text style={styles.noMatches}>No matches</Text>}
          renderSectionHeader={({ section }) =>
            section.data.length ? (
              <Text style={styles.catalogSection}>{section.title}</Text>
            ) : null
          }
          renderItem={({ item: entry }) => (
            <Pressable onPress={() => toggleCatalogCity(entry.name)} style={styles.catalogRow}>
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <Text style={styles.catalogName}>{entry.name}</Text>
                <Text style={styles.catalogSub}>
                  {entry.nearYou && !entry.added ? 'Same zone · ' : ''}
                  {entry.sub}
                </Text>
              </View>
              <Text style={styles.catalogTime}>{entry.timeNow}</Text>
              <Ionicons
                name={entry.added ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={entry.added ? colors.primary : colors.subtext}
                style={{ marginLeft: 10 }}
              />
            </Pressable>
          )}
        />
      </SettingsSheet>

      <SettingsSheet title={detailCity?.name ?? 'City'} visible={sheet === 'detail'} onClose={closeSheet}>
        {detailCity ? (
          <>
            <Text style={styles.detailSub}>
              {detailCity.abbr} UTC{fmtOffset(detailCity.offset)}
            </Text>
            <Text style={styles.detailTime}>
              {formatClock(normMod(selectedMin + detailCity.offset, 1440), use24h)}
            </Text>
            <Pressable
              onPress={() => {
                if (detailCityId) removeCity(detailCityId);
                setDetailCityId(null);
                closeSheet();
              }}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>Remove city</Text>
            </Pressable>
          </>
        ) : null}
      </SettingsSheet>
    </View>
  );
}

function createWorldStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    timeline: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    gridLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      opacity: 0.55,
    },
    markerOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
      elevation: 20,
    },
    nowMarkerLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
    },
    nowLabelWrap: {
      position: 'absolute',
      top: 4,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    nowLabel: withAppFont({
      color: c.primary,
      fontSize: 11,
      fontWeight: '600',
    }),
    centerMarker: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '50%',
      marginLeft: -1,
      width: 2,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    rowScroll: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    rowScrollContent: {
      flexGrow: 1,
      paddingBottom: SCREEN_LIST_BOTTOM_PADDING,
    },
    scrubFill: {
      flexGrow: 1,
      minHeight: 80,
    },
    empty: {
      paddingHorizontal: BAR_INSET,
      paddingTop: Spacing.xxl,
      alignItems: 'center',
    },
    emptyTitle: withAppFont({
      fontSize: 20,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: Spacing.sm,
    }),
    emptyBody: withAppFont({
      fontSize: 15,
      color: c.subtext,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: Spacing.lg,
    }),
    emptyButton: {
      backgroundColor: c.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
      borderRadius: BorderRadius.full,
    },
    emptyButtonText: withAppFont({
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    }),
    cityRow: {
      paddingTop: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      zIndex: 1,
    },
    cityRowDragging: {
      zIndex: 10,
      backgroundColor: c.card,
      borderRadius: BorderRadius.md,
      marginHorizontal: Spacing.sm,
      borderBottomWidth: 0,
      shadowColor: '#000',
      shadowOpacity: 0.45,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
      opacity: 0.97,
    },
    cityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: BAR_INSET,
      paddingBottom: 10,
      gap: Spacing.md,
    },
    cityText: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    relLabel: withAppFont({
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
    }),
    cityName: withAppFont({
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: -0.2,
      marginTop: 2,
    }),
    citySub: withAppFont({
      color: c.subtext,
      fontSize: 12,
      marginTop: 2,
    }),
    cityTime: withAppFont({
      color: c.textPrimary,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.3,
      textAlign: 'right',
      minWidth: 112,
      fontVariant: ['tabular-nums'],
    }),
    barTrack: {
      height: 40,
      marginHorizontal: BAR_INSET,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: Spacing.sm,
      borderRadius: 18,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      marginBottom: Spacing.sm,
    },
    searchInput: withAppFont({
      flex: 1,
      color: c.textPrimary,
      fontSize: 15,
      padding: 0,
    }),
    sheetHint: withAppFont({
      color: c.subtext,
      fontSize: 12,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    }),
    catalogSection: withAppFont({
      color: c.subtext,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      paddingHorizontal: Spacing.xs,
      backgroundColor: c.surfaceElevated,
    }),
    catalogRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    catalogName: withAppFont({
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    }),
    catalogSub: withAppFont({
      color: c.subtext,
      fontSize: 12,
      marginTop: 1,
    }),
    catalogTime: withAppFont({
      color: c.subtext,
      fontSize: 15,
    }),
    noMatches: withAppFont({
      color: c.subtext,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 30,
    }),
    detailSub: withAppFont({
      color: c.subtext,
      fontSize: 14,
      marginTop: -Spacing.sm,
    }),
    detailTime: withAppFont({
      color: c.textPrimary,
      fontSize: 44,
      fontWeight: '600',
      marginVertical: Spacing.lg,
      letterSpacing: -0.5,
    }),
    removeButton: {
      backgroundColor: 'rgba(255,59,48,0.15)',
      borderRadius: BorderRadius.full,
      paddingVertical: 13,
      alignItems: 'center',
    },
    removeButtonText: withAppFont({
      color: c.red,
      fontSize: 16,
      fontWeight: '500',
    }),
  });
}
