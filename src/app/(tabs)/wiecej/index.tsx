import { Link, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session/session';

export default function MoreTab() {
  const theme = useTheme();
  const { state, signOut } = useSession();
  const [busy, setBusy] = useState(false);
  if (state.status !== 'signedIn') return null;
  const { user, companyName } = state;

  function confirmSignOut() {
    Alert.alert('Wylogować?', 'Aby wrócić, trzeba będzie podać e-mail i hasło.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wyloguj',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void signOut();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Więcej' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.name, { color: theme.text }]}>{user.name || user.email}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>{user.email}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {[companyName, user.role === 'admin' ? 'administrator' : 'członek zespołu'].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Link href={'/wiecej/powiadomienia' as Href} asChild>
          <Pressable
            accessibilityRole="link"
            style={[styles.card, styles.link, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.name, { color: theme.text }]}>Powiadomienia</Text>
            <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={confirmSignOut}
          disabled={busy}
          accessibilityRole="button"
          style={[styles.button, { borderColor: theme.danger, opacity: busy ? 0.5 : 1 }]}>
          {busy ? <ActivityIndicator color={theme.danger} /> : <Text style={[styles.buttonText, { color: theme.danger }]}>Wyloguj</Text>}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, padding: Spacing.three, gap: 4 },
  name: { fontSize: 18, fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 24 },
  meta: { fontSize: 15 },
  button: { borderWidth: 1, borderRadius: Radius.field, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
