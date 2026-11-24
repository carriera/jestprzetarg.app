import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from './client';
import type { PushPreferences } from './types';

const key = ['push-preferences'] as const;

export function usePushPreferences() {
  return useQuery({
    queryKey: key,
    queryFn: () => unwrap(api.GET('/push/preferences')) as Promise<PushPreferences>,
  });
}

/** Zmiana jest częściowa (PUT wysyła tylko podane pola) i widoczna od razu; przy błędzie wracamy do stanu z serwera. */
export function useUpdatePushPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<PushPreferences, 'devices' | 'serverPushEnabled'>>) =>
      unwrap(api.PUT('/push/preferences', { body: patch })) as Promise<PushPreferences>,
    onMutate: (patch) => {
      queryClient.setQueryData<PushPreferences>(key, (old) => (old ? { ...old, ...patch } : old));
    },
    onSuccess: (saved) => queryClient.setQueryData(key, saved),
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function usePushTest() {
  return useMutation({ mutationFn: () => unwrap(api.POST('/push/test')) });
}
