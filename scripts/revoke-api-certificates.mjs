// Usuwa certyfikaty podpisywania utworzone automatycznie przez xcodebuild (-allowProvisioningUpdates).
// Każda budowa na świeżym runnerze zakłada nowy certyfikat; Apple limituje ich liczbę, a przerwane budowy
// zostawiają je na koncie, aż kolejna kończy się błędem „maximum number of certificates”.
// Zmienne: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8_PATH; DRY_RUN=1 tylko wypisuje, co by usunięto.
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8_PATH, DRY_RUN } = process.env;
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_KEY_P8_PATH) {
  console.error('Brak ASC_KEY_ID, ASC_ISSUER_ID lub ASC_KEY_P8_PATH');
  process.exit(1);
}

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' })}.${b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`;
  const sig = createSign('SHA256').update(data).sign({ key: readFileSync(ASC_KEY_P8_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' });
  return `${data}.${sig.toString('base64url')}`;
}

const BASE = 'https://api.appstoreconnect.apple.com/v1';
const headers = { Authorization: `Bearer ${token()}` };

const res = await fetch(`${BASE}/certificates?limit=200`, { headers });
if (!res.ok) {
  console.error(`Lista certyfikatów: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const { data } = await res.json();

// Tylko certyfikaty „Created via API” — własnych certyfikatów z komputera nie ruszamy.
const created = data.filter((c) => /created via api/i.test(`${c.attributes.displayName ?? ''} ${c.attributes.name ?? ''}`));
console.log(`Certyfikatów na koncie: ${data.length}, do usunięcia (Created via API): ${created.length}`);

let failed = 0;
for (const c of created) {
  const label = `${c.id} ${c.attributes.certificateType} „${c.attributes.displayName}”`;
  if (DRY_RUN) {
    console.log(`[próba] usunąłbym ${label}`);
    continue;
  }
  const del = await fetch(`${BASE}/certificates/${c.id}`, { method: 'DELETE', headers });
  if (del.ok) console.log(`usunięto ${label}`);
  else {
    failed++;
    console.warn(`nie udało się usunąć ${label}: HTTP ${del.status}`);
  }
}
// Brak uprawnień do usuwania nie powinien przerywać budowy — jeśli limit jest przekroczony, błąd i tak wyjdzie przy podpisywaniu.
if (failed) console.warn(`::warning::Nie usunięto ${failed} certyfikatów.`);
