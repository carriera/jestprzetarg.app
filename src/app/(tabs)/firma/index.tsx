import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, errorMessage, unwrap } from '@/api/client';
import type { Profile } from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Etap 1: podgląd profilu. Edycja (PUT /profile) dojdzie w etapie 5. */
export default function CompanyTab() {
  const theme = useTheme();
  const { data, error, isPending } = useQuery({
    queryKey: ['profile'],
    queryFn: () => unwrap(api.GET('/profile')) as Promise<Profile>,
  });

  const rows: [string, string][] = data
    ? [
        ['Nazwa', data.name],
        ['Opis', data.description],
        ['Kody CPV', data.cpvPrefixes.join(', ')],
        ['Słowa kluczowe', data.keywords.join(', ')],
        ['Słowa wykluczające', data.excludedKeywords.join(', ')],
        ['Województwa', data.provinces.length ? data.provinces.join(', ') : 'cała Polska'],
        ['Rodzaje zamówień', data.orderTypes.length ? data.orderTypes.join(', ') : 'wszystkie'],
        ['Doświadczenie', data.experience],
        ['Zasoby', data.resources],
      ]
    : [];

  return (
    <>
      <Stack.Screen options={{ title: 'Firma' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {isPending ? <ActivityIndicator color={theme.brand} style={styles.pad} /> : null}
        {error ? <Text style={[styles.pad, { color: theme.danger }]}>{errorMessage(error)}</Text> : null}
        {data ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {rows.map(([label, value], i) => (
              <View key={label} style={[styles.row, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
                <Text style={[styles.value, { color: value ? theme.text : theme.textSecondary }]}>{value || 'nie uzupełniono'}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={[styles.note, { color: theme.textSecondary }]}>
          Profil edytujesz na razie na jestprzetarg.pl. Edycja w aplikacji pojawi się w kolejnej wersji.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  pad: { padding: Spacing.four, textAlign: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, paddingHorizontal: Spacing.three },
  row: { paddingVertical: 12, gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 16, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
