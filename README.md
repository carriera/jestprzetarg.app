# Jest Przetarg — aplikacja mobilna

Aplikacja iOS (docelowo także Android) dla serwisu [jestprzetarg.pl](https://jestprzetarg.pl). React Native + Expo, TypeScript.
Projekt ekranów i etapy: [PROJEKT.md](PROJEKT.md).

## Praca lokalna

```bash
npm install
npx expo start --tunnel   # podgląd na iPhonie w aplikacji Expo Go (zeskanuj kod QR)
npm run typecheck
npx eslint .
npm run api:types         # odświeża typy z https://jestprzetarg.pl/api/v1/openapi.json
```

Adres API można zmienić zmienną `EXPO_PUBLIC_API_URL` (domyślnie `https://jestprzetarg.pl/api/v1`).

## Budowanie na GitHubie

- `CI` — przy każdym pushu: typy, lint, bundlowanie JS (Linux).
- `iOS TestFlight` — uruchamiany ręcznie: podpisany build na macOS i wysyłka do TestFlight.
  Wymagane sekrety są opisane na początku pliku `.github/workflows/ios-testflight.yml`.

## Struktura

- `src/app` — ekrany (Expo Router): `login`, zakładki `(tabs)`.
- `src/api` — klient API i typy wygenerowane z OpenAPI.
- `src/session` — logowanie i token w pęku kluczy.
- `src/components` — karta przetargu, lista, przełącznik widoków.
