import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { AssistantProvider } from './src/store/AssistantContext';
import { AssistConfirmSheet } from './src/components/Assistant';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AssistantProvider>
          <StatusBar style="light" />
          <RootNavigator />
          <AssistConfirmSheet />
        </AssistantProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
