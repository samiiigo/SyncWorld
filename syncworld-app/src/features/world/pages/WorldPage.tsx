import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  Vibration,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { StackScreenHeader } from '@/layouts/header/StackScreenHeader';
import { SCREEN_LIST_BOTTOM_PADDING } from '@/layouts/layout/screenLayout';
import { useTopChromeLayout } from '@/layouts/layout/useTopChromeLayout';
import { SettingsSheet } from '@/layouts/sheet/SettingsSheet';
import { CircularIconButton } from '@/shared/components/CircularIconButton';
import { useWorldStore } from '../state/world.store';
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
  type City,
  type CityRow,
} from '../utils/timeline';
import {
  useCreateStyles,
  useResolvedColorScheme,
  useThemedColors,
  Spacing,
  BorderRadius,
  withAppFont,
} from '@/shared/theme';
import type { ColorPalette } from '@/shared/theme/colorPalettes';

const MARKER_BAND = 14;
const DRAG_EDGE = 56;
const DRAG_SCROLL_MAX = 14;
const SLOT_LAYOUT = {
  duration: 160,
  update: { type: LayoutAnimation.Types.easeInEaseOut },
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function CityRowBody({
  row,
  styles,
  colors,
}: {
  row: CityRow;
  styles: ReturnType<typeof createWorldStyles>;
  colors: ColorPalette;
}) {
  return (
    <>
      <View style={styles.cityMeta} pointerEvents="none">
        <View style={styles.cityText}>
          <Text
            style={[
              styles.relLabel,
              { color: row.relIsAccent ? colors.red : colors.subtext },
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
    </>
  );
}

export default function WorldTimelineScreen() {
  const { cities, use24h, showCurrentMarker, addCity, removeCity, setCities } =
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
  const [dragBaseTop, setDragBaseTop] = useState(0);
  // Live order while dragging — store only updates on drop.
  const [previewCities, setPreviewCities] = useState<City[] | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const listCities = previewCities ?? cities;

  const selectedMinRef = useRef(selectedMin);
  selectedMinRef.current = selectedMin;
  const citiesRef = useRef(listCities);
  citiesRef.current = listCities;
  const listTopRef = useRef(listTop);
  listTopRef.current = listTop;
  const rowHRef = useRef(rowH);
  rowHRef.current = rowH;
  const dragIndexRef = useRef(-1);
  const dragBaseTopRef = useRef(0);
  const dragAnimY = useRef(new Animated.Value(0)).current;
  const settlingRef = useRef(false);
  const dragActiveRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const listHRef = useRef(500);
  const listPageTopRef = useRef(0);
  const autoScrollRaf = useRef<number | null>(null);

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
    setDragCityId(null);
    setPreviewCities(null);
    dragIndexRef.current = -1;
    settlingRef.current = false;
  }, [dragAnimY, stopAutoScroll]);

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

  const applyReorderMove = useCallback(
    (pageY: number, startY: number) => {
      if (settlingRef.current) return;
      // Floating clone tracks the finger in screen space (startY never shifts for slots/scroll).
      dragAnimY.setValue(pageY - startY);

      const h = rowHRef.current;
      const list = citiesRef.current;
      const last = list.length - 1;
      const contentY =
        pageY - listPageTopRef.current + scrollYRef.current - listTopRef.current;
      const raw = contentY / h;
      let next = dragIndexRef.current >= 0 ? dragIndexRef.current : 0;
      if (raw >= next + 0.55) next = Math.floor(raw + 0.45);
      else if (raw <= next - 0.55) next = Math.ceil(raw - 0.45);
      next = Math.max(0, Math.min(last, next));
      if (next === dragIndexRef.current) return;

      const from = dragIndexRef.current;
      const ordered = list.slice();
      const [item] = ordered.splice(from, 1);
      ordered.splice(next, 0, item);
      citiesRef.current = ordered;
      dragIndexRef.current = next;
      LayoutAnimation.configureNext(SLOT_LAYOUT);
      setPreviewCities(ordered);
    },
    [dragAnimY]
  );

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
        listTopRef.current +
        citiesRef.current.length * rowHRef.current +
        SCREEN_LIST_BOTTOM_PADDING;
      const maxScroll = Math.max(0, contentH - h);
      const next = Math.max(0, Math.min(maxScroll, scrollYRef.current + speed));
      if (next !== scrollYRef.current) {
        scrollYRef.current = next;
        scrollRef.current?.scrollTo({ y: next, animated: false });
        applyReorderMove(p.lastPageY, p.startY);
      }
    }

    autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
  }, [applyReorderMove]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollRaf.current != null) return;
    autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
  }, [tickAutoScroll]);

  const beginReorder = useCallback(
    (p: NonNullable<typeof scrub.current>) => {
      p.startY = p.lastPageY;
      p.mode = 'reorder';
      dragActiveRef.current = true;
      dragIndexRef.current = p.startIndex;
      dragAnimY.setValue(0);
      const baseTop =
        listTopRef.current + p.startIndex * rowHRef.current - scrollYRef.current;
      dragBaseTopRef.current = baseTop;
      setDragBaseTop(baseTop);
      const copy = citiesRef.current.slice();
      citiesRef.current = copy;
      setPreviewCities(copy);
      setDragCityId(p.cityId);
      if (Platform.OS !== 'web') Vibration.vibrate(12);
      startAutoScroll();
    },
    [dragAnimY, startAutoScroll]
  );

  // —— Row: tap = detail, horizontal = scrub, long-press = reorder, vertical = scroll ——
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
      if (!cityId) return;
      lpTimer.current = setTimeout(() => {
        const cur = scrub.current;
        if (cur?.mode === 'pending' && cur.cityId) beginReorder(cur);
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
        applyReorderMove(e.nativeEvent.pageY, p.startY);
      }
    },
    [applyReorderMove]
  );

  const onRowRelease = useCallback(() => {
    clearLp();
    const p = scrub.current;
    scrub.current = null;
    setScrubbing(false);
    if (!p) return;

    if (p.mode === 'pending' && p.cityId) openDetail(p.cityId);
    if (p.mode === 'scrub') setSelectedMin((m) => snapMinutes(m));

    if (p.mode === 'reorder' && p.cityId) {
      stopAutoScroll();
      settlingRef.current = true;
      const finalOrder = citiesRef.current;
      const storeCities = useWorldStore.getState().cities;
      const changed =
        finalOrder.length !== storeCities.length ||
        finalOrder.some((c, i) => c.id !== storeCities[i]?.id);
      const slotTop =
        listTopRef.current + dragIndexRef.current * rowHRef.current - scrollYRef.current;
      const settleDy = slotTop - dragBaseTopRef.current;
      Animated.timing(dragAnimY, {
        toValue: settleDy,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (changed) setCities(finalOrder);
        endDragVisual();
      });
      return;
    }
    endDragVisual();
  }, [dragAnimY, endDragVisual, openDetail, setCities, stopAutoScroll]);

  const onContainerMove = useCallback(
    (e: GestureResponderEvent) => {
      const p = scrub.current;
      if (p?.mode === 'reorder' && p.cityId) {
        p.lastPageY = e.nativeEvent.pageY;
        applyReorderMove(e.nativeEvent.pageY, p.startY);
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
    () => buildCityRows(listCities, selectedMin, currentMin, use24h, viewportW),
    [listCities, selectedMin, currentMin, use24h, viewportW]
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

    const suggested = rows.filter((e) => e.suggested).sort((a, b) => {
      if (a.offset !== b.offset) return a.offset - b.offset;
      return byName(a, b);
    });
    const suggestedNames = new Set(suggested.map((e) => e.name));
    const rest = rows.filter((e) => !suggestedNames.has(e.name)).sort(byName);
    return [
      ...(suggested.length ? [{ title: 'Suggested', data: suggested }] : []),
      { title: 'All cities', data: rest },
    ];
  }, [citySearch, selectedMin, use24h, addedNames]);

  const detailCity = cities.find((c) => c.id === detailCityId);
  const dragRow = dragCityId ? rows.find((r) => r.id === dragCityId) : undefined;

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
              <Pressable
                onPress={openAdd}
                style={styles.emptyButton}
                accessibilityRole="button"
                accessibilityLabel="Add city"
              >
                <Text style={styles.emptyButtonText}>Add city</Text>
              </Pressable>
            </View>
          ) : (
            rows.map((row) => {
              const isDragging = !!dragCityId && dragCityId === row.id;
              return (
                <View
                  key={row.id}
                  style={[styles.cityRow, isDragging && styles.cityRowPlaceholder]}
                  onLayout={(e) => {
                    if (dragActiveRef.current || settlingRef.current) return;
                    const h = e.nativeEvent.layout.height;
                    if (h > 0 && Math.abs(h - rowHRef.current) > 1) setRowH(h);
                  }}
                  {...rowGestureProps(row.id, !settlingRef.current && !isDragging)}
                >
                  <CityRowBody row={row} styles={styles} colors={colors} />
                </View>
              );
            })
          )}
          {/* Grows so empty viewport below the list is still a hit target. */}
          <View style={styles.scrubFill} />
        </ScrollView>

        {dragRow ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cityRow,
              styles.cityRowDragging,
              styles.cityRowFloating,
              { top: dragBaseTop, transform: [{ translateY: dragAnimY }] },
            ]}
          >
            <CityRowBody row={dragRow} styles={styles} colors={colors} />
          </Animated.View>
        ) : null}

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
                    left: curX,
                  },
                ]}
              >
                <View style={[styles.nowArrow, { borderTopColor: colors.primary }]} />
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

      <SettingsSheet
        title="Add city"
        visible={sheet === 'add'}
        onClose={closeSheet}
        tall
        headerExtra={
          <View style={styles.searchWrap}>
            <Ionicons
              name="search"
              size={18}
              color={colors.textSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <TextInput
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder="Search city or timezone"
              placeholderTextColor={colors.subtext}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Search city or timezone"
            />
            {citySearch ? (
              <Pressable
                onPress={() => setCitySearch('')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={colors.subtext} />
              </Pressable>
            ) : null}
          </View>
        }
      >
        <SectionList
          style={{ flex: 1 }}
          sections={catalogSections}
          keyExtractor={(entry) => entry.name}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
          ListEmptyComponent={<Text style={styles.noMatches}>No matches</Text>}
          renderSectionHeader={({ section }) =>
            section.data.length ? (
              <Text
                style={[
                  styles.catalogSection,
                  section.title === 'All cities' && styles.catalogSectionSpaced,
                ]}
                accessibilityRole="header"
              >
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item: entry }) => (
            <Pressable
              onPress={() => toggleCatalogCity(entry.name)}
              style={styles.catalogRow}
              accessibilityRole="button"
              accessibilityState={{ selected: entry.added }}
              accessibilityLabel={`${entry.name}, ${entry.sub}, ${entry.timeNow}`}
              accessibilityHint={entry.added ? 'Removes this city' : 'Adds this city'}
            >
              <View style={styles.catalogText} importantForAccessibility="no">
                <Text style={styles.catalogName} numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text style={styles.catalogSub} numberOfLines={1}>
                  {entry.nearYou && !entry.added ? 'Same zone · ' : ''}
                  {entry.sub}
                </Text>
              </View>
              <Text style={styles.catalogTime} importantForAccessibility="no">
                {entry.timeNow}
              </Text>
              <View style={styles.catalogAction} importantForAccessibility="no">
                <Ionicons
                  name={entry.added ? 'checkmark-circle' : 'add-circle-outline'}
                  size={22}
                  color={entry.added ? colors.primary : colors.subtext}
                />
              </View>
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
            <Text
              style={styles.detailTime}
              accessibilityLabel={`Local time ${formatClock(normMod(selectedMin + detailCity.offset, 1440), use24h)}`}
            >
              {formatClock(normMod(selectedMin + detailCity.offset, 1440), use24h)}
            </Text>
            <Pressable
              onPress={() => {
                if (detailCityId) removeCity(detailCityId);
                setDetailCityId(null);
                closeSheet();
              }}
              style={styles.removeButton}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${detailCity.name}`}
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      // Center the down-arrow on the dashed line (half of arrow width).
      transform: [{ translateX: -5 }],
    },
    nowArrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
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
      minHeight: ROW_H,
      paddingTop: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      zIndex: 1,
      backgroundColor: c.background,
    },
    cityRowPlaceholder: {
      opacity: 0,
    },
    cityRowFloating: {
      position: 'absolute',
      left: 0,
      right: 0,
    },
    cityRowDragging: {
      zIndex: 20,
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
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
      marginBottom: Spacing.xs,
      borderRadius: 18,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.surface,
      borderRadius: BorderRadius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingLeft: Spacing.md,
      paddingRight: Spacing.sm,
      minHeight: 44,
      marginBottom: Spacing.sm + 5,
    },
    searchInput: withAppFont({
      flex: 1,
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '500',
      padding: 0,
      margin: 0,
      textAlignVertical: 'center',
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    }),
    catalogSection: withAppFont({
      color: c.subtext,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      paddingTop: 0,
      paddingBottom: Spacing.xs,
      backgroundColor: 'transparent',
    }),
    catalogSectionSpaced: {
      paddingTop: Spacing.xl,
    },
    catalogRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 56,
      paddingVertical: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    catalogText: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    catalogName: withAppFont({
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 20,
    }),
    catalogSub: withAppFont({
      color: c.subtext,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    }),
    catalogTime: withAppFont({
      color: c.subtext,
      fontSize: 15,
      lineHeight: 20,
      fontVariant: ['tabular-nums'],
      textAlign: 'right',
      width: 88,
    }),
    catalogAction: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noMatches: withAppFont({
      color: c.subtext,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 30,
    }),
    detailSub: withAppFont({
      color: c.subtext,
      fontSize: 14,
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
