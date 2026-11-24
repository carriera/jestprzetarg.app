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
