import { Link } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { errorMessage } from '@/api/client';
import { useTenderFlag } from '@/api/tenders';
import type { Tender } from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, isUrgent, shortDate } from '@/lib/format';

/** Szerokość, na jaką napis „Ignoruj” wysuwa się zza lewej krawędzi ekranu. */
const IGNORE_LABEL_WIDTH = 120;
/** Po przesunięciu o tyle punktów puszczenie karty ukrywa przetarg. */
const IGNORE_THRESHOLD = 90;

/** Tło pod kartą: napis jedzie razem z jej lewą krawędzią, aż wysunie się w całości. */
function IgnoreAction({ translation }: { translation: SharedValue<number> }) {
  const theme = useTheme();
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.min(translation.value, IGNORE_LABEL_WIDTH) - IGNORE_LABEL_WIDTH }],
  }));
  return (
    <View style={[styles.ignore, { backgroundColor: theme.danger }]}>
      <Animated.View style={[styles.ignoreLabel, slide]}>
        <Text style={[styles.ignoreText, { color: theme.onBrand }]}>Ignoruj</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Karta przetargu. Z `swipeToIgnore` przesunięcie w prawo dodaje przetarg do ukrytych (ignorowanych);
 * cofnąć to można w „Więcej → Ukryte”.
 */
export function TenderCard({ tender, swipeToIgnore = false }: { tender: Tender; swipeToIgnore?: boolean }) {
  const theme = useTheme();
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
    <Link href={{ pathname: '/przetarg/[id]', params: { id: tender.id } }} asChild>
    <Pressable
      // VoiceOver nie zna gestu przesunięcia — ta sama akcja jest dostępna z pokrętła czynności.
      accessibilityActions={swipeToIgnore ? [{ name: 'ignore', label: 'Ignoruj' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'ignore') ignore();
      }}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
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
    </Pressable>
    </Link>
  );

  if (!swipeToIgnore) return card;
  return (
    <Swipeable
      renderLeftActions={(_progress, translation) => <IgnoreAction translation={translation} />}
      leftThreshold={IGNORE_THRESHOLD}
      overshootLeft={false}
      containerStyle={styles.swipe}
      onSwipeableOpen={(direction) => {
        // Otwarcie lewej strony (ruch palca w prawo) biblioteka zgłasza jako RIGHT.
        if (direction === SwipeDirection.RIGHT) ignore();
      }}>
      {card}
    </Swipeable>
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
  swipe: { borderRadius: Radius.card },
  // Pełna szerokość wiersza: po puszczeniu karta odjeżdża w całości za prawą krawędź.
  ignore: { flex: 1, borderRadius: Radius.card, justifyContent: 'center', overflow: 'hidden' },
  ignoreLabel: { width: IGNORE_LABEL_WIDTH, alignItems: 'center' },
  ignoreText: { fontSize: 17, fontWeight: '700' },
});
