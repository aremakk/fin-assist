import { NativeModules, Platform } from 'react-native';

/**
 * Resolve API host for simulator / emulator / Expo Go on a physical device.
 * - iOS Simulator: localhost
 * - Android Emulator: 10.0.2.2
 * - Physical device: Mac LAN IP from Metro (or DEV_HOST fallback)
 */
/** Mac LAN IP for physical device (check: ipconfig getifaddr en0) */
const DEV_HOST = '172.20.10.2';

/** FinAssist local port — 8080 may be taken by another app */
const API_PORT = 8090;

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

// Local FinAssist API. Production: 'https://fin-assist-p2gq.onrender.com/api/v1'
export const API_BASE_URL = `http://${resolveHost()}:${API_PORT}/api/v1`;
