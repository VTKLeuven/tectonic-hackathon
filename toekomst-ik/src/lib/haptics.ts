import * as Haptics from 'expo-haptics';

async function safe(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // Haptics are a nicety; never let them break the demo.
  }
}

export const haptic = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
