import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

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
  field: { gap: 4 },
  fieldLabel: { fontSize: 15, fontWeight: '600' },
  fieldHint: { fontSize: 13, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: Radius.field, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.field, overflow: 'hidden' },
  segment: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '600' },
});

export function Field({
  label,
  hint,
  multiline = false,
  ...input
}: { label: string; hint?: string; multiline?: boolean } & Omit<TextInputProps, 'multiline' | 'style'>) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...input}
        multiline={multiline}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
          multiline && styles.multiline,
        ]}
      />
      {hint ? <Text style={[styles.fieldHint, { color: theme.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

/** Wybór jednej z kilku opcji (np. rola). */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: theme.border }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: theme.brand }]}>
            <Text style={[styles.segmentText, { color: active ? theme.onBrand : theme.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
