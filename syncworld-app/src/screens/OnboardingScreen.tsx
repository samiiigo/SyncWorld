import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = () => {
    // TODO: Connect to backend to create room, then navigate
    navigation.navigate('SyncRoom', { roomId: 'new-room-id' });
  };

  const handleJoinRoom = () => {
    if (roomCode.trim().length > 0) {
      // TODO: Validate code and get roomId from backend
      navigation.navigate('SyncRoom', { roomId: roomCode.trim() });
    }
  };

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
          <Button title="Create Room" onPress={handleCreateRoom} disabled={!displayName} />
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
            <Button title="Join Room" onPress={handleJoinRoom} disabled={!displayName || roomCode.length < 6} />
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
