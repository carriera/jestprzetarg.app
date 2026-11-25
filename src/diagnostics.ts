import { Alert } from 'react-native';

/**
 * Tylko dla wersji testowych (TestFlight): zamiast po cichu zamykać aplikację po niezłapanym błędzie JavaScript,
 * pokazuje jego treść. W wersji produkcyjnej ustawienie jest wyłączone i obowiązuje domyślne zachowanie.
 */
type ErrorUtilsLike = {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

if (process.env.EXPO_PUBLIC_SHOW_FATAL_ERRORS === '1' && errorUtils) {
  const previous = errorUtils.getGlobalHandler();
  let shown = false;
  errorUtils.setGlobalHandler((error, isFatal) => {
    const e = error as { message?: string; stack?: string } | undefined;
    const text = `${isFatal ? 'FATAL: ' : ''}${e?.message ?? String(error)}\n\n${(e?.stack ?? '').slice(0, 1500)}`;
    if (!shown) {
      shown = true;
      // Krótkie opóźnienie, żeby interfejs zdążył się utworzyć.
      setTimeout(() => Alert.alert('Błąd aplikacji (wersja testowa)', text), 500);
    }
    // Nie wołamy domyślnej obsługi dla błędów krytycznych — ona zamykałaby aplikację.
    if (!isFatal) previous(error, isFatal);
  });
}
