import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const INTERACTION_TYPE_OPTIONS_QUERY_KEY = ['interaction-type-options'];

export function useInteractionTypeOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('interactionTypeOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: INTERACTION_TYPE_OPTIONS_QUERY_KEY });
  });
}
