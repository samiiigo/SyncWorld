import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useWorldStore } from '../features/world/world.store';
import {
  BANDS,
  BAR_INSET,
  BLUE_ON_DARK,
  CATALOG,
  FAVORITE_NAMES,
  formatClock,
  fmtOffset,
  HOUR_LABELS,
  INK_1,
  MONTHS,
  MUTED_ON_DARK,
  nowMinutes,
  PX_PER_MIN,
  RED_MARKER,
  ROW_H,
  TILE_1,
  buildCityRows,
  buildGridLines,
  dateRangeLabel,
  normMod,
  screenX,
} from '../features/world/timeline';

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
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '500' }}>{text}</Text>
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

function DashedMarkerLine({ height }: { height: number }) {
  // Design: 2px dashed blue line
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
          backgroundColor: BLUE_ON_DARK,
        }}
      />
    );
  }
  return <View style={{ width: 2, height, position: 'relative' }}>{lines}</View>;
}

type Sheet = 'add' | 'date' | 'detail' | null;

export default function WorldTimelineScreen() {
  const { cities, use24h, showCurrentMarker, addCity, removeCity, reorderCity } = useWorldStore();

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

  useEffect(() => {
    const id = setInterval(() => setCurrentMin(nowMinutes()), 20000);
    return () => clearInterval(id);
  }, []);

  const ptr = useRef<{
    cityId: string | null;
    mode: 'pending' | 'scrub' | 'reorder';
    startX: number;
    startY: number;
    startSelMin: number;
    startIndex: number;
  } | null>(null);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Design: pointerDown on row, move/up on container
  const onRowPointerDown = useCallback((cityId: string, e: GestureResponderEvent) => {
    const idx = citiesRef.current.findIndex((c) => c.id === cityId);
    ptr.current = {
      cityId,
      mode: 'pending',
      startX: e.nativeEvent.pageX,
      startY: e.nativeEvent.pageY,
      startSelMin: selectedMinRef.current,
      startIndex: idx,
    };
    clearLp();
    lpTimer.current = setTimeout(() => {
      if (ptr.current?.mode === 'pending' && ptr.current.cityId) {
        ptr.current.mode = 'reorder';
        setDragCityId(ptr.current.cityId);
        setDragOffsetY(0);
      }
    }, 480);
  }, []);

  const onContainerMove = useCallback(
    (e: GestureResponderEvent) => {
      const p = ptr.current;
      if (!p) return;
      const dx = e.nativeEvent.pageX - p.startX;
      const dy = e.nativeEvent.pageY - p.startY;
      if (p.mode === 'pending') {
        if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy)) {
          clearLp();
          p.mode = 'scrub';
          setScrubbing(true);
        } else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          // vertical scroll — abandon gesture ownership
          clearLp();
          ptr.current = null;
          return;
        }
      }
      if (p.mode === 'scrub') {
        setSelectedMin(p.startSelMin - dx / PX_PER_MIN);
      } else if (p.mode === 'reorder' && p.cityId) {
        const list = citiesRef.current;
        const idx = list.findIndex((c) => c.id === p.cityId);
        const shift = Math.round(dy / ROW_H);
        const newIdx = Math.max(0, Math.min(list.length - 1, p.startIndex + shift));
        if (newIdx !== idx) {
          reorderCity(idx, newIdx);
          setDragOffsetY(dy - shift * ROW_H);
        } else {
          setDragOffsetY(dy);
        }
      }
    },
    [reorderCity]
  );

  const onContainerUp = useCallback(() => {
    const p = ptr.current;
    clearLp();
    if (p?.mode === 'pending' && p.cityId) openDetail(p.cityId);
    ptr.current = null;
    setDragCityId(null);
    setDragOffsetY(0);
    setScrubbing(false);
  }, [openDetail]);

  const rows = useMemo(
    () => buildCityRows(cities, selectedMin, currentMin, use24h, viewportW),
    [cities, selectedMin, currentMin, use24h, viewportW]
  );
  const gridLines = useMemo(() => buildGridLines(selectedMin, viewportW), [selectedMin, viewportW]);
  const curX = screenX(selectedMin, currentMin, viewportW);
  const currentMarkerVisible = showCurrentMarker && curX >= -20 && curX <= viewportW + 20;
  const showRecenter = Math.abs(selectedMin - currentMin) >= 1;
  const nowLocal = new Date(currentMin * 60000);
  const currentMarkerText = formatClock(nowLocal.getHours() * 60 + nowLocal.getMinutes(), use24h);

  const catalogResults = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return CATALOG.filter((e) => !q || e.name.toLowerCase().includes(q)).map((e) => ({
      ...e,
      timeNow: formatClock(normMod(selectedMin + e.offset, 1440), use24h),
      sub: `${e.abbr} UTC${fmtOffset(e.offset)}`,
    }));
  }, [citySearch, selectedMin, use24h]);

  const detailCity = cities.find((c) => c.id === detailCityId);

  const openDatePicker = () => {
    const d = new Date(selectedMin * 60000);
    setPickerYear(d.getUTCFullYear());
    setPickerMonthIdx(d.getUTCMonth());
    setSheet('date');
  };

  const pickDate = (y: number, m: number, day: number) => {
    const dayIndex = Math.floor(Date.UTC(y, m, day) / 86400000);
    setSelectedMin(dayIndex * 1440 + 720);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header — design: 44px, title 20/600/-0.3 */}
        <View
          style={{
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            backgroundColor: '#000',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', letterSpacing: -0.3 }}>World</Text>
          <Pressable
            onPress={() => {
              setCitySearch('');
              setSheet('add');
            }}
            hitSlop={8}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: BLUE_ON_DARK,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>

        <Pressable onPress={openDatePicker} style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
          <Text style={{ color: MUTED_ON_DARK, fontSize: 13, letterSpacing: -0.1 }}>
            {dateRangeLabel(selectedMin)}
          </Text>
        </Pressable>

        {/* Timeline container — design: touch-action none, move/up here */}
        <View
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onLayout={(e: LayoutChangeEvent) => {
            setViewportW(e.nativeEvent.layout.width);
            setTimelineH(e.nativeEvent.layout.height);
          }}
          onStartShouldSetResponder={() => !!ptr.current}
          onMoveShouldSetResponder={() => !!ptr.current}
          onResponderMove={onContainerMove}
          onResponderRelease={onContainerUp}
          onResponderTerminate={onContainerUp}
        >
          {gridLines.map((x, i) => (
            <View
              key={`g-${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: x,
                width: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
          ))}

          {currentMarkerVisible ? (
            <>
              <View pointerEvents="none" style={{ position: 'absolute', top: 20, bottom: 0, left: curX - 1, zIndex: 5 }}>
                <DashedMarkerLine height={Math.max(0, timelineH - 20)} />
              </View>
              <View pointerEvents="none" style={{ position: 'absolute', top: 2, left: curX - 6, zIndex: 7 }}>
                <Text style={{ color: BLUE_ON_DARK, fontSize: 11, fontWeight: '600' }}>
                  <Text style={{ fontSize: 9 }}>▽</Text> Currently {currentMarkerText}
                </Text>
              </View>
            </>
          ) : null}

          {/* Red center marker */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              marginLeft: -1,
              width: 2,
              backgroundColor: RED_MARKER,
              zIndex: 6,
            }}
          />

          {showRecenter ? (
            <Pressable
              onPress={() => setSelectedMin(currentMin)}
              style={{
                position: 'absolute',
                right: 14,
                bottom: 14,
                zIndex: 8,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: BLUE_ON_DARK,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.4,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              <Ionicons name="locate-outline" size={18} color="#fff" />
            </Pressable>
          ) : null}

          <ScrollView
            style={{ position: 'absolute', top: 34, left: 0, right: 0, bottom: 0 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!scrubbing && !dragCityId}
          >
            {rows.map((row) => {
              const isDragging = dragCityId === row.id;
              return (
                <View
                  key={row.id}
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={(e) => onRowPointerDown(row.id, e)}
                  style={{
                    paddingTop: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.07)',
                    zIndex: isDragging ? 10 : 1,
                    transform: isDragging ? [{ translateY: dragOffsetY }, { scale: 1.02 }] : undefined,
                    backgroundColor: isDragging ? TILE_1 : undefined,
                    borderRadius: isDragging ? 12 : 0,
                    shadowColor: isDragging ? '#000' : undefined,
                    shadowOpacity: isDragging ? 0.5 : 0,
                    shadowRadius: isDragging ? 24 : 0,
                    shadowOffset: isDragging ? { width: 0, height: 8 } : undefined,
                    elevation: isDragging ? 8 : 0,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      paddingHorizontal: 20,
                      paddingBottom: 10,
                    }}
                  >
                    <View style={{ flexShrink: 1, paddingRight: 12 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          letterSpacing: 0.5,
                          color: row.relIsAccent ? RED_MARKER : MUTED_ON_DARK,
                        }}
                      >
                        {row.relLabel}
                      </Text>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 18,
                          fontWeight: '600',
                          letterSpacing: -0.2,
                          marginTop: 2,
                        }}
                      >
                        {row.name}
                      </Text>
                      <Text style={{ color: MUTED_ON_DARK, fontSize: 12, marginTop: 2 }}>{row.sub}</Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.3 }}>
                      {row.timeLabel}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 36,
                      marginHorizontal: BAR_INSET,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {row.dayPills.map((pill) => (
                      <DayPillBar key={pill.key} left={pill.left} width={pill.width} label={pill.label} />
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Add city sheet */}
      <Modal visible={sheet === 'add'} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setSheet(null)}
          />
          <View
            style={{
              height: '78%',
              backgroundColor: INK_1,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Add city</Text>
              <Pressable onPress={() => setSheet(null)}>
                <Text style={{ color: BLUE_ON_DARK, fontSize: 15 }}>Done</Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: TILE_1,
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: MUTED_ON_DARK, fontSize: 14 }}>⌕</Text>
                <TextInput
                  value={citySearch}
                  onChangeText={setCitySearch}
                  placeholder="Search city or timezone"
                  placeholderTextColor={MUTED_ON_DARK}
                  style={{ flex: 1, color: '#fff', fontSize: 15, padding: 0 }}
                  autoFocus
                />
              </View>
            </View>
            {!citySearch.trim() ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 14 }}
              >
                {FAVORITE_NAMES.map((name) => {
                  const entry = CATALOG.find((c) => c.name === name);
                  if (!entry) return null;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => {
                        addCity(entry);
                        setSheet(null);
                      }}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 9,
                        borderRadius: 999,
                        backgroundColor: TILE_1,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13 }}>{name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {catalogResults.map((entry) => (
                <Pressable
                  key={entry.name}
                  onPress={() => {
                    addCity(entry);
                    setSheet(null);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <View>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{entry.name}</Text>
                    <Text style={{ color: MUTED_ON_DARK, fontSize: 12, marginTop: 1 }}>{entry.sub}</Text>
                  </View>
                  <Text style={{ color: MUTED_ON_DARK, fontSize: 15 }}>{entry.timeNow}</Text>
                </Pressable>
              ))}
              {catalogResults.length === 0 ? (
                <Text style={{ color: MUTED_ON_DARK, fontSize: 14, textAlign: 'center', paddingVertical: 30 }}>
                  No matches
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date picker */}
      <Modal visible={sheet === 'date'} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setSheet(null)}
          />
          <View
            style={{
              backgroundColor: INK_1,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 28,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Select a date</Text>
              <Pressable onPress={() => setSheet(null)}>
                <Text style={{ color: BLUE_ON_DARK, fontSize: 15 }}>Close</Text>
              </Pressable>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginVertical: 14,
              }}
            >
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
                style={{ paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <Text style={{ color: BLUE_ON_DARK, fontSize: 18 }}>‹</Text>
              </Pressable>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
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
                style={{ paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <Text style={{ color: BLUE_ON_DARK, fontSize: 18 }}>›</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
                <View key={`${wd}-${i}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                  <Text style={{ color: MUTED_ON_DARK, fontSize: 11 }}>{wd}</Text>
                </View>
              ))}
            </View>
            {chunk(pickerCells, 7).map((week, wi) => (
              <View key={`w-${wi}`} style={{ flexDirection: 'row' }}>
                {week.map((cell) => (
                  <Pressable
                    key={cell.key}
                    onPress={() => cell.day != null && pickDate(pickerYear, pickerMonthIdx, cell.day)}
                    style={{
                      flex: 1,
                      height: 34,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      backgroundColor: cell.selected ? BLUE_ON_DARK : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: cell.selected ? '#fff' : cell.today ? BLUE_ON_DARK : '#fff',
                        fontSize: 14,
                        fontWeight: cell.selected || cell.today ? '600' : '400',
                      }}
                    >
                      {cell.label}
                    </Text>
                  </Pressable>
                ))}
                {week.length < 7
                  ? Array.from({ length: 7 - week.length }).map((_, i) => (
                      <View key={`pad-${i}`} style={{ flex: 1, height: 34 }} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* City detail */}
      <Modal visible={sheet === 'detail'} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setSheet(null)}
          />
          <View
            style={{
              backgroundColor: INK_1,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
              paddingTop: 22,
              paddingBottom: 30,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: 3,
                alignSelf: 'center',
                marginBottom: 18,
              }}
            />
            {detailCity ? (
              <>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>{detailCity.name}</Text>
                <Text style={{ color: MUTED_ON_DARK, fontSize: 14, marginTop: 4 }}>
                  {detailCity.abbr} UTC{fmtOffset(detailCity.offset)}
                </Text>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 44,
                    fontWeight: '600',
                    marginVertical: 18,
                    letterSpacing: -0.5,
                  }}
                >
                  {formatClock(normMod(selectedMin + detailCity.offset, 1440), use24h)}
                </Text>
                <Pressable
                  onPress={() => {
                    if (detailCityId) removeCity(detailCityId);
                    setDetailCityId(null);
                    setSheet(null);
                  }}
                  style={{
                    backgroundColor: 'rgba(255,59,48,0.15)',
                    borderRadius: 999,
                    paddingVertical: 13,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: RED_MARKER, fontSize: 16, fontWeight: '500' }}>Remove city</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
