import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { errorMessage } from '@/api/client';
import { useTenderFlag } from '@/api/tenders';
import type { Tender } from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, isUrgent, shortDate } from '@/lib/format';

/** Szerokość napisu w odsłanianym polu. */
const IGNORE_LABEL_WIDTH = 104;
/** Po przesunięciu o tyle punktów puszczenie wiersza ignoruje przetarg. */
const IGNORE_THRESHOLD = 96;

/** Czerwone pole odsłaniane pod wierszem: rośnie razem z przesunięciem, napis wyłania się od lewej krawędzi ekranu. */
function IgnoreAction({ translation }: { translation: SharedValue<number> }) {
  const theme = useTheme();
  const panel = useAnimatedStyle(() => ({ width: Math.max(translation.value, 0) }));
  return (
    <Animated.View style={[styles.ignore, { backgroundColor: theme.danger }, panel]}>
      <View style={styles.ignoreLabel}>
        <Text style={styles.ignoreText}>Ignoruj</Text>
      </View>
    </Animated.View>
  );
}

/**
 * Karta przetargu. Z `swipeToIgnore` przesunięcie w prawo dodaje przetarg do ukrytych (ignorowanych);
 * cofnąć to można w „Więcej → Ukryte”.
 */
export function TenderCard({ tender, swipeToIgnore = false }: { tender: Tender; swipeToIgnore?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const hidden = useTenderFlag(tender.id, 'hidden');
  const ignore = () =>
    hidden.mutate(true, {
      onError: (e) => Alert.alert('Nie udało się zignorować przetargu', errorMessage(e)),
    });
  const score = tender.match?.score ?? null;
  const scoreColor = score === null ? theme.textSecondary : score >= 70 ? theme.brand : score >= 40 ? theme.warn : theme.textSecondary;
  const urgent = isUrgent(tender.daysLeft);
  const closed = tender.daysLeft !== null && tender.daysLeft < 0;
  const org = tender.organization;
  const place = [org.city, org.provinceName].filter(Boolean).join(' · ');
  const deadline = deadlineLabel(tender.daysLeft);
  const date = shortDate(tender.deadline);

  const card = (
    <Pressable
      onPress={() => router.push({ pathname: '/przetarg/[id]', params: { id: tender.id } })}
      // VoiceOver nie zna gestu przesunięcia — ta sama akcja jest dostępna z pokrętła czynności.
      accessibilityActions={swipeToIgnore ? [{ name: 'ignore', label: 'Ignoruj' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'ignore') ignore();
      }}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.background, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="link"
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
        {tender.isFavorite ? (
          <Text style={[styles.star, { color: theme.warn }]} accessibilityLabel="Ulubiony">
            ★
          </Text>
        ) : null}
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
        </View>
        <Text style={[styles.deadline, { color: urgent ? theme.danger : closed ? theme.textSecondary : theme.text }]}>
          {urgent ? '⏰ ' : ''}
          {deadline}
          {date ? <Text style={[styles.date, { color: theme.textSecondary }]}> · {date}</Text> : null}
        </Text>
      </View>
    </Pressable>
  );

  if (!swipeToIgnore) return card;
  return (
    <Swipeable
      renderLeftActions={(_progress, translation) => <IgnoreAction translation={translation} />}
      leftThreshold={IGNORE_THRESHOLD}
      overshootLeft={false}
      onSwipeableOpen={(direction) => {
        // Otwarcie lewej strony (ruch palca w prawo) biblioteka zgłasza jako RIGHT.
        if (direction === SwipeDirection.RIGHT) ignore();
      }}>
      {card}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  // Płaski wiersz na całą szerokość, z linią na dole — pełne tło, żeby zasłaniało pole „Ignoruj”.
  card: { paddingHorizontal: Spacing.three, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
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
  star: { fontSize: 20, lineHeight: 22 },
  deadline: { fontSize: 15, fontWeight: '600' },
  date: { fontWeight: '400' },
  ignore: { height: '100%', overflow: 'hidden', justifyContent: 'center' },
  ignoreLabel: { width: IGNORE_LABEL_WIDTH, alignItems: 'center' },
  ignoreText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
