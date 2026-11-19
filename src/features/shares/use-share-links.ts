import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  type ShareExpiryDays,
  type ShareResourceKind,
} from '../../lib/api';

function shareLinksKey(kind: ShareResourceKind, resourceId: string) {
  return ['share-links', kind, resourceId];
}

export function useShareLinksQuery(kind: ShareResourceKind, resourceId: string, enabled = true) {
  return useQuery({
    queryKey: shareLinksKey(kind, resourceId),
    queryFn: () => listShareLinks(kind, resourceId),
    enabled,
  });
}

export function useCreateShareLinkMutation(kind: ShareResourceKind, resourceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expiresInDays: ShareExpiryDays) =>
      createShareLink(kind, resourceId, expiresInDays),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shareLinksKey(kind, resourceId) }),
  });
}

export function useRevokeShareLinkMutation(kind: ShareResourceKind, resourceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => revokeShareLink(kind, resourceId, shareId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shareLinksKey(kind, resourceId) }),
  });
}
