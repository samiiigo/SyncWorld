import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { RoomsDetailScreen, RoomsList, RoomSheets } from '@/features/rooms';
import { useAppContext } from '@/context/AppContext';
import { useDeviceClass } from '@/layouts/layout/useDeviceClass';
import { useTopChromeLayout } from '@/layouts/layout/useTopChromeLayout';
import { RoutePaths } from '@/routes';
import { useThemedColors } from '@/shared/theme';

/** Split view on tablets/desktop: rooms list stays visible beside the open room. */
const LIST_PANE_WIDTH = 340;

export default function RoomDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rooms, setActiveRoomId, exitToList, hydrated, onTapCreate, onTapJoin, leaveRoom } = useAppContext();
  const { widthClass } = useDeviceClass();
  const { scrollPaddingTop } = useTopChromeLayout();
  const colors = useThemedColors();

  const room = rooms.find((r) => r.id === id);

  useEffect(() => {
    if (!id || !room) return;
    setActiveRoomId(id);
    return exitToList;
  }, [id, room, setActiveRoomId, exitToList]);

  if (!hydrated) return null;
  if (!id || !room) {
    return <Redirect href={RoutePaths.rooms} />;
  }

  if (widthClass !== 'expanded') {
    return <RoomsDetailScreen onBack={() => router.back()} />;
  }

  return (
    <View style={styles.split}>
      <View style={[styles.listPane, { borderRightColor: colors.border, backgroundColor: colors.background }]}>
        <RoomsList
          rooms={rooms}
          scrollPaddingTop={scrollPaddingTop}
          selectedId={id}
          onOpen={(roomId) => router.setParams({ id: roomId })}
          onLeave={leaveRoom}
          onCreate={onTapCreate}
          onJoin={onTapJoin}
        />
      </View>
      <View style={styles.detailPane}>
        <RoomsDetailScreen onBack={() => router.back()} embedded />
      </View>
      <RoomSheets />
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  listPane: { width: LIST_PANE_WIDTH, borderRightWidth: StyleSheet.hairlineWidth },
  detailPane: { flex: 1 },
});
