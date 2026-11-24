import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useChangeRole,
  useCreateInvitation,
  useRemoveMember,
  useRevokeInvitation,
  useTeam,
} from '@/api/company';
import type { Invitation, Member, Role } from '@/api/types';
import { Button, Card, Field, Notice, Segmented, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shortDate } from '@/lib/format';
import { useSession } from '@/session/session';

const ROLE: Record<Role, string> = { admin: 'administrator', member: 'członek zespołu' };

export default function TeamScreen() {
  const theme = useTheme();
  const { state } = useSession();
  const isAdmin = state.status === 'signedIn' && state.user.role === 'admin';
  const team = useTeam(isAdmin);
  const create = useCreateInvitation();
  const revoke = useRevokeInvitation();
  const changeRole = useChangeRole();
  const remove = useRemoveMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [created, setCreated] = useState<string | null>(null);

  const mutationError = [create, revoke, changeRole, remove].find((m) => m.isError)?.error;

  function invite() {
    setCreated(null);
    create.mutate(
      { email: email.trim() || undefined, role },
      {
        onSuccess: (result) => {
          setEmail('');
          setCreated(result.link);
          void Share.share({ message: `Zaproszenie do Jest Przetarg: ${result.link}` });
        },
      },
    );
  }

  function memberActions(m: Member) {
    const other: Role = m.role === 'admin' ? 'member' : 'admin';
    Alert.alert(m.name || m.email, ROLE[m.role], [
      {
        text: other === 'admin' ? 'Nadaj rolę administratora' : 'Zmień na członka zespołu',
        onPress: () => changeRole.mutate({ id: m.id, role: other }),
      },
      {
        text: 'Usuń z firmy',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Usunąć użytkownika?', `${m.name || m.email} straci dostęp do firmy.`, [
            { text: 'Anuluj', style: 'cancel' },
            { text: 'Usuń', style: 'destructive', onPress: () => remove.mutate(m.id) },
          ]),
      },
      { text: 'Anuluj', style: 'cancel' },
    ]);
  }

  function revokeInvitation(i: Invitation) {
    Alert.alert('Cofnąć zaproszenie?', i.email ?? 'Zaproszenie bez adresu e-mail', [
      { text: 'Zostaw', style: 'cancel' },
      { text: 'Cofnij', style: 'destructive', onPress: () => revoke.mutate(i.id) },
    ]);
  }

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{ title: 'Zespół', headerLargeTitle: false }} />
        <View style={styles.content}>
          <Notice tone="warn">Zespołem zarządza administrator firmy.</Notice>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Zespół', headerLargeTitle: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        {team.isPending ? <ActivityIndicator color={theme.brand} style={styles.pad} /> : null}
        {team.error ? <Notice tone="danger">{errorMessage(team.error)}</Notice> : null}
        {mutationError ? <Notice tone="danger">{errorMessage(mutationError)}</Notice> : null}

        {team.data ? (
          <>
            <SectionTitle>Użytkownicy</SectionTitle>
            <Card>
              {team.data.members.map((m, i) => (
                <Pressable
                  key={m.id}
                  disabled={m.isMe}
                  onPress={() => memberActions(m)}
                  accessibilityRole={m.isMe ? 'text' : 'button'}
                  accessibilityHint={m.isMe ? undefined : 'Zmień rolę lub usuń'}
                  style={[styles.row, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.name, { color: theme.text }]}>
                      {m.name || m.email}
                      {m.isMe ? '  (Ty)' : ''}
                    </Text>
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>
                      {m.name ? `${m.email} · ` : ''}
                      {ROLE[m.role]}
                    </Text>
                  </View>
                  {m.isMe ? null : <Text style={[styles.chevron, { color: theme.textSecondary }]}>⋯</Text>}
                </Pressable>
              ))}
            </Card>

            {team.data.invitations.length > 0 ? (
              <>
                <SectionTitle>Oczekujące zaproszenia</SectionTitle>
                <Card>
                  {team.data.invitations.map((inv, i) => (
                    <Pressable
                      key={inv.id}
                      onPress={() => revokeInvitation(inv)}
                      accessibilityRole="button"
                      accessibilityHint="Cofnij zaproszenie"
                      style={[styles.row, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <View style={styles.flex}>
                        <Text style={[styles.name, { color: theme.text }]}>{inv.email ?? 'Bez adresu e-mail'}</Text>
                        <Text style={[styles.meta, { color: theme.textSecondary }]}>
                          {ROLE[inv.role]} · ważne do {shortDate(inv.expiresAt)}
                        </Text>
                      </View>
                      <Text style={[styles.chevron, { color: theme.textSecondary }]}>⋯</Text>
                    </Pressable>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        ) : null}

        <SectionTitle>Zaproś osobę</SectionTitle>
        <Card style={styles.group}>
          <Field
            label="E-mail (opcjonalnie)"
            hint="Gdy go podasz, zaproszenie zadziała tylko dla tego adresu."
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Segmented
            options={[
              { key: 'member', label: 'Członek zespołu' },
              { key: 'admin', label: 'Administrator' },
            ]}
            value={role}
            onChange={setRole}
          />
          <Button label="Utwórz zaproszenie" onPress={invite} busy={create.isPending} />
          {created ? (
            <Notice tone="brand">
              Zaproszenie gotowe. Link jest jednorazowy i ważny 7 dni; widać go tylko teraz: {created}
            </Notice>
          ) : null}
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  pad: { padding: Spacing.four },
  flex: { flex: 1 },
  group: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingVertical: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 14, marginTop: 2 },
  chevron: { fontSize: 22 },
});
