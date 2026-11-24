import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuthToken, setUnauthorizedHandler, unwrap } from '@/api/client';
import type { User } from '@/api/types';
import { getRegisteredPushToken } from '@/push/push';

const TOKEN_KEY = 'jp.token';
const USER_KEY = 'jp.user';

type State =
  | { status: 'loading' }
  | { status: 'signedOut'; expired: boolean }
  | { status: 'signedIn'; user: User; companyName: string | null };

type Session = {
  state: State;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession wymaga SessionProvider');
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: 'loading' });

  const clear = useCallback(
    async (expired: boolean) => {
      setAuthToken(null);
      setState({ status: 'signedOut', expired });
      queryClient.clear();
      await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    },
    [queryClient],
  );

  // Start aplikacji: token z pęku kluczy loguje od razu (także offline), a /auth/me potwierdza go w tle.
  useEffect(() => {
    setUnauthorizedHandler(() => void clear(true));
    let cancelled = false;
    (async () => {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
        SecureStore.getItemAsync(USER_KEY).catch(() => null),
      ]);
      if (cancelled) return;
      if (!token || !userJson) {
        setState({ status: 'signedOut', expired: false });
        return;
      }
      setAuthToken(token);
      setState({ status: 'signedIn', user: JSON.parse(userJson) as User, companyName: null });
      try {
        const me = await unwrap(api.GET('/auth/me'));
        if (cancelled || !me.user) return;
        const user = me.user as User;
        setState((s) => (s.status === 'signedIn' ? { status: 'signedIn', user, companyName: me.company?.name ?? null } : s));
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      } catch {
        // Brak sieci: zostajemy zalogowani na danych z pamięci. 401 obsłużył już handler powyżej.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clear]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await unwrap(api.POST('/auth/login', { body: { email, password } }));
    if (!result.token || !result.user) throw new Error('Niepełna odpowiedź logowania');
    const user = result.user as User;
    setAuthToken(result.token);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, result.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    setState({ status: 'signedIn', user, companyName: null });
    api.GET('/auth/me').then(
      ({ data }) => {
        const name = data?.company?.name;
        if (name) setState((s) => (s.status === 'signedIn' ? { ...s, companyName: name } : s));
      },
      () => {},
    );
  }, []);

  const signOut = useCallback(async () => {
    // Unieważnienie tokenu na serwerze jest „w miarę możliwości” — lokalnie wylogowujemy zawsze.
    // Z pushToken serwer wyrejestruje też to urządzenie z powiadomień.
    const pushToken = getRegisteredPushToken() ?? undefined;
    await api.POST('/auth/logout', { body: { pushToken } }).catch(() => {});
    await clear(false);
  }, [clear]);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
