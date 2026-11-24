import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Notice({ tone, children }: { tone: 'warn' | 'danger' | 'brand'; children: ReactNode }) {
  const theme = useTheme();
  const soft: ThemeColor = tone === 'warn' ? 'warnSoft' : tone === 'danger' ? 'dangerSoft' : 'brandSoft';
  return (
    <View style={[styles.notice, { backgroundColor: theme[soft] }]}>
      <Text style={[styles.noticeText, { color: theme[tone] }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  busy?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const color = primary ? theme.onBrand : theme.brand;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: disabled || busy }}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: theme.brand } : { borderWidth: 1, borderColor: theme.brand },
        { opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      {busy ? <ActivityIndicator color={color} /> : <Text style={[styles.buttonText, { color }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, padding: Spacing.three, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: Spacing.two },
  notice: { borderRadius: Radius.field, padding: 12 },
  noticeText: { fontSize: 14, lineHeight: 20 },
  button: { borderRadius: Radius.field, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
