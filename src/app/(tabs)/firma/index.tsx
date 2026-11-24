import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useMeta, useProfile, useSaveProfile, type ProfileFields } from '@/api/company';
import { ChipSelect, TagInput } from '@/components/chips';
import { Button, Card, Field, Notice, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function CompanyTab() {
  const theme = useTheme();
  const profile = useProfile();
  const meta = useMeta();
  const save = useSaveProfile();
  // Zmiany użytkownika trzymamy osobno i nakładamy na dane z serwera — po zapisie wystarczy je wyczyścić.
  const [draft, setDraft] = useState<Partial<ProfileFields>>({});

  const saved = profile.data;
  const form = saved ? { ...saved, ...draft } : null;
  const dirty = saved !== undefined && (Object.keys(draft) as (keyof ProfileFields)[]).some((k) => !same(draft[k], saved[k]));
  const edit = <K extends keyof ProfileFields>(key: K) => (value: ProfileFields[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    save.reset();
  };

  function submit() {
    const changed: Partial<ProfileFields> = {};
    if (saved) {
      for (const k of Object.keys(draft) as (keyof ProfileFields)[]) {
        if (!same(draft[k], saved[k])) Object.assign(changed, { [k]: draft[k] });
      }
    }
    save.mutate(changed, { onSuccess: () => setDraft({}) });
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Firma' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.content}>
        {profile.isPending ? <ActivityIndicator color={theme.brand} style={styles.pad} /> : null}
        {profile.error && !saved ? <Notice tone="danger">{errorMessage(profile.error)}</Notice> : null}
        {form ? (
          <>
            <Text style={[styles.lead, { color: theme.textSecondary }]}>
              Na podstawie tego profilu dobieramy przetargi i oceniamy warunki udziału.
            </Text>

            <SectionTitle>Firma</SectionTitle>
            <Card style={styles.group}>
              <Field label="Nazwa firmy" value={form.name} onChangeText={edit('name')} autoCapitalize="sentences" />
              <Field
                label="Czym się zajmujecie"
                hint="Kilka zdań. AI porówna z tym wymagania przetargu."
                multiline
                value={form.description}
                onChangeText={edit('description')}
              />
            </Card>

            <SectionTitle>Czego szukamy</SectionTitle>
            <Card style={styles.group}>
              <TagInput
                label="Kody CPV"
                hint="Wystarczy początek kodu, np. 3021 obejmuje sprzęt komputerowy."
                values={form.cpvPrefixes}
                onChange={edit('cpvPrefixes')}
                keyboardType="number-pad"
                placeholder="np. 30213000"
              />
              <TagInput
                label="Słowa kluczowe"
                hint="Szukamy ich w tytule przetargu."
                values={form.keywords}
                onChange={edit('keywords')}
                placeholder="np. serwer"
              />
              <TagInput
                label="Słowa wykluczające"
                hint="Przetargi z tymi słowami pomijamy."
                values={form.excludedKeywords}
                onChange={edit('excludedKeywords')}
                placeholder="np. remont"
              />
              {meta.data ? (
                <>
                  <ChipSelect
                    label="Województwa"
                    hint="Bez wyboru szukamy w całej Polsce."
                    options={meta.data.provinces}
                    selected={form.provinces}
                    onChange={edit('provinces')}
                  />
                  <ChipSelect
                    label="Rodzaje zamówień"
                    hint="Bez wyboru uwzględniamy wszystkie."
                    options={meta.data.orderTypes}
                    selected={form.orderTypes}
                    onChange={edit('orderTypes')}
                  />
                </>
              ) : meta.error ? (
                <Notice tone="warn">Nie udało się pobrać list województw i rodzajów zamówień. {errorMessage(meta.error)}</Notice>
              ) : (
                <ActivityIndicator color={theme.brand} />
              )}
            </Card>

            <SectionTitle>Doświadczenie i zasoby</SectionTitle>
            <Card style={styles.group}>
              <Field
                label="Doświadczenie"
                hint="Zrealizowane zamówienia, referencje, kwoty."
                multiline
                value={form.experience}
                onChangeText={edit('experience')}
              />
              <Field
                label="Zasoby"
                hint="Osoby z uprawnieniami, sprzęt, certyfikaty."
                multiline
                value={form.resources}
                onChangeText={edit('resources')}
              />
            </Card>

            {save.isError ? <Notice tone="danger">{errorMessage(save.error)}</Notice> : null}
            {save.isSuccess && !dirty ? <Notice tone="brand">Profil zapisany. Dopasowania przetargów odświeżymy.</Notice> : null}
            <View style={styles.save}>
              <Button label={dirty ? 'Zapisz profil' : 'Brak zmian'} onPress={submit} busy={save.isPending} disabled={!dirty} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  pad: { padding: Spacing.four },
  lead: { fontSize: 14, lineHeight: 20 },
  group: { gap: Spacing.three },
  save: { marginTop: Spacing.two },
});
