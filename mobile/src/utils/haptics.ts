import { Platform, Vibration } from 'react-native';

/** Short tick for pull-to-refresh / update actions. */
export function lightHaptic() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(12);
    } else {
      // iOS ignores duration — still a short system buzz
      Vibration.vibrate();
    }
  } catch {
    // ignore on unsupported devices
  }
}
