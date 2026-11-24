import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { usePushPreferences, usePushTest, useUpdatePushPreferences } from '@/api/push';
import { Button, Card, Notice, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPushPermission, registerDevice, requestPushPermission, type PushPermission } from '@/push/push';

const hour = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function NotificationsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const prefs = usePushPreferences();
  const update = useUpdatePushPreferences();
  const test = usePushTest();
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [registering, setRegistering] = useState(false);

  const refreshPermission = useCallback(() => {
    getPushPermission().then(setPermission);
  }, []);

  // Po powrocie z ustawień systemowych sprawdzamy zgodę jeszcze raz.
  useEffect(() => {
    refreshPermission();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshPermission());
    return () => sub.remove();
  }, [refreshPermission]);

  async function enable() {
    setRegistering(true);
    const result = await requestPushPermission();
    setPermission(result);
    if (result === 'granted') await registerDevice();
    await queryClient.invalidateQueries({ queryKey: ['push-preferences'] });
    setRegistering(false);
  }

  const p = prefs.data;
  const set = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);

  let banner: ReactNode = null;
  if (permission === 'unavailable') {
    banner = (
      <Notice tone="warn">
        Powiadomienia nie działają w tej wersji aplikacji (np. w Expo Go). Zainstaluj wersję z TestFlight.
      </Notice>
    );
  } else if (permission === 'denied') {
    banner = (
      <Card>
        <Text style={[styles.body, { color: theme.text }]}>
          Powiadomienia są wyłączone w ustawieniach iPhone’a. Włącz je, aby dostawać informacje o nowych przetargach.
        </Text>
        <Button label="Otwórz ustawienia" onPress={() => Linking.openSettings()} />
      </Card>
    );
  } else if (permission === 'undetermined' || (permission === 'granted' && p && p.devices === 0)) {
    banner = (
      <Card>
        <Text style={[styles.body, { color: theme.text }]}>
          Włącz powiadomienia, aby od razu dowiadywać się o nowych dopasowanych przetargach i zbliżających się terminach.
        </Text>
        <Button label="Włącz powiadomienia" onPress={enable} busy={registering} />
      </Card>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Powiadomienia', headerLargeTitle: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {prefs.isPending ? <ActivityIndicator color={theme.brand} style={styles.pad} /> : null}
        {prefs.error ? <Notice tone="danger">{errorMessage(prefs.error)}</Notice> : null}
        {update.isError ? <Notice tone="danger">{errorMessage(update.error)}</Notice> : null}
        {p && !p.serverPushEnabled ? (
          <Notice tone="warn">Serwer nie ma jeszcze skonfigurowanych powiadomień. Ustawienia zapiszą się, ale nic nie przyjdzie.</Notice>
        ) : null}
        {banner}

        {p ? (
          <>
            <SectionTitle>Co mamy zgłaszać</SectionTitle>
            <Card>
              <Toggle label="Nowe dopasowane przetargi" hint="Jedno zbiorcze powiadomienie" value={p.newMatches} onChange={(v) => set({ newMatches: v })} />
              {p.newMatches ? <Stepper label="Najniższe dopasowanie" value={p.minScore} min={0} max={100} step={10} format={(v) => `${v}/100`} onChange={(v) => set({ minScore: v })} /> : null}
              <Toggle label="Terminy ulubionych" hint="3 dni i 1 dzień przed" value={p.deadlines} onChange={(v) => set({ deadlines: v })} />
              <Toggle label="Nowe pliki w ulubionych" value={p.documents} onChange={(v) => set({ documents: v })} />
              <Toggle label="Wyniki ulubionych" value={p.results} onChange={(v) => set({ results: v })} />
            </Card>

            <SectionTitle>Godziny ciszy</SectionTitle>
            <Card>
              <Toggle
                label="Nie powiadamiaj w nocy"
                hint="Czas polski"
                value={p.quietStart !== null && p.quietEnd !== null}
                onChange={(v) => set(v ? { quietStart: 22, quietEnd: 7 } : { quietStart: null, quietEnd: null })}
              />
              {p.quietStart !== null && p.quietEnd !== null ? (
                <>
                  <Stepper label="Od" value={p.quietStart} min={0} max={23} step={1} wrap format={hour} onChange={(v) => set({ quietStart: v })} />
                  <Stepper label="Do" value={p.quietEnd} min={0} max={23} step={1} wrap format={hour} onChange={(v) => set({ quietEnd: v })} />
                </>
              ) : null}
            </Card>

            <SectionTitle>Test</SectionTitle>
            <Card>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Zarejestrowane urządzenia: {p.devices}. Próbne powiadomienie trafi na wszystkie Twoje urządzenia.
              </Text>
              <Button
                label="Wyślij próbne powiadomienie"
                variant="outline"
                busy={test.isPending}
                disabled={permission !== 'granted'}
                onPress={() => test.mutate()}
              />
              {test.isSuccess ? (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  {test.data.sent && test.data.sent > 0 ? `Wysłano: ${test.data.sent}. Powinno dotrzeć za chwilę.` : 'Serwer nie wysłał powiadomienia.'}
                </Text>
              ) : null}
              {test.isError ? <Notice tone="danger">{errorMessage(test.error)}</Notice> : null}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={[styles.body, { color: theme.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.brand }} accessibilityLabel={label} />
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  wrap = false,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  wrap?: boolean;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  const clamp = (v: number) => (wrap ? (v > max ? min : v < min ? max : v) : Math.min(max, Math.max(min, v)));
  const button = (text: string, delta: number, name: string) => (
    <Pressable
      onPress={() => onChange(clamp(value + delta))}
      accessibilityRole="button"
      accessibilityLabel={`${name}: ${label}`}
      style={({ pressed }) => [styles.stepBtn, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.stepText, { color: theme.brand }]}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      <Text style={[styles.body, styles.flex, { color: theme.text }]}>{label}</Text>
      {button('−', -step, 'Zmniejsz')}
      <Text style={[styles.value, { color: theme.text }]} accessibilityLiveRegion="polite">
        {format(value)}
      </Text>
      {button('+', step, 'Zwiększ')}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  pad: { padding: Spacing.four },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  body: { fontSize: 16, lineHeight: 22 },
  hint: { fontSize: 13, lineHeight: 18 },
  value: { minWidth: 62, textAlign: 'center', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  stepBtn: { width: 40, height: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, fontWeight: '600', lineHeight: 26 },
});
