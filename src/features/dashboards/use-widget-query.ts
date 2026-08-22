import { useQuery } from '@tanstack/react-query';
import { runQuery, type QuerySpec } from '../../lib/api';

export function useWidgetQuery(spec: QuerySpec) {
  return useQuery({
    queryKey: ['query', spec],
    queryFn: () => runQuery(spec),
  });
}
