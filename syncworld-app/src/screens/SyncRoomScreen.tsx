import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { AIAssistantModal } from '../components/AIAssistantModal';
import { TouchableOpacity } from 'react-native';
// import { roomsOrchestrator } from '../features/rooms/rooms.orchestrator';

type Props = {
  route: RouteProp<RootStackParamList, 'SyncRoom'>;
};

export const SyncRoomScreen: React.FC<Props> = ({ route }) => {
  const { roomId } = route.params;
  const [isAIModalVisible, setIsAIModalVisible] = React.useState(false);

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

      <TouchableOpacity style={styles.aiButton} onPress={() => setIsAIModalVisible(true)}>
        <Text style={styles.aiButtonText}>✨ Ask Gemini AI</Text>
      </TouchableOpacity>

      <AIAssistantModal
        visible={isAIModalVisible}
        onClose={() => setIsAIModalVisible(false)}
        members={[
          // Mock data for now until room state is fully wired
          { uid: 'u1', displayName: 'You', timezone: 'America/New_York' },
          { uid: 'u2', displayName: 'Team Lead', timezone: 'Europe/London' },
          { uid: 'u3', displayName: 'Dev', timezone: 'Asia/Tokyo' },
        ]}
        baseTimestamp={Date.now()}
      />
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
    marginBottom: 30,
  },
  aiButton: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
  },
  aiButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
