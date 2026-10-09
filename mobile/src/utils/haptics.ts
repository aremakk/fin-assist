import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

function vibrateFallback() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(20);
    } else {
      // iOS: short system vibration (works when Taptic API fails)
      Vibration.vibrate();
    }
  } catch {
    // ignore
  }
}

/** Short tick for pull-to-refresh / voice / update actions. */
export async function lightHaptic() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    return;
  } catch {
    // fall through
  }
  try {
    await Haptics.selectionAsync();
    return;
  } catch {
    // fall through
  }
  vibrateFallback();
}

export async function successHaptic() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  } catch {
    // fall through
  }
  await lightHaptic();
}
