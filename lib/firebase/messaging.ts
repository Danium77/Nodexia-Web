/**
 * Firebase Cloud Messaging stub
 * TODO: Implement Firebase integration when needed
 */

export function areNotificationsSupported(): boolean {
  return false;
}

export async function requestNotificationPermission(): Promise<string | null> {
  return null;
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  return () => {};
}

export async function saveTokenToDatabase(userId: string, token: string): Promise<void> {
  // No-op
}

export function showLocalNotification(title: string, options?: NotificationOptions): void {
  // No-op
}
