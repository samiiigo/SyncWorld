import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
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
  MONTHS,
  nowMinutes,
  PX_PER_MIN,
  ROW_H,
  buildCityRows,
  buildGridLines,
  dateRangeLabel,
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

type Sheet = 'add' | 'date' | 'detail' | null;

export default function WorldTimelineScreen() {
  const { cities, use24h, showCurrentMarker, addCity, removeCity, reorderCity } = useWorldStore();
  const { scrollPaddingTop } = useTopChromeLayout();
  const colors = useThemedColors();
  const scheme = useResolvedColorScheme();
  const styles = useCreateStyles(createWorldStyles);

  const [selectedMin, setSelectedMin] = useState(nowMinutes);
  const [currentMin, setCurrentMin] = useState(nowMinutes);
  const [viewportW, setViewportW] = useState(390);
  const [timelineH, setTimelineH] = useState(600);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [citySearch, setCitySearch] = useState('');
  const [detailCityId, setDetailCityId] = useState<string | null>(null);
  const [dragCityId, setDragCityId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonthIdx, setPickerMonthIdx] = useState(() => new Date().getMonth());

  const selectedMinRef = useRef(selectedMin);
  selectedMinRef.current = selectedMin;
  const citiesRef = useRef(cities);
  citiesRef.current = cities;

  const scrub = useRef<{
    cityId: string | null;
    mode: 'pending' | 'scrub' | 'reorder';
    startX: number;
    startY: number;
    startSelMin: number;
    startIndex: number;
  } | null>(null);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setCurrentMin(nowMinutes()), 20000);
    return () => clearInterval(id);
  }, []);

  const clearLp = () => {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  };

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
    (pageY: number, startY: number, startIndex: number, cityId: string) => {
      const dy = pageY - startY;
      const list = citiesRef.current;
      const idx = list.findIndex((c) => c.id === cityId);
      const shift = Math.round(dy / ROW_H);
      const newIdx = Math.max(0, Math.min(list.length - 1, startIndex + shift));
      if (newIdx !== idx) {
        reorderCity(idx, newIdx);
        setDragOffsetY(dy - shift * ROW_H);
      } else {
        setDragOffsetY(dy);
      }
    },
    [reorderCity]
  );

  // —— Row: tap = detail, horizontal = scrub, long-press = reorder, vertical = scroll ——
  const onRowGrant = useCallback((cityId: string, e: GestureResponderEvent) => {
    const idx = citiesRef.current.findIndex((c) => c.id === cityId);
    scrub.current = {
      cityId,
      mode: 'pending',
      startX: e.nativeEvent.pageX,
      startY: e.nativeEvent.pageY,
      startSelMin: selectedMinRef.current,
      startIndex: idx,
    };
    clearLp();
    lpTimer.current = setTimeout(() => {
      const p = scrub.current;
      if (p?.mode === 'pending' && p.cityId) {
        p.mode = 'reorder';
        setDragCityId(p.cityId);
        setDragOffsetY(0);
      }
    }, 420);
  }, []);

  const onRowMove = useCallback(
    (e: GestureResponderEvent) => {
      const p = scrub.current;
      if (!p) return;
      const dx = e.nativeEvent.pageX - p.startX;
      const dy = e.nativeEvent.pageY - p.startY;
      if (p.mode === 'pending') {
        if (Math.abs(dx) > 4 && Math.abs(dx) >= Math.abs(dy)) {
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
        applyReorderMove(e.nativeEvent.pageY, p.startY, p.startIndex, p.cityId);
      }
    },
    [applyReorderMove]
  );

  const onRowRelease = useCallback(() => {
    clearLp();
    const p = scrub.current;
    if (p?.mode === 'pending' && p.cityId) openDetail(p.cityId);
    if (p?.mode === 'scrub') setSelectedMin((m) => snapMinutes(m));
    scrub.current = null;
    setScrubbing(false);
    setDragCityId(null);
    setDragOffsetY(0);
  }, [openDetail]);

  const onContainerMove = useCallback(
    (e: GestureResponderEvent) => {
      const p = scrub.current;
      if (p?.mode === 'reorder' && p.cityId) {
        applyReorderMove(e.nativeEvent.pageY, p.startY, p.startIndex, p.cityId);
      } else if (p) {
        onRowMove(e);
      }
    },
    [applyReorderMove, onRowMove]
  );

  const onContainerUp = useCallback(() => {
    onRowRelease();
  }, [onRowRelease]);

  const addedNames = useMemo(() => new Set(cities.map((c) => c.name)), [cities]);

  const toggleCatalogCity = useCallback(
    (name: string) => {
      const existing = citiesRef.current.find((c) => c.name === name);
      if (existing) {
        removeCity(existing.id);
        return;
      }
      const entry = CATALOG.find((c) => c.name === name);
      if (entry) addCity(entry);
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
  const showRecenter = Math.abs(selectedMin - currentMin) >= 5;
  const nowLocal = new Date(currentMin * 60000);
  const currentMarkerText = formatClock(nowLocal.getHours() * 60 + nowLocal.getMinutes(), use24h);

  const catalogResults = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return CATALOG.filter((e) => !q || e.name.toLowerCase().includes(q)).map((e) => ({
      ...e,
      timeNow: formatClock(normMod(selectedMin + e.offset, 1440), use24h),
      sub: `${e.abbr} UTC${fmtOffset(e.offset)}`,
      added: addedNames.has(e.name),
    }));
  }, [citySearch, selectedMin, use24h, addedNames]);

  const detailCity = cities.find((c) => c.id === detailCityId);

  const openDatePicker = () => {
    const d = new Date(selectedMin * 60000);
    setPickerYear(d.getUTCFullYear());
    setPickerMonthIdx(d.getUTCMonth());
    setSheet('date');
  };

  const pickDate = (y: number, m: number, day: number) => {
    const tod = selectedMin % 1440;
    const dayIndex = Math.floor(Date.UTC(y, m, day) / 86400000);
    setSelectedMin(dayIndex * 1440 + tod);
    setSheet(null);
  };

  const pickToday = () => {
    jumpToNow();
    setSheet(null);
  };

  const pickerCells = useMemo(() => {
    const firstDow = new Date(Date.UTC(pickerYear, pickerMonthIdx, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(pickerYear, pickerMonthIdx + 1, 0)).getUTCDate();
    const todayIndex = Math.floor(Date.now() / 86400000);
    const selectedDayIndex = Math.floor(selectedMin / 1440);
    const cells: { key: string; label: string; day?: number; selected?: boolean; today?: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ key: `blank-${i}`, label: '' });
    for (let day = 1; day <= daysInMonth; day++) {
      const dIdx = Math.floor(Date.UTC(pickerYear, pickerMonthIdx, day) / 86400000);
      cells.push({
        key: `d-${day}`,
        label: String(day),
        day,
        selected: dIdx === selectedDayIndex,
        today: dIdx === todayIndex,
      });
    }
    return cells;
  }, [pickerYear, pickerMonthIdx, selectedMin]);

  return (
    <View style={styles.container}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />

      <View style={[styles.toolbar, { paddingTop: scrollPaddingTop }]}>
        <Pressable onPress={openDatePicker} style={styles.dateChip} hitSlop={4}>
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Text style={styles.dateChipText}>{dateRangeLabel(selectedMin)}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.subtext} />
        </Pressable>
        <Text style={styles.scrubHint}>Drag to scrub time</Text>
      </View>

      <View
        style={styles.timeline}
        onLayout={(e: LayoutChangeEvent) => {
          setViewportW(e.nativeEvent.layout.width);
          setTimelineH(e.nativeEvent.layout.height);
        }}
        onStartShouldSetResponder={() => !!dragCityId || !!scrub.current}
        onMoveShouldSetResponder={() => !!dragCityId || scrub.current?.mode === 'scrub' || scrub.current?.mode === 'reorder'}
        onResponderMove={onContainerMove}
        onResponderRelease={onContainerUp}
        onResponderTerminate={onContainerUp}
      >
        {gridLines.map((x, i) => (
          <View key={`g-${i}`} pointerEvents="none" style={[styles.gridLine, { left: x }]} />
        ))}

        {currentMarkerVisible ? (
          <>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: 22, bottom: 0, left: curX - 1, zIndex: 5 }}
            >
              <DashedMarkerLine height={Math.max(0, timelineH - 22)} color={colors.primary} />
            </View>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: 2, left: Math.max(8, curX - 6), zIndex: 7 }}
            >
              <Text style={styles.nowLabel}>Now {currentMarkerText}</Text>
            </View>
          </>
        ) : null}

        <View pointerEvents="none" style={[styles.centerMarker, { backgroundColor: colors.red }]} />

        {showRecenter ? (
          <Pressable onPress={jumpToNow} accessibilityLabel="Jump to now" style={styles.recenter}>
            <Ionicons name="locate" size={16} color="#fff" />
            <Text style={styles.recenterText}>Now</Text>
          </Pressable>
        ) : null}

        <ScrollView
          style={styles.rowScroll}
          contentContainerStyle={{ paddingBottom: SCREEN_LIST_BOTTOM_PADDING }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!scrubbing && !dragCityId}
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
              const isDragging = dragCityId === row.id;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.cityRow,
                    isDragging && styles.cityRowDragging,
                    isDragging ? { transform: [{ translateY: dragOffsetY }, { scale: 1.02 }] } : null,
                  ]}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderTerminationRequest={() => {
                    const mode = scrub.current?.mode;
                    return mode !== 'scrub' && mode !== 'reorder';
                  }}
                  onResponderGrant={(e) => onRowGrant(row.id, e)}
                  onResponderMove={onRowMove}
                  onResponderRelease={onRowRelease}
                  onResponderTerminate={onRowRelease}
                >
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
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      <StackScreenHeader
        title="World"
        trailing={
          <CircularIconButton icon="add" accessibilityLabel="Add city" onPress={openAdd} />
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
            autoFocus
          />
          {citySearch ? (
            <Pressable onPress={() => setCitySearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.subtext} />
            </Pressable>
          ) : null}
        </View>
        {!citySearch.trim() ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favorites}
          >
            {FAVORITE_NAMES.map((name) => {
              const entry = CATALOG.find((c) => c.name === name);
              if (!entry) return null;
              const added = addedNames.has(name);
              return (
                <Pressable
                  key={name}
                  onPress={() => toggleCatalogCity(name)}
                  style={[styles.favoriteChip, added && styles.favoriteChipAdded]}
                >
                  <Text style={[styles.favoriteChipText, added && styles.favoriteChipTextAdded]}>
                    {added ? '✓ ' : ''}
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        <Text style={styles.sheetHint}>Tap again to remove. Stay open to add several.</Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.md }}>
          {catalogResults.map((entry) => (
            <Pressable
              key={entry.name}
              onPress={() => toggleCatalogCity(entry.name)}
              style={styles.catalogRow}
            >
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <Text style={styles.catalogName}>{entry.name}</Text>
                <Text style={styles.catalogSub}>{entry.sub}</Text>
              </View>
              <Text style={styles.catalogTime}>{entry.timeNow}</Text>
              <Ionicons
                name={entry.added ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={entry.added ? colors.primary : colors.subtext}
                style={{ marginLeft: 10 }}
              />
            </Pressable>
          ))}
          {catalogResults.length === 0 ? (
            <Text style={styles.noMatches}>No matches</Text>
          ) : null}
        </ScrollView>
      </SettingsSheet>

      <SettingsSheet title="Select a date" visible={sheet === 'date'} onClose={closeSheet}>
        <Pressable onPress={pickToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Jump to today</Text>
        </Pressable>
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => {
              let y = pickerYear;
              let m = pickerMonthIdx - 1;
              if (m < 0) {
                m = 11;
                y -= 1;
              }
              setPickerYear(y);
              setPickerMonthIdx(m);
            }}
            hitSlop={8}
            style={styles.monthNavBtn}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTHS[pickerMonthIdx]} {pickerYear}
          </Text>
          <Pressable
            onPress={() => {
              let y = pickerYear;
              let m = pickerMonthIdx + 1;
              if (m > 11) {
                m = 0;
                y += 1;
              }
              setPickerYear(y);
              setPickerMonthIdx(m);
            }}
            hitSlop={8}
            style={styles.monthNavBtn}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
            <View key={`${wd}-${i}`} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{wd}</Text>
            </View>
          ))}
        </View>
        {chunk(pickerCells, 7).map((week, wi) => (
          <View key={`w-${wi}`} style={styles.weekRow}>
            {week.map((cell) => (
              <Pressable
                key={cell.key}
                onPress={() => cell.day != null && pickDate(pickerYear, pickerMonthIdx, cell.day)}
                style={[styles.dayCell, cell.selected && styles.dayCellSelected]}
              >
                <Text
                  style={[
                    styles.dayText,
                    cell.today && !cell.selected && styles.dayTextToday,
                    cell.selected && styles.dayTextSelected,
                    (cell.selected || cell.today) && styles.dayTextBold,
                  ]}
                >
                  {cell.label}
                </Text>
              </Pressable>
            ))}
            {week.length < 7
              ? Array.from({ length: 7 - week.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={styles.dayCell} />
                ))
              : null}
          </View>
        ))}
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function createWorldStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    dateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: BorderRadius.full,
    },
    dateChipText: withAppFont({
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    }),
    scrubHint: withAppFont({
      color: c.subtext,
      fontSize: 12,
      flexShrink: 1,
    }),
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
      zIndex: 6,
    },
    recenter: {
      position: 'absolute',
      right: 14,
      bottom: SCREEN_LIST_BOTTOM_PADDING - 36,
      zIndex: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    recenterText: withAppFont({
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    }),
    rowScroll: {
      position: 'absolute',
      top: 28,
      left: 0,
      right: 0,
      bottom: 0,
    },
    empty: {
      paddingHorizontal: Spacing.xl,
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
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    cityMeta: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: 10,
    },
    cityText: {
      flexShrink: 1,
      paddingRight: Spacing.md,
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
    favorites: {
      gap: 8,
      paddingBottom: Spacing.sm,
    },
    favoriteChip: {
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: BorderRadius.full,
      backgroundColor: c.card,
      marginRight: 8,
    },
    favoriteChipAdded: {
      backgroundColor: c.primary,
    },
    favoriteChipText: withAppFont({
      color: c.textPrimary,
      fontSize: 13,
    }),
    favoriteChipTextAdded: {
      color: '#fff',
      fontWeight: '600',
    },
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
    todayButton: {
      alignSelf: 'flex-start',
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: BorderRadius.full,
      marginBottom: Spacing.md,
    },
    todayButtonText: withAppFont({
      color: c.primary,
      fontSize: 14,
      fontWeight: '600',
    }),
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    monthNavBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    monthTitle: withAppFont({
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    }),
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 4,
    },
    weekdayText: withAppFont({
      color: c.subtext,
      fontSize: 11,
    }),
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.full,
    },
    dayCellSelected: {
      backgroundColor: c.primary,
    },
    dayText: withAppFont({
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '400',
    }),
    dayTextToday: {
      color: c.primary,
    },
    dayTextSelected: {
      color: '#fff',
    },
    dayTextBold: {
      fontWeight: '600',
    },
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
