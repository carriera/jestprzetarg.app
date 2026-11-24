import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SwitcherItem<K extends string> = { key: K; label: string; count?: number };

export function ViewSwitcher<K extends string>({
  items,
  selected,
  onSelect,
}: {
  items: SwitcherItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => {
        const active = item.key === selected;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.pill,
              { backgroundColor: active ? theme.brand : theme.card, borderColor: active ? theme.brand : theme.border },
            ]}>
            <Text style={[styles.label, { color: active ? theme.onBrand : theme.text }]}>
              {item.label}
              {item.count !== undefined ? <Text style={styles.count}>  {item.count}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingBottom: Spacing.two },
  pill: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '600' },
  count: { fontWeight: '400', opacity: 0.8 },
});
