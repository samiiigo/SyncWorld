import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useIdentityStore, useRoomsStore } from '../store/store.root';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  
  const { bootstrapAnonymousSession, setDisplayName: storeSetDisplayName, isBootstrapping, isAuthenticated } = useIdentityStore();
  const { createRoom, joinRoom, activeRoomId, isCreating, isJoining, error: roomError } = useRoomsStore();

  useEffect(() => {
    if (!isAuthenticated && !isBootstrapping) {
      bootstrapAnonymousSession();
    }
  }, [isAuthenticated, isBootstrapping, bootstrapAnonymousSession]);

  useEffect(() => {
    if (activeRoomId) {
      navigation.replace('SyncRoom', { roomId: activeRoomId });
    }
  }, [activeRoomId, navigation]);

  useEffect(() => {
    if (roomError) {
      Alert.alert('Error', roomError);
    }
  }, [roomError]);

  const handleCreateRoom = async () => {
    if (!displayName.trim()) return;
    storeSetDisplayName(displayName.trim());
    await createRoom('New Room', 10);
  };

  const handleJoinRoom = async () => {
    if (roomCode.trim().length === 6 && displayName.trim()) {
      storeSetDisplayName(displayName.trim());
      await joinRoom(roomCode.trim().toUpperCase());
    }
  };

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 16 }}>Connecting to SyncWorld...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>SyncWorld</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.actionContainer}>
          <Button 
            title={isCreating ? "Creating..." : "Create Room"} 
            onPress={handleCreateRoom} 
            disabled={!displayName || isCreating || isJoining} 
          />
        </View>

        <Text style={styles.orText}>- OR -</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Join Existing Room</Text>
          <TextInput
            style={styles.input}
            value={roomCode}
            onChangeText={setRoomCode}
            placeholder="6-character code"
            placeholderTextColor="#888"
            autoCapitalize="characters"
            maxLength={6}
          />
          <View style={styles.actionContainer}>
            <Button 
              title={isJoining ? "Joining..." : "Join Room"} 
              onPress={handleJoinRoom} 
              disabled={!displayName || roomCode.length < 6 || isCreating || isJoining} 
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 48,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionContainer: {
    marginTop: 16,
  },
  orText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 24,
    fontSize: 14,
  },
});
