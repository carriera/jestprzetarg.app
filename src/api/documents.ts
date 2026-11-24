import { Directory, File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

import { API_URL, ApiError, authHeaders } from './client';
import type { TenderDocument } from './types';

/** Nazwa pliku bezpieczna dla systemu plików; zachowuje rozszerzenie, bo od niego zależy podgląd. */
function safeName(doc: TenderDocument): string {
  const base = (doc.fileName || doc.name || `dokument-${doc.id}`).replace(/[^\p{L}\p{N}._ -]+/gu, '_').trim();
  return base.length > 0 ? base : `dokument-${doc.id}`;
}

/** Pobiera załącznik do pamięci podręcznej (raz — kolejne otwarcia korzystają z kopii). */
export async function downloadDocument(doc: TenderDocument): Promise<File> {
  const dir = new Directory(Paths.cache, 'dokumenty', String(doc.id));
  dir.create({ idempotent: true, intermediates: true });
  const file = new File(dir, safeName(doc));
  if (file.exists && file.size > 0) return file;
  if (file.exists) file.delete();
  try {
    const downloaded = await File.downloadFileAsync(`${API_URL}/documents/${doc.id}`, file, { headers: authHeaders() });
    if (downloaded.size === 0) throw new Error('pusty plik');
    return downloaded;
  } catch (cause) {
    if (file.exists) file.delete();
    if (__DEV__) console.warn('[documents] pobieranie nie powiodło się:', cause);
    throw new ApiError(0, 'download', 'Nie udało się pobrać pliku. Sprawdź połączenie i spróbuj ponownie.');
  }
}

/** Otwiera plik w podglądzie systemowym (Quick Look); gdy format nie jest obsługiwany, oferuje udostępnienie. */
export async function openDocument(doc: TenderDocument): Promise<void> {
  const file = await downloadDocument(doc);
  if (await File.canPreview(file)) {
    await File.preview(file, { title: doc.name || doc.fileName });
  } else {
    await Share.share({ url: file.uri });
  }
}

export async function shareDocument(doc: TenderDocument): Promise<void> {
  const file = await downloadDocument(doc);
  await Share.share({ url: file.uri });
}

/** Wyjaśnienia (odpowiedzi na pytania wykonawców) i zmiany SWZ — ta sama reguła nazw, której używa serwer. */
export const isClarification = (doc: TenderDocument) => /odpowied|wyjaśnien|pytani|zmian|modyfikac/i.test(`${doc.name} ${doc.fileName}`);
