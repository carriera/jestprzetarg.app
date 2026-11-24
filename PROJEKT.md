# Jest Przetarg — projekt aplikacji iOS

Źródło: opis API w `/home/c/claude/www/przetargi/src/lib/openapi.ts` (OpenAPI 3.1, serwowany pod `https://jestprzetarg.pl/api/v1/openapi.json`) oraz `docs/opis-dla-projektanta.md` w tym samym repozytorium.

## 1. Cel aplikacji

Wersja WWW służy do pracy przy biurku: czytania dokumentacji i edycji profilu. Aplikacja mobilna ma inne zadanie: **szybko powiadomić i pozwolić podjąć decyzję w biegu**.

1. Dostaję powiadomienie o nowym dopasowanym przetargu lub zbliżającym się terminie.
2. W 30 sekund widzę termin, dopasowanie i rekomendację AI.
3. Decyduję: dodaję do ulubionych, ukrywam albo zlecam analizę.

Pełna funkcjonalność WWW (profil, zespół, podobne postępowania) jest dostępna, ale na drugim planie.

## 2. Technologia

**Rekomendacja: React Native + Expo (TypeScript).**

- API jest opisane jako „dla aplikacji mobilnych (iOS, Android)”, więc Android dostajemy prawie za darmo.
- Powiadomienia idą przez Firebase (FCM), a nie bezpośrednio przez APNs. Aplikacja i tak musi zawierać SDK Firebase.
- Typy i klienta API generujemy z `openapi.json` (`openapi-typescript`), w tym samym języku co backend.
- Większość pracy da się zrobić w WSL; Mac służy do buildów i symulatora.

| Obszar | Wybór |
|---|---|
| Nawigacja | Expo Router (zakładki + stosy) |
| Dane z serwera | TanStack Query, z zapisem cache na dysku (podgląd offline) |
| Klient API | `openapi-typescript` + `openapi-fetch` |
| Token | `expo-secure-store` (pęk kluczy iOS) |
| Push | `@react-native-firebase/messaging` (wymaga development buildu, nie działa w Expo Go) |
| Pliki | `expo-file-system`, `expo-document-picker`, `expo-sharing` / Quick Look |
| Build i wydanie | GitHub Actions: `CI` (Linux) przy każdym pushu, `iOS TestFlight` (macOS) uruchamiany ręcznie |
| Podgląd na co dzień | Expo Go na iPhonie (`npx expo start --tunnel`); od etapu 3 development build z GitHuba |

Alternatywa: natywny SwiftUI. Ma sens tylko wtedy, gdy Android na pewno nie powstanie.

## 3. Nawigacja

Cztery zakładki na dole:

| Zakładka | Zawartość | Endpointy |
|---|---|---|
| **Przetargi** | Przełącznik: Dopasowane / Wszystkie / Archiwum, wyszukiwarka | `GET /tenders?view=dopasowane\|wszystkie\|archiwum` |
| **Ulubione** | Przełącznik: Otwarte / Zakończone | `view=ulubione\|ulubione-zakonczone` |
| **Firma** | Profil firmy | `GET/PUT /profile`, `GET /meta` |
| **Więcej** | Powiadomienia, Zespół, Ukryte, Konto, Wyloguj | `/push/*`, `/team/*`, `view=ukryte`, `/auth/*` |

Liczniki z `counts` w odpowiedzi listy pokazujemy na przełącznikach (np. „Dopasowane 12”).

## 4. Ekrany

### 4.1 Logowanie
- E-mail, hasło, przycisk „Zaloguj się”. Bez rejestracji.
- `POST /auth/login` → token zapisany w pęku kluczy.
- Błędy: 401 „Zły e-mail lub hasło”, 429 „Zbyt wiele prób, spróbuj za 15 minut”.
- Po zalogowaniu: prośba o zgodę na powiadomienia, potem `PUT /push/devices`.

### 4.2 Przyjęcie zaproszenia
- Otwierane linkiem `https://jestprzetarg.pl/zaproszenie/{token}` (Universal Link).
- `GET /invitations/{token}` pokazuje nazwę firmy i rolę.
- Formularz: imię, e-mail (gdy zaproszenie go nie ma), hasło min. 12 znaków.
- `POST /auth/accept-invite` zakłada konto i od razu loguje.

### 4.3 Lista przetargów
Karta przetargu (`TenderSummary`):

```
┌──────────────────────────────────────────────┐
│ (87)  Dostawa sprzętu komputerowego…   ● nowy│
│       Urząd Miasta Kielce · świętokrzyskie   │
│       Dostawy · CPV 30213000                 │
│       ✓ CPV 302  ✓ „komputer”                │
│                              za 3 dni · 27.11│
└──────────────────────────────────────────────┘
```

