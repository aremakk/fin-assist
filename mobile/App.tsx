import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider } from './src/store/AuthContext';
import { AssistantProvider } from './src/store/AssistantContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import { AssistConfirmSheet } from './src/components/Assistant';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppShell() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
      <AssistConfirmSheet />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider preload={false}>
        <ThemeProvider>
          <AuthProvider>
            <AssistantProvider>
              <AppShell />
            </AssistantProvider>
          </AuthProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
