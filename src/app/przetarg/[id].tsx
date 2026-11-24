import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { markSeen, useTender, useTenderFlag } from '@/api/tenders';
import type { TenderDetail, TenderResult } from '@/api/types';
import { AnalysisSection, DECISION } from '@/components/analysis-section';
import { DocumentsSection } from '@/components/documents-section';
import { SimilarSection } from '@/components/similar-section';
import { Button, Card, Notice } from '@/components/ui';
import { ViewSwitcher } from '@/components/view-switcher';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, isUrgent, money, shortDate } from '@/lib/format';

type Section = 'analiza' | 'ogloszenie' | 'zalaczniki' | 'wynik' | 'podobne';

export default function TenderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string; section?: string }>();
  const id = Number(params.id);
  const { data: tender, error, isPending, refetch } = useTender(id);
  const favorite = useTenderFlag(id, 'favorite');
  const hidden = useTenderFlag(id, 'hidden');
  const [section, setSection] = useState<Section>(params.section === 'wynik' ? 'wynik' : 'analiza');
  const [pulling, setPulling] = useState(false);

  const isNew = tender?.isNew ?? false;
  useEffect(() => {
    if (isNew) markSeen(queryClient, id);
  }, [isNew, id, queryClient]);

  async function refresh() {
    setPulling(true);
    await refetch();
    setPulling(false);
  }

  function toggleHidden(t: TenderDetail) {
    hidden.mutate(!t.isHidden);
    if (!t.isHidden) router.back();
  }

  const star = tender ? (
    <Pressable
      onPress={() => favorite.mutate(!tender.isFavorite)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={tender.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
      <Text style={[styles.star, { color: tender.isFavorite ? theme.warn : theme.brand }]}>
        {tender.isFavorite ? '★' : '☆'}
      </Text>
    </Pressable>
  ) : null;

  return (
    <>
      <Stack.Screen options={{ headerRight: () => star }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} tintColor={theme.brand} />}>
        {isPending ? <ActivityIndicator color={theme.brand} style={styles.loading} /> : null}
        {error && !tender ? (
          <View style={styles.stack}>
            <Notice tone="danger">{errorMessage(error)}</Notice>
            <Button label="Spróbuj ponownie" variant="outline" onPress={() => refetch()} />
          </View>
        ) : null}
        {tender ? (
          <>
            <Header tender={tender} />
            {favorite.isError || hidden.isError ? (
              <Notice tone="danger">{errorMessage(favorite.error ?? hidden.error)}</Notice>
            ) : null}
            <View style={styles.actions}>
              <Action label={tender.isHidden ? 'Przywróć' : 'Ukryj'} onPress={() => toggleHidden(tender)} />
              {tender.proceedingUrl || tender.platformUrl ? (
                <Action
                  label="e-Zamówienia ↗"
                  onPress={() => Linking.openURL((tender.proceedingUrl ?? tender.platformUrl)!)}
                />
              ) : null}
              <Action
                label="Udostępnij"
                onPress={() => Share.share({ message: `${tender.title}\nhttps://jestprzetarg.pl/przetarg/${tender.id}` })}
              />
            </View>
            <ViewSwitcher<Section>
              items={[
                { key: 'analiza', label: 'Analiza' },
                { key: 'ogloszenie', label: 'Ogłoszenie' },
                { key: 'zalaczniki', label: 'Załączniki', count: tender.documents.length },
                ...(tender.result ? [{ key: 'wynik' as const, label: 'Wynik' }] : []),
                { key: 'podobne', label: 'Podobne' },
              ]}
              selected={section}
              onSelect={setSection}
            />
            {section === 'analiza' || (section === 'wynik' && !tender.result) ? <AnalysisSection
                tenderId={tender.id}
                analysis={tender.analysis}
                documentsCount={tender.documents.length}
                onShowDocuments={() => setSection('zalaczniki')}
              /> : null}
            {section === 'ogloszenie' ? <NoticeSection tender={tender} /> : null}
            {section === 'zalaczniki' ? <DocumentsSection documents={tender.documents} /> : null}
            {section === 'podobne' ? <SimilarSection tenderId={tender.id} /> : null}
            {section === 'wynik' && tender.result ? <ResultSection result={tender.result} /> : null}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

function Header({ tender }: { tender: TenderDetail }) {
  const theme = useTheme();
  const org = tender.organization;
  const urgent = isUrgent(tender.daysLeft);
  const decision = tender.analysis?.assessment ? DECISION[tender.analysis.assessment.result.rekomendacja.decyzja] : null;
  const score = tender.match?.score ?? null;

  return (
    <View style={styles.stack}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header" selectable>
        {tender.title}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {[org.name, org.city, org.provinceName].filter(Boolean).join(' · ')}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {[tender.orderTypeName, tender.cpv ? `CPV ${tender.cpv}` : ''].filter(Boolean).join(' · ')}
      </Text>

      <View style={styles.tiles}>
        <Tile
          label="Termin"
          value={`${urgent ? '⏰ ' : ''}${deadlineLabel(tender.daysLeft)}`}
          hint={shortDate(tender.deadline)}
          color={urgent ? theme.danger : theme.text}
        />
        <Tile
          label="Dopasowanie"
          value={score === null ? '—' : `${score}/100`}
          color={score !== null && score >= 70 ? theme.brand : theme.text}
        />
        <Tile
          label="Rekomendacja"
          value={decision ? `${decision.icon} ${decision.label}` : 'brak analizy'}
          color={decision ? theme[decision.color] : theme.textSecondary}
        />
      </View>

      {tender.match && tender.match.reasons.length > 0 ? (
        <View style={styles.reasons}>
          {tender.match.reasons.map((reason) => (
            <View key={reason} style={[styles.reason, { backgroundColor: theme.brandSoft }]}>
              <Text style={[styles.reasonText, { color: theme.brand }]}>✓ {reason}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Tile({ label, value, hint, color }: { label: string; value: string; hint?: string; color: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}>
      <Text style={[styles.tileLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.tileValue, { color }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
      </Text>
      {hint ? <Text style={[styles.tileHint, { color: theme.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, { borderColor: theme.border, backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.actionText, { color: theme.brand }]}>{label}</Text>
    </Pressable>
  );
}

function NoticeSection({ tender }: { tender: TenderDetail }) {
  const theme = useTheme();
  return (
    <Card>
      <Text style={[styles.small, { color: theme.textSecondary }]}>
        {[
          tender.bzpNumber ? `BZP ${tender.bzpNumber}` : '',
          tender.publicationDate ? `opublikowano ${shortDate(tender.publicationDate)}` : '',
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text style={[styles.notice, { color: theme.text }]} selectable>
        {tender.noticeText || 'Brak treści ogłoszenia.'}
      </Text>
    </Card>
  );
}

function ResultSection({ result }: { result: TenderResult }) {
  const theme = useTheme();
  const outcome = result.outcome === 'umowa' ? 'Zawarto umowę' : result.outcome === 'uniewaznienie' ? 'Unieważniono' : 'Inny wynik';
  const rows: [string, string][] = [
    ['Wynik', outcome],
    ['Liczba ofert', result.offersCount === null ? '—' : String(result.offersCount)],
    ['Odrzucone oferty', result.rejectedCount === null ? '—' : String(result.rejectedCount)],
    ['Najniższa cena', money(result.lowestPrice)],
    ['Najwyższa cena', money(result.highestPrice)],
    ['Cena wybranej oferty', money(result.chosenPrice)],
    ['Wartość umowy', money(result.contractValue)],
    ['Wykonawca', result.winnerName ?? '—'],
  ];
  return (
    <View style={styles.stack}>
      {result.multiPart ? (
        <Notice tone="warn">Postępowanie ma kilka części. Liczby poniżej dotyczą pierwszej z nich.</Notice>
      ) : null}
      <Card>
        {rows.map(([label, value], i) => (
          <View key={label} style={[styles.row, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[styles.small, styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
          </View>
        ))}
      </Card>
      <Text style={[styles.small, { color: theme.textSecondary }]}>
        Kwoty w PLN. Ogłoszenie o wyniku nie podaje, czy są netto, czy brutto.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  loading: { marginTop: Spacing.six },
  stack: { gap: 8 },
  star: { fontSize: 26 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  meta: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tile: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, padding: 10, gap: 2, minHeight: 84 },
  tileLabel: { fontSize: 12, fontWeight: '600' },
  tileValue: { fontSize: 17, fontWeight: '700' },
  tileHint: { fontSize: 12 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  reason: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  reasonText: { fontSize: 13, fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { borderWidth: 1, borderRadius: Radius.field, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  actionText: { fontSize: 15, fontWeight: '600' },
  notice: { fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 10 },
  rowLabel: { flex: 1 },
  rowValue: { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'right' },
});
