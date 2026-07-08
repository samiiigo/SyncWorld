import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SyncRoomScreen } from '../screens/SyncRoomScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  SyncRoom: { roomId: string };
  // VotingModal and AlarmArmed will be added later
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding">
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="SyncRoom" 
          component={SyncRoomScreen} 
          options={{ title: 'Sync Room' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
