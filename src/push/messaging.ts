import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type MessagingModule = typeof import('@react-native-firebase/messaging');
type Api = { m: MessagingModule; messaging: ReturnType<MessagingModule['getMessaging']> };

let cached: Api | null | undefined;

/**
 * Firebase Messaging jest modułem natywnym, którego nie ma w Expo Go ani w buildzie bez pliku
 * GoogleService-Info.plist. Zamiast wywracać aplikację, w takich środowiskach zwracamy null,
 * a reszta aplikacji działa bez powiadomień.
 */
export function messagingApi(): Api | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return cached;
  try {
    // Ładowanie leniwe: w Expo Go moduł natywny nie istnieje, a statyczny import przewróciłby start aplikacji.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@react-native-firebase/messaging') as MessagingModule;
    cached = { m, messaging: m.getMessaging() };
  } catch (e) {
    if (__DEV__) console.warn('[push] Firebase Messaging niedostępny:', e);
  }
  return cached;
}
