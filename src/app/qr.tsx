import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { Button, Notice } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseLoginCode } from '@/lib/login-code';
import { useSession } from '@/session/session';

/**
 * Link `jestprzetarg://qr?kod=…` — otwiera się, gdy kod QR ze strony WWW zeskanuje zwykły aparat telefonu.
 * Gdy użytkownik jest już zalogowany, nawigator nie wpuści na ten ekran i kod zostaje niewykorzystany.
 */
export default function QrLinkScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signInWithCode } = useSession();
  const { kod } = useLocalSearchParams<{ kod?: string }>();
  const code = parseLoginCode(kod ?? '');
  const [failure, setFailure] = useState<string | null>(null);
  const error = code ? failure : 'Link nie zawiera poprawnego kodu logowania.';
  const started = useRef(false);

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;
    signInWithCode(code).catch((e: unknown) => setFailure(errorMessage(e)));
  }, [code, signInWithCode]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.brand, { color: theme.brand }]}>Jest Przetarg</Text>
        {error ? (
          <>
            <Notice tone="danger">{error}</Notice>
            <Button label="Zeskanuj nowy kod" onPress={() => router.replace('/skanuj')} />
            <Button label="Zaloguj hasłem" variant="outline" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.brand} />
            <Text style={[styles.text, { color: theme.textSecondary }]}>Loguję kodem QR…</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { fontSize: 34, fontWeight: '700' },
  text: { fontSize: 16, textAlign: 'center' },
});
