import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { isClarification, openDocument, shareDocument } from '@/api/documents';
import type { TenderDocument } from '@/api/types';
import { Card, Notice, SectionTitle } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { shortDate } from '@/lib/format';

function size(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

export function DocumentsSection({ documents }: { documents: TenderDocument[] }) {
  const theme = useTheme();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(doc: TenderDocument, action: (d: TenderDocument) => Promise<void>) {
    setBusyId(doc.id);
    setError(null);
    try {
      await action(doc);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <Text style={[styles.body, { color: theme.text }]}>Nie ma jeszcze załączników tego przetargu.</Text>
        <Text style={[styles.small, { color: theme.textSecondary }]}>
          Pobieramy je z e-Zamówień i sprawdzamy ponownie aż do terminu składania ofert. Zamawiający, który prowadzi
          postępowanie na własnej platformie, publikuje dokumenty tam — link znajdziesz w menu przetargu („e-Zamówienia”).
        </Text>
      </Card>
    );
  }

  const clarifications = documents.filter(isClarification);
  const others = documents.filter((d) => !isClarification(d));

  const row = (doc: TenderDocument, i: number) => {
    const busy = busyId === doc.id;
    return (
      <View key={doc.id} style={[styles.row, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
        <Pressable
          style={styles.main}
          disabled={!doc.available || busy}
          onPress={() => run(doc, openDocument)}
          accessibilityRole="button"
          accessibilityLabel={`Otwórz ${doc.name || doc.fileName}`}
          accessibilityState={{ disabled: !doc.available, busy }}>
          <Text style={[styles.name, { color: doc.available ? theme.text : theme.textSecondary }]} numberOfLines={3}>
            {doc.name || doc.fileName}
          </Text>
          <Text style={[styles.small, { color: theme.textSecondary }]}>
            {[doc.fileName !== doc.name ? doc.fileName : '', doc.size ? size(doc.size) : '', shortDate(doc.publishedAt), doc.available ? '' : 'niedostępny']
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Pressable>
        {busy ? (
          <ActivityIndicator color={theme.brand} />
        ) : doc.available ? (
          <Pressable
            onPress={() => run(doc, shareDocument)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Udostępnij ${doc.name || doc.fileName}`}>
            <Text style={[styles.share, { color: theme.brand }]}>Udostępnij</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.stack}>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {clarifications.length > 0 ? (
        <>
          <SectionTitle>Wyjaśnienia i zmiany</SectionTitle>
          <Text style={[styles.small, { color: theme.textSecondary }]}>
            Odpowiedzi zamawiającego na pytania wykonawców oraz zmiany treści SWZ. Obowiązują ponad pierwotną specyfikację.
          </Text>
          <Card style={styles.list}>{clarifications.map(row)}</Card>
        </>
      ) : null}
      {others.length > 0 ? (
        <>
          <SectionTitle>{clarifications.length > 0 ? 'Pozostałe dokumenty' : 'Dokumenty postępowania'}</SectionTitle>
          <Card style={styles.list}>{others.map(row)}</Card>
        </>
      ) : null}
      <Text style={[styles.small, { color: theme.textSecondary }]}>
        Dotknij dokumentu, aby go otworzyć. Pierwsze otwarcie pobiera plik na telefon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  list: { paddingVertical: 4, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  main: { flex: 1, gap: 3 },
  name: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 14, lineHeight: 20 },
  share: { fontSize: 15, fontWeight: '600' },
});
