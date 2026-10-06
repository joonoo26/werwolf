import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from './api';

// Mitteilungen sind immer neutral (serverseitig erzeugt); lokal wird weder Ton noch Rolleninfo ergänzt.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function registerForPush(): Promise<void> {
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    const token = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(token.data, Platform.OS);
  } catch {
    /* Push ist optional: Spiel funktioniert ohne */
  }
}
