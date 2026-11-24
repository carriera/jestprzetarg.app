import { useIsMutating } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { analysisKey, useRunAnalysis } from '@/api/tenders';
import type { AnalysisView, ConditionRating, Decision, DocumentStatus } from '@/api/types';
import { Button, Card, Notice, SectionTitle } from '@/components/ui';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shortDate } from '@/lib/format';

type Tone = { label: string; icon: string; color: ThemeColor; soft: ThemeColor };

// Każdy status ma ikonę i etykietę, żeby był czytelny także bez koloru.
export const DECISION: Record<Decision, Tone> = {
  startowac: { label: 'Startować', icon: '✓', color: 'brand', soft: 'brandSoft' },
  rozwazyc: { label: 'Rozważyć', icon: '?', color: 'warn', soft: 'warnSoft' },
  odpuscic: { label: 'Odpuścić', icon: '✕', color: 'danger', soft: 'dangerSoft' },
};
const RATING: Record<ConditionRating, Tone> = {
  spelnia: { label: 'spełnia', icon: '✓', color: 'brand', soft: 'brandSoft' },
  do_sprawdzenia: { label: 'do sprawdzenia', icon: '?', color: 'warn', soft: 'warnSoft' },
  nie_spelnia: { label: 'nie spełnia', icon: '✕', color: 'danger', soft: 'dangerSoft' },
};
const DOC_STATUS: Record<DocumentStatus, Tone> = {
  prawdopodobnie_posiadany: { label: 'prawdopodobnie masz', icon: '✓', color: 'brand', soft: 'brandSoft' },
  do_przygotowania: { label: 'do przygotowania', icon: '!', color: 'warn', soft: 'warnSoft' },
  nieznany: { label: 'nieznany', icon: '?', color: 'textSecondary', soft: 'backgroundElement' },
};

function Badge({ tone }: { tone: Tone }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme[tone.soft] }]}>
      <Text style={[styles.badgeText, { color: theme[tone.color] }]}>
        {tone.icon} {tone.label}
      </Text>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  const theme = useTheme();
  return (
    <Card>
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={[styles.body, { color: theme.textSecondary }]}>•</Text>
          <Text style={[styles.body, styles.flex, { color: theme.text }]}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}