- Kółko z wynikiem dopasowania (`match.score`), powody (`match.reasons`) na zielono.
- Termin z `daysLeft`: „dziś”, „jutro”, „za N dni”; na czerwono przy 3 dniach lub mniej.
- Kropka „nowy” z `isNew`, gwiazdka z `isFavorite`.
- Przesunięcie karty w lewo: **Ukryj**; w prawo: **Ulubione**. Zmiana optymistyczna, z cofnięciem przy błędzie.
- Pociągnięcie w dół odświeża; przewijanie doładowuje kolejne strony (`page`, `pageSize=30`).
- Wyszukiwarka wysyła `q` z opóźnieniem ok. 400 ms.
- Stany: ładowanie (szkielety kart), pusta lista, brak wyników, brak sieci (dane z cache + baner).
- Gdy `profileReady=false`: żółty baner „Uzupełnij profil, aby zobaczyć dopasowania” z przejściem do zakładki Firma.
- Archiwum: karta pokazuje wynik zamiast terminu.

### 4.4 Szczegóły przetargu
Najważniejszy ekran. `GET /tenders/{id}`, a zaraz po otwarciu `PUT /tenders/{id}/seen`.

**Nagłówek (zawsze widoczny u góry):**
- tytuł, zamawiający, miasto, województwo;
- trzy kafle: **Termin** (`deadline`, `daysLeft`), **Dopasowanie** (`match.score`), **Rekomendacja** (`analysis.assessment.result.rekomendacja.decyzja` albo „brak analizy”);
- w pasku nawigacji: gwiazdka (ulubione), menu z „Ukryj”, „Otwórz w e-Zamówieniach” (`proceedingUrl`), „Udostępnij”.

**Sekcje pod nagłówkiem (przełącznik):**

1. **Analiza**
   - Brak analizy: opis, co powstanie, i przycisk „Przeanalizuj”. Opcje: z załączników e-Zamówień (domyślnie) albo wgranie własnego PDF (do 20 MB).
   - Jest analiza, kolejność bloków: Rekomendacja z uzasadnieniem → W skrócie → Kluczowe fakty → Terminy → Warunki udziału → Wymagane dokumenty → Ryzyka → Pytania do zamawiającego.
   - Warunki i dokumenty łączymy po indeksie z częścią ogólną i oceną firmy. Każdy ma ikonę i etykietę (nie tylko kolor): ✓ spełnia, ✕ nie spełnia, ? do sprawdzenia.
   - `assessment=null` przy istniejącej analizie ogólnej: pokazujemy część ogólną i przycisk „Oceń dla mojej firmy”.
   - `assessment.stale=true`: baner „Jest nowsza analiza, odśwież ocenę”.
   - Na dole: źródło (`sourceLabel`), data, zastrzeżenie o możliwych błędach AI, historia ocen.
2. **Ogłoszenie** — `noticeText`; pełna wersja HTML (`?html=1`) w widoku WebView na żądanie.
3. **Załączniki** — lista `documents`. Dotknięcie pobiera plik z nagłówkiem Bearer i otwiera podgląd systemowy z możliwością udostępnienia. `available=false` pokazujemy jako niedostępny.
4. **Wynik** (tylko gdy `result` istnieje) — liczba ofert, ceny najniższa / najwyższa / wybrana, wartość umowy, zwycięzca. Dopisek, że ogłoszenie nie podaje, czy kwoty są netto, czy brutto.
5. **Podobne** — ładowane dopiero po wejściu w sekcję (`GET /tenders/{id}/similar`, nawet do 2 minut). Statystyki u góry (mediana liczby ofert, rozrzut cen, najczęstsi zwycięzcy), pod nimi lista. Pole do zmiany frazy (`phrase`). Błąd 502 z przyciskiem „Spróbuj ponownie”.

### 4.5 Profil firmy
- Sekcje jak na WWW: Firma, Czego szukamy, Doświadczenie, Zasoby.
- Kody CPV, słowa kluczowe i wykluczające jako „pastylki” z polem dodawania.
- Województwa i rodzaje zamówień jako listy wielokrotnego wyboru ze słowników `GET /meta`. Pusty wybór oznacza „cała Polska” / „wszystkie”.
- `PUT /profile` wysyła tylko zmienione pola.

### 4.6 Powiadomienia (w „Więcej”)
Przełączniki z `PushPreferences`:
- nowe dopasowane przetargi + suwak minimalnego dopasowania (`minScore`);
- terminy ulubionych (3 dni i 1 dzień przed);
- nowe pliki w ulubionych;
- wynik ulubionego przetargu;
- godziny ciszy (`quietStart`, `quietEnd`);
- przycisk „Wyślij próbne powiadomienie” (`POST /push/test`).

Gdy `serverPushEnabled=false` albo brak zgody systemowej, pokazujemy wyjaśnienie zamiast przełączników.

