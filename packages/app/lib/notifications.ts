// Web: the browser's Notification permission. Native twin: notifications.native.ts.
// Push token registration (Web Push / VAPID) comes later, once the backend has an endpoint for it.

export type NotificationPermission = 'granted' | 'denied' | 'unsupported';

export async function requestNotificationPermission(
  _channelName: string,
): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') {
    return Notification.permission === 'granted' ? 'granted' : 'denied';
  }
  try {
    return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
