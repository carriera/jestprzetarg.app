import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { useInvitePreview } from '@/api/company';
import { Button, Field, Notice } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session/session';

const MIN_PASSWORD = 12;

export default function InvitationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { acceptInvite } = useSession();
  const { token } = useLocalSearchParams<{ token: string }>();
  const invite = useInvitePreview(token);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsEmail = invite.data !== undefined && !invite.data.email;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const canSubmit = password.length >= MIN_PASSWORD && (!needsEmail || email.includes('@')) && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await acceptInvite({
        token,
        password,
        name: name.trim() || undefined,
        email: needsEmail ? email.trim() : undefined,
      });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.brand, { color: theme.brand }]}>Jest Przetarg</Text>

          {invite.isPending ? <ActivityIndicator color={theme.brand} style={styles.pad} /> : null}

          {invite.isError ? (
            <>
              <Notice tone="danger">{errorMessage(invite.error)}</Notice>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Zaproszenie mogło wygasnąć albo zostało już wykorzystane. Poproś administratora firmy o nowe.
              </Text>
              <Button label="Przejdź do logowania" variant="outline" onPress={() => router.replace('/login')} />
            </>
          ) : null}

          {invite.data ? (
            <>
              <Text style={[styles.lead, { color: theme.text }]}>
                Zaproszono Cię do firmy <Text style={styles.bold}>{invite.data.companyName}</Text> jako{' '}
                {invite.data.role === 'admin' ? 'administratora' : 'członka zespołu'}.
              </Text>
              {invite.data.email ? (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>Konto zostanie założone dla {invite.data.email}.</Text>
              ) : null}

              <Field label="Imię i nazwisko" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
              {needsEmail ? (
                <Field
                  label="E-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                />
              ) : null}
              <Field
                label="Hasło"
                hint={`Co najmniej ${MIN_PASSWORD} znaków.`}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={submit}
              />
              {tooShort ? <Notice tone="warn">Hasło ma {password.length} z {MIN_PASSWORD} znaków.</Notice> : null}
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <Button label="Załóż konto" onPress={submit} busy={busy} disabled={!canSubmit} />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 14, padding: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center' },
  pad: { padding: Spacing.four },
  brand: { fontSize: 34, fontWeight: '700', marginBottom: Spacing.two },
  lead: { fontSize: 17, lineHeight: 24 },
  bold: { fontWeight: '700' },
  hint: { fontSize: 14, lineHeight: 20 },
});
