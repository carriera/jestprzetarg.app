import { useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session/session';

export default function LoginScreen() {
  const theme = useTheme();
  const { state, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const expired = state.status === 'signedOut' && state.expired;
  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const field = [styles.field, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.brand, { color: theme.brand }]}>Jest Przetarg</Text>
          <Text style={[styles.lead, { color: theme.textSecondary }]}>
            Przetargi dobrane do Twojej firmy i dokumentacja wyjaśniona prostym językiem.
          </Text>

          {expired && !error ? (
            <View style={[styles.notice, { backgroundColor: theme.warnSoft }]}>
              <Text style={{ color: theme.warn }}>Sesja wygasła. Zaloguj się ponownie.</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.text }]}>E-mail</Text>
          <TextInput
            style={field}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholderTextColor={theme.textSecondary}
            placeholder="jan@firma.pl"
          />

          <Text style={[styles.label, { color: theme.text }]}>Hasło</Text>
          <TextInput
            ref={passwordRef}
            style={field}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? (
            <View style={[styles.notice, { backgroundColor: theme.dangerSoft }]} accessibilityRole="alert">
              <Text style={{ color: theme.danger }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.brand, opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color={theme.onBrand} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.onBrand }]}>Zaloguj się</Text>
            )}
          </Pressable>

          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Konto zakłada administrator firmy, wysyłając zaproszenie.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.four, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { fontSize: 34, fontWeight: '700', marginBottom: Spacing.two },
  lead: { fontSize: 16, lineHeight: 22, marginBottom: Spacing.five },
  label: { fontSize: 15, fontWeight: '600', marginBottom: Spacing.one, marginTop: Spacing.three },
  field: { borderWidth: 1, borderRadius: Radius.field, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17 },
  notice: { borderRadius: Radius.field, padding: 12, marginTop: Spacing.three },
  button: { borderRadius: Radius.field, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.four },
  buttonText: { fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 13, textAlign: 'center', marginTop: Spacing.three },
});
