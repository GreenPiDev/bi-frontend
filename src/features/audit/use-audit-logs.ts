import { useQuery } from '@tanstack/react-query';
import { listAuditLogs } from '../../lib/api';

export function useAuditLogsQuery() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => listAuditLogs(),
  });
}
