import fs from 'node:fs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_SERVICES_PLIST = './GoogleService-Info.plist';

/**
 * Powiadomienia push wymagają natywnego Firebase i pliku GoogleService-Info.plist (z konsoli Firebase).
 * Plik nie leży w repozytorium: build na GitHubie zapisuje go z sekretu przed `expo prebuild`.
 * Bez pliku konfiguracja zostaje bez Firebase, więc aplikacja nadal działa w Expo Go (bez powiadomień).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (!fs.existsSync(GOOGLE_SERVICES_PLIST)) return base;
  return {
    ...base,
    ios: {
      ...base.ios,
      googleServicesFile: GOOGLE_SERVICES_PLIST,
      entitlements: { ...base.ios?.entitlements, 'aps-environment': 'production' },
      infoPlist: {
        ...base.ios?.infoPlist,
        UIBackgroundModes: ['remote-notification'],
      },
    },
    plugins: [
      ...(base.plugins ?? []),
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      // Firebase 13+ wymaga dynamicznego linkowania frameworków.
      ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }],
    ],
  };
};