### 4.7 Zespół (tylko administrator)
- Lista członków i oczekujących zaproszeń (`GET /team`).
- Zaproszenie: e-mail (opcjonalnie) i rola; link z odpowiedzi trafia do systemowego arkusza udostępniania. Token jest widoczny tylko raz.
- Zmiana roli, usunięcie członka, cofnięcie zaproszenia. Błąd 409 pokazujemy jego komunikatem z serwera.
- Zwykły członek (`role=member`) nie widzi tej pozycji.

## 5. Powiadomienia push

| `type` | Po dotknięciu |
|---|---|
| `new_matches` | Przetarg `tenderId`, a gdy go brak: lista Dopasowane |
| `deadline` | Szczegóły przetargu |
| `documents` | Szczegóły, sekcja Załączniki |
| `result` | Szczegóły, sekcja Wynik |
| `test` | Ekran ustawień powiadomień |

- Rejestracja tokenu po zalogowaniu i przy każdej jego zmianie (`PUT /push/devices`, `platform: "ios"`).
- Wylogowanie: `POST /auth/logout` z `pushToken`, żeby urządzenie przestało dostawać powiadomienia.

## 6. Zasady techniczne

- **Sesja:** token ważny 90 dni, bez odświeżania. Każde 401 czyści token i przenosi na logowanie z komunikatem „Sesja wygasła”.
- **Błędy:** kształt `{ error: { code, message } }`; `message` jest po polsku i nadaje się do pokazania użytkownikowi.
- **Dane wspólne dla firmy:** ulubione, ukryte i „obejrzane” zmieniają też inni członkowie zespołu, więc listy odświeżamy przy powrocie aplikacji na pierwszy plan.
- **Długa analiza:** `POST /tenders/{id}/analysis` odpowiada dopiero po 1–2 minutach (limit serwera 300 s). iOS może zawiesić aplikację w tle i zerwać połączenie. Dlatego: limit czasu żądania 300 s, ekran postępu z informacją „możesz wrócić później”, a po powrocie do aplikacji sprawdzenie `GET /tenders/{id}/analysis`.
- **Offline:** ostatnio pobrane listy i otwarte przetargi są czytelne bez sieci; akcje wymagają połączenia.
- **Wygląd:** kolory z wersji WWW (tło `#f6f5f1`, zieleń marki `#0f5c4a`, ostrzeżenie `#9a5b00`, błąd `#a3312b`), czcionka systemowa, obsługa trybu ciemnego i powiększonego tekstu (Dynamic Type).

## 7. Luki w API do uzgodnienia

1. **Usuwanie własnego konta.** Aplikacja pozwala założyć konto (z zaproszenia), więc App Store wymaga też możliwości jego usunięcia w aplikacji. Brakuje endpointu typu `DELETE /auth/me`.
2. **Analiza w tle.** Lepsze byłoby zlecenie analizy z natychmiastową odpowiedzią i powiadomieniem push `analysis_ready`. Obecny model zadziała, ale jest kruchy na telefonie.
3. **Universal Links.** Strona musi wystawić plik `/.well-known/apple-app-site-association`, żeby link `/zaproszenie/{token}` otwierał aplikację. Warto dodać też `/przetarg/{id}`.
4. **Zmiana i reset hasła.** Nie ma ich w API v1; w aplikacji odsyłamy do WWW albo dodajemy endpointy.
5. **„Pobierz nowe ogłoszenia”.** Przycisk z WWW nie ma odpowiednika w API v1. W aplikacji pomijamy go; dane odświeża cron.
6. **Konto dla recenzenta Apple.** Aplikacja zamknięta za logowaniem wymaga konta demonstracyjnego z przykładowymi danymi.

## 8. Etapy

| Etap | Zakres | Efekt |
|---|---|---|
| 1 | Szkielet, klient API z OpenAPI, logowanie, lista z widokami i wyszukiwarką | Da się przeglądać przetargi w symulatorze |
| 2 | Szczegóły: nagłówek, analiza (odczyt i zlecenie), ogłoszenie, ulubione / ukryte / obejrzane | Główna ścieżka decyzji działa |
| 3 | Push (Firebase, APNs), ustawienia powiadomień, otwieranie przetargu z powiadomienia | Aplikacja powiadamia |
| 4 | Załączniki, wgrywanie PDF, wynik, podobne postępowania | Pełne szczegóły |
| 5 | Profil firmy, zespół, zaproszenia, Universal Links | Zgodność z WWW |
| 6 | Ikona, ekran startowy, tryb ciemny, dostępność, TestFlight, zgłoszenie do App Store | Wydanie |

Etapy 3 i 6 wymagają płatnego konta Apple Developer (klucz APNs, TestFlight).
