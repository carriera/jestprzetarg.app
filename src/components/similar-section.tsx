import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useSimilar } from '@/api/tenders';
import type { SimilarResult } from '@/api/types';
import { Button, Card, Field, Notice, SectionTitle } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { money, shortDate } from '@/lib/format';

const PAGE = 15;

const OUTCOME: Record<SimilarResult['outcome'], string> = {
  umowa: 'Zawarto umowę',
  uniewaznienie: 'Unieważniono',
  inne: 'Inny wynik',
};

export function SimilarSection({ tenderId }: { tenderId: number }) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [phrase, setPhrase] = useState<string | undefined>(undefined);
  const [shown, setShown] = useState(PAGE);
  const q = useSimilar(tenderId, phrase, true);
  const data = q.data;

  const search = () => {
    const next = input.trim();
    setPhrase(next || undefined);
    setShown(PAGE);
  };

  return (
    <View style={styles.stack}>
      <Text style={[styles.small, { color: theme.textSecondary }]}>
        Zakończone postępowania o podobnym przedmiocie: ilu wykonawców składało oferty, jakie były ceny i kto wygrywał.
      </Text>

      {q.isFetching ? (
        <Card style={styles.loading}>
          <ActivityIndicator color={theme.brand} />
          <Text style={[styles.small, styles.center, { color: theme.textSecondary }]}>
            Szukam w ogłoszeniach o wyniku. To może potrwać do dwóch minut.
          </Text>
        </Card>
      ) : null}

      {q.isError ? (
        <>
          <Notice tone="danger">{errorMessage(q.error)}</Notice>
          <Button label="Spróbuj ponownie" variant="outline" onPress={() => q.refetch()} />
        </>
      ) : null}

      {data ? (
        <>
          <Card>
            <Text style={[styles.small, { color: theme.textSecondary }]}>Szukana fraza</Text>
            <Text style={[styles.value, { color: theme.text }]}>{data.phrase}</Text>
            <Field
              label="Zmień frazę"
              hint="Węższa fraza daje trafniejsze wyniki; zbyt ogólna jest ucinana."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={search}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={data.phrase}
            />
            <Button label="Szukaj" variant="outline" onPress={search} busy={q.isFetching} disabled={input.trim().length < 3} />
          </Card>

          {data.truncated ? (
            <Notice tone="warn">Fraza jest zbyt ogólna i część wyników pominięto. Doprecyzuj ją, żeby zobaczyć pełny obraz.</Notice>
          ) : null}

          {data.results.length === 0 ? (
            <Card>
              <Text style={[styles.body, { color: theme.text }]}>Nie znaleziono podobnych zakończonych postępowań.</Text>
            </Card>
          ) : (
            <>
              <SectionTitle>Podsumowanie</SectionTitle>
              <Card>
                <Row label="Znalezione postępowania" value={String(data.stats.count)} />
                <Row
                  label="Liczba ofert"
                  value={
                    data.stats.offersMedian === null
                      ? '—'
                      : `mediana ${data.stats.offersMedian} (od ${data.stats.offersMin} do ${data.stats.offersMax})`
                  }
                />
                <Row
                  label="Rozrzut cen ofert"
                  value={data.stats.spreadMedian === null ? '—' : `ok. ${Math.round(data.stats.spreadMedian * 100)}%`}
                  hint="Mediana różnicy między ofertą najtańszą a najdroższą."
                />
                {data.stats.winners.length > 0 ? (
                  <Row label="Najczęstsi zwycięzcy" value={data.stats.winners.slice(0, 3).map((w) => `${w.name} (${w.wins})`).join('\n')} />
                ) : null}
              </Card>

              <SectionTitle>Postępowania</SectionTitle>
              {data.results.slice(0, shown).map((r) => (
                <Card key={r.noticeNumber}>
                  <Text style={[styles.title, { color: theme.text }]}>{r.title}</Text>
                  <Text style={[styles.small, { color: theme.textSecondary }]}>
                    {[r.organization, r.city, shortDate(r.date)].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={[styles.outcome, { color: r.outcome === 'umowa' ? theme.brand : theme.warn }]}>
                    {OUTCOME[r.outcome]}
                  </Text>
                  <Row label="Liczba ofert" value={r.offers === null ? '—' : String(r.offers)} />
                  <Row label="Najniższa cena" value={money(r.low)} />
                  <Row label="Najwyższa cena" value={money(r.high)} />
                  <Row label="Wybrana oferta" value={money(r.chosen)} />
                  {r.winner ? <Row label="Wykonawca" value={r.winnerSize ? `${r.winner} (${r.winnerSize})` : r.winner} /> : null}
                  {r.multiPart ? <Text style={[styles.small, { color: theme.warn }]}>Kilka części — liczby dotyczą pierwszej.</Text> : null}
                  {r.gov || r.edu ? (
                    <Text style={[styles.small, { color: theme.warn }]}>
                      Ceny mogą być trudne do porównania ({r.gov ? 'zamówienie rządowe' : 'zamówienie edukacyjne'}).
                    </Text>
                  ) : null}
                </Card>
              ))}
              {shown < data.results.length ? (
                <Button label={`Pokaż więcej (${data.results.length - shown})`} variant="outline" onPress={() => setShown((n) => n + PAGE)} />
              ) : null}
              <Text style={[styles.small, { color: theme.textSecondary }]}>
                Kwoty w PLN z ogłoszeń o wyniku; ogłoszenie nie mówi, czy są netto, czy brutto.
              </Text>
            </>
          )}
        </>
      ) : null}
    </View>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={[styles.small, { color: theme.textSecondary }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text> : null}
      </View>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  flex: { flex: 1 },
  loading: { alignItems: 'center', paddingVertical: 24 },
  center: { textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 12, lineHeight: 16 },
  value: { fontSize: 17, fontWeight: '600' },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  outcome: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowValue: { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'right' },
});
