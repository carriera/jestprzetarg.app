import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@/api/client';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePush } from '@/push/use-push';
import { SessionProvider, useSession } from '@/session/session';

SplashScreen.preventAutoHideAsync();

// Ulubione, ukryte i „obejrzane” zmieniają też inni członkowie zespołu, więc dane odświeżamy po powrocie do aplikacji.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (status) => setFocused(status === 'active'));
  return () => sub.remove();
});

function RootNavigator() {
  const { state } = useSession();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  usePush(state.status === 'signedIn');

  useEffect(() => {
    if (state.status !== 'loading') SplashScreen.hideAsync();
  }, [state.status]);

  if (state.status === 'loading') return null;
  const signedIn = state.status === 'signedIn';

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.brand,
          background: colors.background,
          card: colors.background,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="przetarg/[id]"
            options={{
              headerShown: true,
              title: '',
              headerBackTitle: 'Wróć',
              headerTintColor: colors.brand,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.background },
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
          <Stack.Screen name="zaproszenie/[token]" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            // Błędów 4xx nie ma sensu ponawiać; sieć i 5xx — dwa razy.
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}
