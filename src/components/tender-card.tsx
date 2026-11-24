import { StyleSheet, Text, View } from 'react-native';

import type { Tender } from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, isUrgent, shortDate } from '@/lib/format';

export function TenderCard({ tender }: { tender: Tender }) {
  const theme = useTheme();
  const score = tender.match?.score ?? null;
  const scoreColor = score === null ? theme.textSecondary : score >= 70 ? theme.brand : score >= 40 ? theme.warn : theme.textSecondary;
  const urgent = isUrgent(tender.daysLeft);
  const closed = tender.daysLeft !== null && tender.daysLeft < 0;
  const org = tender.organization;
  const place = [org.city, org.provinceName].filter(Boolean).join(' · ');
  const deadline = deadlineLabel(tender.daysLeft);
  const date = shortDate(tender.deadline);

  return (
    <View
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      accessible
      accessibilityLabel={[
        tender.isNew ? 'Nowy.' : '',
        tender.title,
        org.name,
        score !== null ? `Dopasowanie ${score} na 100.` : '',
        `Termin: ${deadline}${date ? `, ${date}` : ''}.`,
      ]
        .filter(Boolean)
        .join(' ')}>
      <View style={styles.row}>
        <View style={[styles.score, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{score ?? '–'}</Text>
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
            {tender.title}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={2}>
            {org.name}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
            {[place, tender.orderTypeName].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      {tender.match && tender.match.reasons.length > 0 ? (
        <View style={styles.reasons}>
          {tender.match.reasons.slice(0, 3).map((reason) => (
            <View key={reason} style={[styles.reason, { backgroundColor: theme.brandSoft }]}>
              <Text style={[styles.reasonText, { color: theme.brand }]} numberOfLines={1}>
                ✓ {reason}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.badges}>
          {tender.isNew ? (
            <View style={[styles.badge, { backgroundColor: theme.brand }]}>
              <Text style={[styles.badgeText, { color: theme.onBrand }]}>NOWY</Text>
            </View>
          ) : null}
          {tender.isFavorite ? <Text style={[styles.star, { color: theme.warn }]}>★</Text> : null}
        </View>
        <Text style={[styles.deadline, { color: urgent ? theme.danger : closed ? theme.textSecondary : theme.text }]}>
          {urgent ? '⏰ ' : ''}
          {deadline}
          {date ? <Text style={[styles.date, { color: theme.textSecondary }]}> · {date}</Text> : null}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, padding: Spacing.three, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  score: { width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  meta: { fontSize: 14, lineHeight: 19 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reason: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, maxWidth: '100%' },
  reasonText: { fontSize: 13, fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  star: { fontSize: 17 },
  deadline: { fontSize: 15, fontWeight: '600' },
  date: { fontWeight: '400' },
});
