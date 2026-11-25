import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { Button, Notice } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseLoginCode } from '@/lib/login-code';
import { useSession } from '@/session/session';

const HOW_TO = 'Na komputerze zaloguj się na jestprzetarg.pl, otwórz „Aplikacja mobilna” i kliknij „Pokaż kod QR”.';

/** Skaner kodu QR ze strony WWW — loguje bez wpisywania hasła. */
export default function ScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signInWithCode } = useSession();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [permissionInfo, setPermissionInfo] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Aparat zgłasza ten sam kod wiele razy na sekundę — blokada przed równoległymi próbami.
  const locked = useRef(false);

  async function onScanned({ data }: BarcodeScanningResult) {
    if (locked.current) return;
    locked.current = true;
    const code = parseLoginCode(data);
    if (!code) {
      setError('To nie jest kod logowania Jest Przetarg. ' + HOW_TO);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithCode(code);
      // Po zalogowaniu nawigator sam przełącza się na zakładki.
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  // Pytanie o zgodę z widocznym wynikiem: sama prośba mogła kończyć się cichym błędem, którego nie było widać.
  const askForCamera = useCallback(async () => {
    setAsking(true);
    setPermissionInfo(null);
    // Gdy system nie pokaże okna zgody, prośba wisi bez końca — po kilku sekundach podpowiadamy, co zrobić.
    const timer = setTimeout(() => {
      setAsking(false);
      setPermissionInfo(
        'System nie pokazał okna zgody. Włącz aparat w ustawieniach telefonu albo zeskanuj kod zwykłym aparatem iPhone’a — otworzy aplikację i zaloguje.',
      );
    }, 6000);
    try {
      const result = await requestPermission();
      if (!result.granted) {
        setPermissionInfo(
          result.canAskAgain
            ? 'Nie udzielono zgody. Spróbuj ponownie.'
            : 'Dostęp do aparatu jest zablokowany. Włącz go w ustawieniach telefonu.',
        );
      }
    } catch (e) {
      setPermissionInfo(`Nie udało się poprosić o dostęp do aparatu: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
      setAsking(false);
    }
  }, [requestPermission]);

  // Po powrocie z ustawień systemu odświeżamy stan zgody.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void getPermission();
    });
    return () => sub.remove();
  }, [getPermission]);

  function retry() {
    setError(null);
    locked.current = false;
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  let body;
  if (!permission) {
    body = <ActivityIndicator color={theme.brand} style={styles.pad} />;
  } else if (!permission.granted) {
    body = (
      <View style={styles.gap}>
        <Text style={[styles.text, { color: theme.text }]}>
          Aby zeskanować kod QR, aplikacja potrzebuje dostępu do aparatu.
        </Text>
        {permission.canAskAgain ? (
          <Button label="Zezwól na dostęp do aparatu" onPress={askForCamera} busy={asking} />
        ) : (
          <Button label="Otwórz ustawienia" onPress={() => Linking.openSettings()} />
        )}
        {permissionInfo ? (
          <>
            <Notice tone="warn">{permissionInfo}</Notice>
            <Button label="Otwórz ustawienia" variant="outline" onPress={() => Linking.openSettings()} />
          </>
        ) : null}
      </View>
    );
  } else {
    body = (
      <View style={styles.gap}>
        <View style={[styles.cameraBox, { borderColor: theme.border }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={busy || error ? undefined : onScanned}
          />
          {busy ? (
            <View style={styles.overlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.overlayText}>Loguję…</Text>
            </View>
          ) : null}
        </View>
        {error ? (
          <>
            <Notice tone="danger">{error}</Notice>
            <Button label="Skanuj ponownie" onPress={retry} />
          </>
        ) : (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>{HOW_TO}</Text>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          Zaloguj kodem QR
        </Text>
        <Pressable onPress={close} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.close, { color: theme.brand }]}>Anuluj</Text>
        </Pressable>
      </View>
      <View style={styles.content}>{body}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four, paddingBottom: Spacing.two },
  title: { fontSize: 22, fontWeight: '700' },
  close: { fontSize: 17, fontWeight: '600' },
  content: { flex: 1, padding: Spacing.four, paddingTop: Spacing.two, maxWidth: 480, width: '100%', alignSelf: 'center' },
  gap: { gap: Spacing.three },
  pad: { marginTop: Spacing.five },
  text: { fontSize: 16, lineHeight: 22 },
  hint: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  cameraBox: { width: '100%', aspectRatio: 1, borderRadius: Radius.card, overflow: 'hidden', borderWidth: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  overlayText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
