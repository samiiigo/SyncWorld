import React, { useEffect } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { RoomsDetailScreen } from '@/components/features/rooms/RoomsScreens';
import { useAppContext } from '@/context/AppContext';

export default function RoomDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rooms, setActiveRoomId, exitToList } = useAppContext();

  const room = rooms.find((r) => r.id === id);

  useEffect(() => {
    if (!id || !room) return;
    setActiveRoomId(id);
    return exitToList;
  }, [id, room, setActiveRoomId, exitToList]);

  if (!id || !room) {
    return <Redirect href="/(tabs)/rooms" />;
  }

  return <RoomsDetailScreen onBack={() => router.back()} />;
}
