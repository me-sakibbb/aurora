import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationPermission } from './notifications';

export type { NotificationPermission } from './notifications';

/**
 * Asks Android for notification permission. Android 13+ only shows the prompt once a channel
 * exists, so the default channel is created first. Expo push token registration comes later,
 * once the backend has an endpoint for it.
 */
export async function requestNotificationPermission(
  channelName: string,
): Promise<NotificationPermission> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: channelName,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'denied';
    const result = await Notifications.requestPermissionsAsync();
    return result.granted ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
