import { NativeModules, Platform } from 'react-native';

/**
 * Resolve API host for simulator / emulator / Expo Go on a physical device.
 * - iOS Simulator: localhost
 * - Android Emulator: 10.0.2.2
 * - Physical device: Mac LAN IP from Metro (or DEV_HOST fallback)
 */
const DEV_HOST = '172.20.10.2';

function resolveHost(): string {
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)(?::\d+)?/);
    const host = match?.[1];
    if (host) {
      // Simulator / desktop packager
      if (host === 'localhost' || host === '127.0.0.1') {
        return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      }
      return host;
    }
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  // Physical device fallback when ScriptURL is unavailable
  return DEV_HOST || 'localhost';
}

export const API_BASE_URL = 'https://fin-assist.onrender.com/api/v1';
