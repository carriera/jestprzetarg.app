import { useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';

import { api, ApiError, postLong, unwrap } from './client';
import type { AnalysisView, Tender, TenderDetail, TenderList } from './types';

export const tenderKey = (id: number) => ['tender', id] as const;
const analysisKey = (id: number) => ['analysis-run', id] as const;

export function useTender(id: number) {
  return useQuery({
    queryKey: tenderKey(id),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/tenders/{id}', { params: { path: { id } }, signal })) as Promise<TenderDetail>,
    enabled: Number.isInteger(id) && id > 0,
  });
}

type Flags = Partial<Pick<Tender, 'isFavorite' | 'isHidden' | 'isNew'>>;

/** Nanosi zmianę znaczników na szczegóły i na wszystkie pobrane strony list, żeby ekran reagował od razu. */
function patchTender(queryClient: QueryClient, id: number, flags: Flags) {
  queryClient.setQueryData<TenderDetail>(tenderKey(id), (old) => (old ? { ...old, ...flags } : old));
  queryClient.setQueriesData<InfiniteData<TenderList>>({ queryKey: ['tenders'] }, (old) =>
    old
      ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map((t) => (t.id === id ? { ...t, ...flags } : t)) })) }
      : old,
  );
}

/** Ulubione i ukryte są wspólne dla całej firmy. Zmiana jest optymistyczna i cofa się przy błędzie. */
export function useTenderFlag(id: number, flag: 'favorite' | 'hidden') {
  const queryClient = useQueryClient();
  const field = flag === 'favorite' ? 'isFavorite' : 'isHidden';
  return useMutation({
    mutationFn: (value: boolean) => {
      const path = flag === 'favorite' ? '/tenders/{id}/favorite' : '/tenders/{id}/hidden';
      const init = { params: { path: { id } } };
      return unwrap(value ? api.PUT(path, init) : api.DELETE(path, init));
    },
    onMutate: (value) => patchTender(queryClient, id, { [field]: value }),
    onError: (_e, value) => patchTender(queryClient, id, { [field]: !value }),
    // Liczniki i skład widoków (ulubione, ukryte) zmieniają się po stronie serwera.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tenders'] }),
  });
}

/** Zdejmuje znacznik „nowy”. Błąd jest nieistotny — spróbujemy przy następnym otwarciu. */
export function markSeen(queryClient: QueryClient, id: number) {
  patchTender(queryClient, id, { isNew: false });
  api.PUT('/tenders/{id}/seen', { params: { path: { id } } }).catch(() => {});
}

const ANALYSIS_TIMEOUT_MS = 300_000;
const POLL_EVERY_MS = 6_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Zleca analizę AI. Serwer odpowiada dopiero po zakończeniu (1–2 min), więc gdy połączenie padnie po drodze
 * (aplikacja w tle, zmiana sieci), sprawdzamy co kilka sekund, czy na serwerze pojawiła się nowa ocena.
 */
async function runAnalysis(id: number, previousAssessmentId: number | null, refreshGeneral: boolean): Promise<AnalysisView> {
  const startedAt = Date.now();
  try {
    return await postLong<AnalysisView>(`/tenders/${id}/analysis`, { autoSwz: true, refreshGeneral }, ANALYSIS_TIMEOUT_MS);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 0) throw e;
    // Błąd od razu po starcie to brak sieci, a nie zerwane długie połączenie — nie ma na co czekać.
    if (Date.now() - startedAt < 10_000) {
      throw new ApiError(0, 'network', 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
    }
    while (Date.now() - startedAt < ANALYSIS_TIMEOUT_MS) {
      await sleep(POLL_EVERY_MS);
      try {
        const { current } = await unwrap(api.GET('/tenders/{id}/analysis', { params: { path: { id } } }));
        const view = current as AnalysisView | null;
        if (view?.assessment && view.assessment.id !== previousAssessmentId) return view;
      } catch (pollError) {
        if (pollError instanceof ApiError && pollError.status !== 0) throw pollError;
      }
    }
    throw new ApiError(0, 'timeout', 'Analiza trwa dłużej niż zwykle. Zajrzyj tu ponownie za kilka minut.');
  }
}

/** Mutacja ma stały klucz, więc trwa dalej po wyjściu z ekranu, a po powrocie widać jej stan. */
export function useRunAnalysis(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: analysisKey(id),
    mutationFn: ({ previousAssessmentId, refreshGeneral }: { previousAssessmentId: number | null; refreshGeneral: boolean }) =>
      runAnalysis(id, previousAssessmentId, refreshGeneral),
    onSuccess: (analysis) => {
      queryClient.setQueryData<TenderDetail>(tenderKey(id), (old) => (old ? { ...old, analysis } : old));
    },
  });
}

export { analysisKey };
