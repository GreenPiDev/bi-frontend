import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../lib/realtime';

const DEPARTMENT_OPTIONS_QUERY_KEY = ['department-options'];

export function useDepartmentOptionsRealtimeSync(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent('departmentOptions.updated', () => {
    void queryClient.invalidateQueries({ queryKey: DEPARTMENT_OPTIONS_QUERY_KEY });
  });
}
