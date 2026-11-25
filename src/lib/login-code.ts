/**
 * Wyciąga kod logowania z treści kodu QR ze strony WWW (`jestprzetarg://qr?kod=KOD`).
 * Przyjmuje też sam kod. Zwraca null, gdy to nie jest kod Jest Przetarg (np. zwykły link).
 */
export function parseLoginCode(data: string): string | null {
  const text = data.trim();
  const fromUrl = /^jestprzetarg:\/\/+qr\?(?:.*&)?kod=([A-Za-z0-9_-]+)/i.exec(text);
  const code = fromUrl ? fromUrl[1] : text;
  return /^[A-Za-z0-9_-]{20,64}$/.test(code) ? code : null;
}