export function AnalysisSection({ tenderId, analysis }: { tenderId: number; analysis: AnalysisView | null }) {
  const theme = useTheme();
  const run = useRunAnalysis(tenderId);
  // Liczymy po kluczu, bo mutacja mogła zostać uruchomiona przy poprzedniej wizycie na tym ekranie.
  const running = useIsMutating({ mutationKey: analysisKey(tenderId) }) > 0;
  const assessment = analysis?.assessment ?? null;

  const start = (refreshGeneral = false) =>
    run.mutate({ previousAssessmentId: assessment?.id ?? null, refreshGeneral });

  if (running) {
    return (
      <Card style={styles.progress}>
        <ActivityIndicator color={theme.brand} size="large" />
        <Text style={[styles.progressTitle, { color: theme.text }]}>Analizuję dokumentację…</Text>
        <Text style={[styles.body, styles.center, { color: theme.textSecondary }]}>
          To zwykle trwa 1–2 minuty. Możesz wyjść z tego ekranu i wrócić później — analiza zapisze się sama.
        </Text>
      </Card>
    );
  }

  const error = run.isError ? <Notice tone="danger">{errorMessage(run.error)}</Notice> : null;

  if (!analysis) {
    return (
      <View style={styles.stack}>
        {error}
        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Ten przetarg nie ma jeszcze analizy</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            AI przeczyta ogłoszenie i załączniki z e-Zamówień, streści je prostym językiem, porówna warunki udziału
            z profilem Twojej firmy i doradzi, czy warto startować.
          </Text>
          <Button label="Przeanalizuj" onPress={() => start()} />
        </Card>
      </View>
    );
  }

  const g = analysis.general;
  const a = assessment?.result ?? null;
  const decision = a ? DECISION[a.rekomendacja.decyzja] : null;
  const risks = [...g.ryzyka, ...(a?.dodatkoweRyzyka ?? [])];
  const questions = [...g.pytaniaDoZamawiajacego, ...(a?.dodatkowePytania ?? [])];

  return (
    <View style={styles.stack}>
      {error}
      {assessment?.stale ? (
        <Notice tone="warn">Dokumentacja została przeanalizowana ponownie. Odśwież ocenę dla swojej firmy.</Notice>
      ) : null}

      {a && decision ? (
        <View style={[styles.decision, { backgroundColor: theme[decision.soft], borderColor: theme[decision.color] }]}>
          <Text style={[styles.decisionLabel, { color: theme[decision.color] }]}>Rekomendacja</Text>
          <Text style={[styles.decisionValue, { color: theme[decision.color] }]}>
            {decision.icon} {decision.label}
          </Text>
          <Text style={[styles.body, { color: theme.text }]}>{a.rekomendacja.uzasadnienie}</Text>
        </View>
      ) : (
        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Brak oceny dla Twojej firmy</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Opis postępowania jest gotowy. Ocena porówna warunki z profilem firmy i poda rekomendację.
          </Text>
          <Button label="Oceń dla mojej firmy" onPress={() => start()} />
        </Card>
      )}

      <SectionTitle>W skrócie</SectionTitle>
      <Card>
        <Text style={[styles.body, { color: theme.text }]}>{g.streszczenie}</Text>
      </Card>

      {g.kluczoweFakty.length > 0 ? (
        <>
          <SectionTitle>Kluczowe fakty</SectionTitle>
          <Card>
            {g.kluczoweFakty.map((f, i) => (
              <View key={i} style={[styles.fact, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.small, { color: theme.textSecondary }]}>{f.etykieta}</Text>
                <Text style={[styles.body, { color: theme.text }]}>{f.wartosc}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {g.terminy.length > 0 ? (
        <>
          <SectionTitle>Terminy</SectionTitle>
          <Card>
            {g.terminy.map((t, i) => (
              <View key={i} style={[styles.fact, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.small, { color: theme.textSecondary }]}>{t.nazwa}</Text>
                <Text style={[styles.bodyStrong, { color: theme.text }]}>{t.data}</Text>
                {t.uwagi ? <Text style={[styles.small, { color: theme.textSecondary }]}>{t.uwagi}</Text> : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {g.warunkiUdzialu.length > 0 ? (
        <>
          <SectionTitle>Warunki udziału</SectionTitle>
          {g.warunkiUdzialu.map((w, i) => {
            // Ocena firmy odpowiada warunkom części ogólnej po indeksie.
            const mine = a?.warunki[i];
            return (
              <Card key={i}>
                {mine ? <Badge tone={RATING[mine.ocena]} /> : null}
                <Text style={[styles.body, { color: theme.text }]}>{w.warunek}</Text>
                {mine?.uzasadnienie ? (
                  <Text style={[styles.small, { color: theme.textSecondary }]}>{mine.uzasadnienie}</Text>
                ) : null}
              </Card>
            );
          })}
        </>
      ) : null}

      {g.wymaganeDokumenty.length > 0 ? (
        <>
          <SectionTitle>Wymagane dokumenty</SectionTitle>
          <Card>
            {g.wymaganeDokumenty.map((d, i) => {
              const mine = a?.dokumenty[i];
              return (
                <View key={i} style={[styles.fact, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <Text style={[styles.body, { color: theme.text }]}>{d.dokument}</Text>
                  {d.kiedy ? <Text style={[styles.small, { color: theme.textSecondary }]}>{d.kiedy}</Text> : null}
                  {mine ? <Badge tone={DOC_STATUS[mine.status]} /> : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {risks.length > 0 ? (
        <>
          <SectionTitle>Ryzyka</SectionTitle>
          <Bullets items={risks} />
        </>
      ) : null}

      {questions.length > 0 ? (
        <>
          <SectionTitle>Pytania do zamawiającego</SectionTitle>
          <Bullets items={questions} />
        </>
      ) : null}

      {a?.uwagi ? (
        <>
          <SectionTitle>Uwagi</SectionTitle>
          <Card>
            <Text style={[styles.body, { color: theme.text }]}>{a.uwagi}</Text>
          </Card>
        </>
      ) : null}

      <Text style={[styles.small, styles.center, { color: theme.textSecondary }]}>
        Źródło: {analysis.sourceLabel} · {shortDate(analysis.createdAt)}
        {'\n'}Analizę przygotowało AI i może zawierać błędy. Przed złożeniem oferty sprawdź dokumentację.
      </Text>
      {a ? <Button label="Oceń ponownie" variant="outline" onPress={() => start()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  bullet: { flexDirection: 'row', gap: 8 },
  fact: { gap: 3, paddingTop: 10 },
  badge: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  decision: { borderWidth: 1.5, borderRadius: Radius.card, padding: Spacing.three, gap: 6 },
  decisionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  decisionValue: { fontSize: 24, fontWeight: '700' },
  progress: { alignItems: 'center', paddingVertical: Spacing.five, gap: 12 },
  progressTitle: { fontSize: 18, fontWeight: '600' },
});
