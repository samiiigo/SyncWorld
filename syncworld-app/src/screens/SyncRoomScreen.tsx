import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
// import { roomsOrchestrator } from '../features/rooms/rooms.orchestrator';

type Props = {
  route: RouteProp<RootStackParamList, 'SyncRoom'>;
};

export const SyncRoomScreen: React.FC<Props> = ({ route }) => {
  const { roomId } = route.params;

  useEffect(() => {
    // TODO: Connect roomsOrchestrator
    console.log(`Joined room: ${roomId}`);
    
    return () => {
      // Cleanup
    };
  }, [roomId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room: {roomId}</Text>
      <Text style={styles.subtitle}>Scrubber and Timezone list will go here.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
});
