import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from 'react-native-notify-kit';

export const AVAILABILITY_CHANNEL_ID = 'availability';

export async function ensureNotificationSetup(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  await notifee.createChannel({
    id: AVAILABILITY_CHANNEL_ID,
    name: 'Availability Alerts',
    importance: AndroidImportance.HIGH,
  });
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function showAvailabilityNotification(
  searchText: string,
  url: string,
  found: boolean,
): Promise<void> {
  await notifee.displayNotification({
    body: `${searchText} was ${found ? 'found' : 'not found'} on ${url}`,
    android: { channelId: AVAILABILITY_CHANNEL_ID },
  });
}
