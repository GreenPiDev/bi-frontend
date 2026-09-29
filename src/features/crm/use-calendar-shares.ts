import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCalendarsSharedWithMe,
  getMyCalendarGrants,
  updateMyCalendarGrants,
} from '../../lib/api';

const MY_GRANTS_QUERY_KEY = ['calendar-shares', 'my-grants'];
const SHARED_WITH_ME_QUERY_KEY = ['calendar-shares', 'shared-with-me'];

/** /profile?tab=security: ajandami kimlerin gorebildigi (ben owner'im). */
export function useMyCalendarGrantsQuery() {
  return useQuery({
    queryKey: MY_GRANTS_QUERY_KEY,
    queryFn: () => getMyCalendarGrants(),
  });
}

export function useUpdateMyCalendarGrantsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (viewerIds: string[]) => updateMyCalendarGrants(viewerIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_GRANTS_QUERY_KEY });
    },
  });
}

/** /ajanda dropdown: kimlerin ajandasini gorebildigim (ben viewer'im). */
export function useCalendarsSharedWithMeQuery() {
  return useQuery({
    queryKey: SHARED_WITH_ME_QUERY_KEY,
    queryFn: () => getCalendarsSharedWithMe(),
  });
}
