import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Lista krótkich wartości (kody CPV, słowa kluczowe) z dopisywaniem i usuwaniem. */
export function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  const theme = useTheme();
  const [text, setText] = useState('');

  function commit(raw: string) {
    const parts = raw
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const lower = new Set(values.map((v) => v.toLowerCase()));
    const added = parts.filter((p, i) => !lower.has(p.toLowerCase()) && parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
    if (added.length > 0) onChange([...values, ...added]);
    setText('');
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {values.length > 0 ? (
        <View style={styles.chips}>
          {values.map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange(values.filter((x) => x !== v))}
              accessibilityRole="button"
              accessibilityLabel={`Usuń ${v}`}
              style={[styles.chip, { backgroundColor: theme.brandSoft }]}>
              <Text style={[styles.chipText, { color: theme.brand }]}>
                {v}  ✕
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        value={text}
        onChangeText={(t) => (/[,;]/.test(t) ? commit(t) : setText(t))}
        onSubmitEditing={() => commit(text)}
        onBlur={() => commit(text)}
        blurOnSubmit={false}
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholder={placeholder ?? 'Dodaj i zatwierdź'}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
      />
      {hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

/** Wielokrotny wybór z listy; pusty wybór oznacza „wszystkie”. */
export function ChipSelect({
  label,
  hint,
  options,
  selected,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { code: string; name: string }[];
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = selected.includes(o.code);
          return (
            <Pressable
              key={o.code}
              onPress={() => onChange(on ? selected.filter((c) => c !== o.code) : [...selected, o.code])}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[
                styles.chip,
                { backgroundColor: on ? theme.brand : theme.background, borderColor: on ? theme.brand : theme.border, borderWidth: 1 },
              ]}>
              <Text style={[styles.chipText, { color: on ? theme.onBrand : theme.text }]}>{on ? '✓ ' : ''}{o.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: Radius.pill, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: Radius.field, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
