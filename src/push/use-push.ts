import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { messagingApi } from './messaging';
import { registerDevice, requestPushPermission, watchTokenRefresh } from './push';

type Data = Record<string, string | object> | undefined;

/** Adres, który otwieramy po dotknięciu powiadomienia, na podstawie pól `type` i `tenderId` z serwera. */
export function targetFor(data: Data): Href | null {
  const type = typeof data?.type === 'string' ? data.type : '';
  const tenderId = typeof data?.tenderId === 'string' ? Number(data.tenderId) : NaN;
  const hasTender = Number.isInteger(tenderId) && tenderId > 0;
  switch (type) {
    case 'deadline':
    case 'documents':
      return hasTender ? (`/przetarg/${tenderId}` as Href) : null;
    case 'result':
      return hasTender ? (`/przetarg/${tenderId}?section=wynik` as Href) : null;
    case 'new_matches':
      return hasTender ? (`/przetarg/${tenderId}` as Href) : ('/' as Href);
    case 'test':
      return '/wiecej/powiadomienia' as Href;
    default:
      return null;
  }
}

/**
 * Włączana po zalogowaniu: prosi o zgodę (system pyta tylko raz), rejestruje urządzenie, pilnuje zmian tokenu
 * i otwiera właściwy ekran po dotknięciu powiadomienia — także tego, które uruchomiło aplikację.
 */
export function usePush(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    requestPushPermission().then((permission) => {
      if (!cancelled && permission === 'granted') void registerDevice();
    });
    const stopRefresh = watchTokenRefresh();
    return () => {
      cancelled = true;
      stopRefresh();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const fb = messagingApi();
    if (!fb) return;
    const open = (data: Data) => {
      const href = targetFor(data);
      if (href) router.push(href);
    };
    fb.m.getInitialNotification(fb.messaging).then((message) => {
      if (message) open(message.data);
    });
    return fb.m.onNotificationOpenedApp(fb.messaging, (message) => open(message.data));
  }, [enabled, router]);
}
