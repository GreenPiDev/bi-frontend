import { useQuery } from '@tanstack/react-query';
import { listAuditLogs } from '../../lib/api';

export function useAuditLogsQuery(
  params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
  } = {},
) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params),
  });
}
