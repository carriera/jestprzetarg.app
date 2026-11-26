import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { Button, Card, Field, Notice } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseLoginCode } from '@/lib/login-code';
import { useSession } from '@/session/session';

const STEPS = [
  'Na komputerze zaloguj się na jestprzetarg.pl.',
  'Otwórz zakładkę „Aplikacja mobilna” i kliknij „Pokaż kod QR”.',
  'Otwórz Aparat w telefonie i skieruj go na kod. Dotknij żółtego linku, który się pojawi — otworzy tę aplikację i zaloguje.',
];

/**
 * Logowanie jednorazowym kodem QR ze strony WWW (hasła nie wpisujemy w telefonie). Kod można też wpisać ręcznie —
 * tak loguje się konto demonstracyjne, np. recenzent sklepu, który nie ma drugiego ekranu z kodem QR.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { state, signInWithCode } = useSession();
  const expired = state.status === 'signedOut' && state.expired;
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCode() {
    const parsed = parseLoginCode(code);
    if (!parsed) {
      setError('To nie jest kod logowania Jest Przetarg. Sprawdź, czy wpisano go w całości.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithCode(parsed);
      // Po zalogowaniu nawigator sam przełącza się na zakładki.
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={[styles.brand, { color: theme.brand }]}>Jest Przetarg</Text>
        <Text style={[styles.lead, { color: theme.textSecondary }]}>
          Przetargi dobrane do Twojej firmy i dokumentacja wyjaśniona prostym językiem.
        </Text>

        {expired ? <Notice tone="warn">Sesja wygasła. Zaloguj się ponownie.</Notice> : null}

        <Card style={styles.steps}>
          <Text style={[styles.heading, { color: theme.text }]}>Jak się zalogować</Text>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <Text style={[styles.number, { color: theme.brand }]}>{i + 1}.</Text>
              <Text style={[styles.stepText, { color: theme.text }]}>{step}</Text>
            </View>
          ))}
        </Card>

        <Button label="Skaner w aplikacji" variant="outline" onPress={() => router.push('/skanuj')} />
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Skaner w aplikacji wymaga zgody na aparat. Jeśli telefon o nią nie zapyta, użyj Aparatu jak w kroku 3.
        </Text>

        {manual ? (
          <Card style={styles.steps}>
            <Field
              label="Kod logowania"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="go"
              onSubmitEditing={submitCode}
            />
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <Button label="Zaloguj kodem" onPress={submitCode} busy={busy} />
          </Card>
        ) : (
          <Pressable onPress={() => setManual(true)} accessibilityRole="button" hitSlop={8} style={styles.manual}>
            <Text style={[styles.manualText, { color: theme.brand }]}>Mam kod do wpisania</Text>
          </Pressable>
        )}

        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Konto zakłada administrator firmy, wysyłając zaproszenie.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: Spacing.three, padding: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { fontSize: 34, fontWeight: '700' },
  lead: { fontSize: 16, lineHeight: 22, marginBottom: Spacing.two },
  steps: { gap: 10 },
  heading: { fontSize: 17, fontWeight: '700' },
  step: { flexDirection: 'row', gap: 8 },
  number: { fontSize: 16, fontWeight: '700', width: 20 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 22 },
  hint: { fontSize: 13, textAlign: 'center' },
  manual: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  manualText: { fontSize: 15, fontWeight: '600' },
});
