import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from './client';
import type { InviteCreated, InvitePreview, Meta, Profile, Role, Team } from './types';

export const useMeta = () =>
  useQuery({
    queryKey: ['meta'],
    queryFn: () => unwrap(api.GET('/meta')) as Promise<Meta>,
    staleTime: 24 * 60 * 60 * 1000,
  });

export const useProfile = () =>
  useQuery({ queryKey: ['profile'], queryFn: () => unwrap(api.GET('/profile')) as Promise<Profile> });

export type ProfileFields = Omit<Profile, 'updatedAt'>;

/** Zapis profilu zmienia dopasowania, więc listy przetargów pobieramy od nowa. */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: Partial<ProfileFields>) => unwrap(api.PUT('/profile', { body: fields })) as Promise<Profile>,
    onSuccess: (saved) => {
      queryClient.setQueryData(['profile'], saved);
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}

export const useTeam = (enabled: boolean) =>
  useQuery({ queryKey: ['team'], queryFn: () => unwrap(api.GET('/team')) as Promise<Team>, enabled });

function useTeamMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => queryClient.invalidateQueries({ queryKey: ['team'] }) });
}

export const useCreateInvitation = () =>
  useTeamMutation(
    (v: { email?: string; role: Role }) =>
      unwrap(api.POST('/team/invitations', { body: v })) as Promise<InviteCreated>,
  );

export const useRevokeInvitation = () =>
  useTeamMutation((id: number) => unwrap(api.DELETE('/team/invitations/{id}', { params: { path: { id } } })));

export const useChangeRole = () =>
  useTeamMutation((v: { id: number; role: Role }) =>
    unwrap(api.PATCH('/team/members/{id}', { params: { path: { id: v.id } }, body: { role: v.role } })),
  );

export const useRemoveMember = () =>
  useTeamMutation((id: number) => unwrap(api.DELETE('/team/members/{id}', { params: { path: { id } } })));

export const useInvitePreview = (token: string) =>
  useQuery({
    queryKey: ['invitation', token],
    queryFn: () => unwrap(api.GET('/invitations/{token}', { params: { path: { token } } })) as Promise<InvitePreview>,
    retry: false,
  });
