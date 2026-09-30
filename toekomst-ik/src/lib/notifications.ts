/**
 * Local notifications for new high-severity alerts. Best effort only:
 * Expo Go limits notifications, and nothing here may ever break the in-app path.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { NotificationPlan } from '../../engine';

let configured = false;

export async function setupNotifications(): Promise<boolean> {
  try {
    if (!configured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      configured = true;
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export async function scheduleAlertNotification(plan: NotificationPlan): Promise<'sent' | 'scheduled' | 'skipped'> {
  try {
    const ok = await setupNotifications();
    if (!ok) return 'skipped';
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('waakhond', { name: 'Waakhond', importance: Notifications.AndroidImportance.DEFAULT });
    }
    const content = { title: `Waakhond: ${plan.alert.title}`, body: plan.alert.message.slice(0, 180), data: { alertId: plan.alert.id } };
    if (plan.deliverAt) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.deliverAt },
      });
      return 'scheduled';
    }
    await Notifications.scheduleNotificationAsync({ content, trigger: null });
    return 'sent';
  } catch {
    return 'skipped';
  }
}
