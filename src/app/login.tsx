import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Notice } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session/session';

const STEPS = [
  'Na komputerze zaloguj się na jestprzetarg.pl.',
  'Otwórz zakładkę „Aplikacja mobilna” i kliknij „Pokaż kod QR”.',
  'Dotknij przycisku poniżej i skieruj aparat na kod.',
];

/** Jedyny sposób zalogowania w aplikacji: jednorazowy kod QR pokazany na stronie WWW (hasła nie wpisujemy w telefonie). */
export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { state } = useSession();
  const expired = state.status === 'signedOut' && state.expired;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
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

        <Button label="Zeskanuj kod QR" onPress={() => router.push('/skanuj')} />

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
});
