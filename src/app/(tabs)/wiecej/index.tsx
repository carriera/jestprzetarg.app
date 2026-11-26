import { Link, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session/session';

function MenuLink({ href, label }: { href: Href; label: string }) {
  const theme = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        // Link z asChild nie przyjmuje tablicy stylów u dziecka — trzeba ją spłaszczyć.
        style={StyleSheet.flatten([styles.card, styles.link, { backgroundColor: theme.card, borderColor: theme.border }])}>
        <Text style={[styles.name, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
      </Pressable>
    </Link>
  );
}

export default function MoreTab() {
  const theme = useTheme();
  const { state, signOut, deleteAccount } = useSession();
  const [busy, setBusy] = useState(false);
  if (state.status !== 'signedIn') return null;
  const { user, companyName } = state;

  function confirmSignOut() {
    Alert.alert('Wylogować?', 'Aby wrócić, trzeba będzie zeskanować nowy kod QR ze strony jestprzetarg.pl.', [
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

  function confirmDelete() {
    Alert.alert(
      'Usunąć konto?',
      `Konto ${user.email} zostanie trwale usunięte i nie będzie można się na nie zalogować — ani w aplikacji, ani na stronie. Dane firmy (profil, ulubione, analizy) zostaną dla pozostałych osób z zespołu.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń konto',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount();
            } catch (e) {
              setBusy(false);
              Alert.alert('Nie udało się usunąć konta', errorMessage(e));
            }
          },
        },
      ],
    );
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
        <View style={styles.links}>
          <MenuLink href={'/wiecej/powiadomienia' as Href} label="Powiadomienia" />
          <MenuLink href={'/wiecej/ukryte' as Href} label="Ukryte przetargi" />
          {user.role === 'admin' ? <MenuLink href={'/wiecej/zespol' as Href} label="Zespół i zaproszenia" /> : null}
        </View>
        <Pressable
          onPress={confirmSignOut}
          disabled={busy}
          accessibilityRole="button"
          style={[styles.button, { borderColor: theme.danger, opacity: busy ? 0.5 : 1 }]}>
          {busy ? <ActivityIndicator color={theme.danger} /> : <Text style={[styles.buttonText, { color: theme.danger }]}>Wyloguj</Text>}
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={busy} accessibilityRole="button" style={styles.deleteButton} hitSlop={8}>
          <Text style={[styles.deleteText, { color: theme.textSecondary }]}>Usuń konto</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, padding: Spacing.three, gap: 4 },
  name: { fontSize: 18, fontWeight: '600' },
  links: { gap: Spacing.two },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 24 },
  meta: { fontSize: 15 },
  button: { borderWidth: 1, borderRadius: Radius.field, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  deleteButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  deleteText: { fontSize: 15, textDecorationLine: 'underline' },
});
