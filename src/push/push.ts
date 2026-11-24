import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { api, unwrap } from '@/api/client';

import { messagingApi } from './messaging';

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

// Statusy iOS zwracane przez Firebase: -1 nie zapytano, 0 odmowa, 1 zgoda, 2 tymczasowa, 3 krótkotrwała.
function fromStatus(status: number): PushPermission {
  if (status === -1) return 'undetermined';
  return status === 0 ? 'denied' : 'granted';
}

let currentToken: string | null = null;

/** Token FCM tego urządzenia (po zarejestrowaniu) — potrzebny przy wylogowaniu. */
export function getRegisteredPushToken(): string | null {
  return currentToken;
}

export async function getPushPermission(): Promise<PushPermission> {
  const fb = messagingApi();
  if (!fb) return 'unavailable';
  try {
    return fromStatus(await fb.m.hasPermission(fb.messaging));
  } catch {
    return 'unavailable';
  }
}

/** Pokazuje systemowe pytanie o zgodę, gdy użytkownik jeszcze nie decydował; w pozostałych przypadkach zwraca stan. */
export async function requestPushPermission(): Promise<PushPermission> {
  const fb = messagingApi();
  if (!fb) return 'unavailable';
  try {
    return fromStatus(await fb.m.requestPermission(fb.messaging));
  } catch {
    return 'unavailable';
  }
}

async function sendToken(token: string) {
  currentToken = token;
  await unwrap(
    api.PUT('/push/devices', {
      body: { token, platform: Platform.OS === 'android' ? 'android' : 'ios', deviceName: Device.deviceName ?? Device.modelName ?? undefined },
    }),
  );
}

/** Pobiera token FCM i rejestruje urządzenie na serwerze. Zwraca false, gdy powiadomienia są niedostępne lub niedozwolone. */
export async function registerDevice(): Promise<boolean> {
  const fb = messagingApi();
  if (!fb || (await getPushPermission()) !== 'granted') return false;
  try {
    await sendToken(await fb.m.getToken(fb.messaging));
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[push] rejestracja urządzenia nie powiodła się:', e);
    return false;
  }
}

/** Wyrejestrowuje to urządzenie (np. po wyłączeniu powiadomień w aplikacji). */
export async function unregisterDevice(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await api.DELETE('/push/devices', { body: { token } }).catch(() => {});
}

/** Nasłuchuje zmian tokenu FCM i zgłasza je serwerowi. Zwraca funkcję kończącą nasłuch. */
export function watchTokenRefresh(): () => void {
  const fb = messagingApi();
  if (!fb) return () => {};
  return fb.m.onTokenRefresh(fb.messaging, (token) => {
    sendToken(token).catch(() => {});
  });
}
