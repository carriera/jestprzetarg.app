import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import type React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { api, errorMessage, unwrap } from '@/api/client';
import type { Counts, TenderList, TenderView } from '@/api/types';
import { TenderCard } from '@/components/tender-card';
import { ViewSwitcher } from '@/components/view-switcher';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDebounced } from '@/lib/use-debounced';

const PAGE_SIZE = 30;

export type ListView = { view: TenderView; label: string; count: keyof Counts };

const EMPTY: Record<TenderView, string> = {
  dopasowane: 'Żaden otwarty przetarg nie pasuje teraz do profilu firmy.',
  wszystkie: 'W bazie nie ma teraz otwartych przetargów.',
  archiwum: 'Archiwum jest puste.',
  ulubione: 'Nie masz jeszcze ulubionych przetargów.',
  'ulubione-zakonczone': 'Żaden z ulubionych przetargów jeszcze się nie zakończył.',
  ukryte: 'Nie ma ukrytych przetargów.',
};

export function TenderListScreen({ title, views }: { title: string; views: ListView[] }) {
  const theme = useTheme();
  const [view, setView] = useState<TenderView>(views[0].view);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 400);
  const [pulling, setPulling] = useState(false);

  const query = useInfiniteQuery({
    queryKey: ['tenders', view, q],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET('/tenders', { params: { query: { view, q: q || undefined, page: pageParam, pageSize: PAGE_SIZE } }, signal }),
      ) as Promise<TenderList>,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

  const first = query.data?.pages[0];
  // Ukrycie (np. gestem „Ignoruj”) jest optymistyczne: karta znika od razu, zanim serwer odeśle nową listę.
  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).filter((t) => view === 'ukryte' || !t.isHidden);
  const counts = first?.counts;

  async function refresh() {
    setPulling(true);
    await query.refetch();
    setPulling(false);
  }

  const header = (
    <View style={styles.header}>
      <ViewSwitcher
        items={views.map((v) => ({ key: v.view, label: v.label, count: counts?.[v.count] }))}
        selected={view}
        onSelect={setView}
      />
      {first && !first.profileReady && view === 'dopasowane' ? (
        <Link href="/firma" asChild>
          <Pressable
            // Link z asChild nie przyjmuje tablicy stylów u dziecka — trzeba ją spłaszczyć.
            style={StyleSheet.flatten([styles.banner, { backgroundColor: theme.warnSoft }])}
            accessibilityRole="link">
            <Text style={[styles.bannerText, { color: theme.warn }]}>
              Uzupełnij profil firmy (kody CPV lub słowa kluczowe), aby zobaczyć dopasowane przetargi. ›
            </Text>
          </Pressable>
        </Link>
      ) : null}
      {query.isError && items.length > 0 ? (
        <View style={[styles.banner, { backgroundColor: theme.dangerSoft }]}>
          <Text style={[styles.bannerText, { color: theme.danger }]}>
            Nie udało się odświeżyć. {errorMessage(query.error)}
          </Text>
        </View>
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (query.isPending) {
    empty = <ActivityIndicator style={styles.center} color={theme.brand} />;
  } else if (query.isError) {
    empty = (
      <View style={styles.center}>
        <Text style={[styles.emptyText, { color: theme.text }]}>{errorMessage(query.error)}</Text>
        <Pressable
          onPress={() => query.refetch()}
          style={[styles.retry, { borderColor: theme.brand }]}
          accessibilityRole="button">
          <Text style={[styles.retryText, { color: theme.brand }]}>Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  } else {
    empty = (
      <View style={styles.center}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {q ? `Brak wyników dla „${q}”.` : EMPTY[view]}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerSearchBarOptions: {
            placeholder: 'Tytuł, zamawiający, CPV',
            hideWhenScrolling: false,
            onChangeText: (e) => setSearch(e.nativeEvent.text),
            onCancelButtonPress: () => setSearch(''),
          },
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => <TenderCard tender={item} swipeToIgnore={view !== 'ukryte'} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={theme.brand} />
          ) : first && items.length > 0 ? (
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Pokazano {items.length} z {first.total}
            </Text>
          ) : undefined
        }
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} tintColor={theme.brand} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        keyboardDismissMode="on-drag"
        style={{ opacity: query.isPlaceholderData ? 0.5 : 1 }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: Spacing.six, flexGrow: 1 },
  header: { gap: Spacing.two, padding: Spacing.three, paddingBottom: Spacing.two },
  banner: { borderRadius: Radius.field, padding: 12 },
  bannerText: { fontSize: 14, lineHeight: 20 },
  center: { paddingVertical: Spacing.six, alignItems: 'center', gap: Spacing.three },
  emptyText: { fontSize: 16, lineHeight: 22, textAlign: 'center', paddingHorizontal: Spacing.four },
  retry: { borderWidth: 1, borderRadius: Radius.field, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' },
  retryText: { fontSize: 16, fontWeight: '600' },
  footer: { marginTop: Spacing.four },
  footerText: { textAlign: 'center', marginTop: Spacing.four, fontSize: 13 },
});
