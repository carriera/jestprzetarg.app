import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './schema';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://jestprzetarg.pl/api/v1';

/** Błąd API w kształcie serwera `{ error: { code, message } }`; `message` jest po polsku i nadaje się do pokazania. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
let onUnauthorized: () => void = () => {};

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Wołane, gdy serwer odrzuci token (wygasł po 90 dniach albo został unieważniony). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const auth: Middleware = {
  onRequest({ request }) {
    if (authToken) request.headers.set('Authorization', `Bearer ${authToken}`);
    return request;
  },
  onResponse({ request, response }) {
    // 401 przy logowaniu to złe hasło, nie wygasła sesja — reagujemy tylko na żądania z tokenem.
    if (response.status === 401 && request.headers.has('Authorization')) onUnauthorized();
    return response;
  },
};

export const api = createClient<paths>({ baseUrl: API_URL });
api.use(auth);

type Result<T> = { data?: T; error?: unknown; response: Response };

/** Zamienia wynik openapi-fetch na dane albo wyjątek ApiError (także przy braku sieci). */
export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await call;
  } catch {
    throw new ApiError(0, 'network', 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
  }
  if (result.response.ok && result.data !== undefined) return result.data;
  const err = (result.error as { error?: { code?: string; message?: string } } | undefined)?.error;
  throw new ApiError(
    result.response.status,
    err?.code ?? 'unknown',
    err?.message ?? `Serwer odpowiedział błędem (${result.response.status}).`,
  );
}

export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Coś poszło nie tak. Spróbuj ponownie.';
}

/**
 * POST z długim limitem czasu. `fetch` w React Native zrywa na iOS połączenie po 60 s ciszy, a analiza AI
 * odpowiada dopiero po 1–2 minutach — XMLHttpRequest pozwala ustawić własny limit.
 */
export function postLong<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const network = () =>
      reject(new ApiError(0, 'network', 'Połączenie z serwerem zostało przerwane.'));
    xhr.open('POST', `${API_URL}${path}`);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.onerror = network;
    xhr.ontimeout = network;
    xhr.onabort = network;
    xhr.onload = () => {
      let json: unknown = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // odpowiedź bez JSON-a obsługujemy niżej jako błąd serwera
      }
      if (xhr.status >= 200 && xhr.status < 300 && json !== null) {
        resolve(json as T);
        return;
      }
      if (xhr.status === 401 && authToken) onUnauthorized();
      const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
      reject(new ApiError(xhr.status, err?.code ?? 'unknown', err?.message ?? `Serwer odpowiedział błędem (${xhr.status}).`));
    };
    xhr.send(JSON.stringify(body));
  });
}
