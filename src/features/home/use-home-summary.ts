import { useQuery } from '@tanstack/react-query';
import { listInteractions, listProjects, listQuotes, listOpportunities } from '../../lib/api';

/** /anasayfa'daki ozet kartlari icin ucuz toplam sayilar - ilgili listeleme ucunun
 * `meta.total`'i disinda hicbir ek veri cekilmez (pageSize=1), bkz. use-quotes.ts
 * useQuoteStatusCounts'taki ayni desen. Her biri kendi sayfasinin VIEW+modul
 * erisimine gore `enabled` ile kapatilir - erisimi olmayan kullanici icin istek hic
 * atilmaz (403'e dusup sessizce yutmak yerine). */

export function useTotalQuotesCount(enabled: boolean) {
  return useQuery({
    queryKey: ['home', 'quotes-count'],
    queryFn: () => listQuotes({ pageSize: 1 }),
    enabled,
  });
}

export function useTotalInteractionsCount(enabled: boolean) {
  return useQuery({
    queryKey: ['home', 'interactions-count'],
    queryFn: () => listInteractions({ pageSize: 1 }),
    enabled,
  });
}

export function useTotalOpportunitiesCount(enabled: boolean) {
  return useQuery({
    queryKey: ['home', 'opportunities-count'],
    queryFn: () => listOpportunities({ pageSize: 1 }),
    enabled,
  });
}

export function useTotalProjectsCount(enabled: boolean) {
  return useQuery({
    queryKey: ['home', 'projects-count'],
    queryFn: () => listProjects({ pageSize: 1 }),
    enabled,
  });
}
