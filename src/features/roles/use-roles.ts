import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRole,
  deleteRole,
  getPageRegistry,
  listRoles,
  updateRole,
  type CreateRoleInput,
  type UpdateRoleInput,
} from '../../lib/api';

const ROLES_QUERY_KEY = ['roles'];
const PAGE_REGISTRY_QUERY_KEY = ['page-registry'];

export function useRolesQuery() {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: () => listRoles(),
  });
}

export function usePageRegistryQuery() {
  return useQuery({
    queryKey: PAGE_REGISTRY_QUERY_KEY,
    queryFn: () => getPageRegistry(),
    staleTime: Infinity,
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => createRole(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY }),
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRoleInput }) => updateRole(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY }),
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
