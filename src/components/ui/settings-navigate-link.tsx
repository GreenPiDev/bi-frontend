import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface SettingsNavigateLinkProps {
  /** `/settings` sayfasindaki hedef tab (`?tab=<tab>`). */
  tab: string;
  /** Verilirse, hedef `CollapsibleSection`in `highlightKey` prop'uyla eslesen
   * `?highlight=<highlightKey>` eklenir - bkz. `useSectionHighlight`. */
  highlightKey?: string;
  className?: string;
  children: ReactNode;
}

/**
 * "X alanini tanimlamak icin ayarlara git" seklindeki, forma dokunmadan yeni
 * sekmede `/settings`e goturen linklerin ortak hali - sector/departman/unvan/
 * birim/kategori/marka/... secicilerindeki ayni desenin tekrarini onlemek icin.
 * Form doldururken veriyi kaybetmemek icin daima yeni sekmede acilir.
 */
export function SettingsNavigateLink({
  tab,
  highlightKey,
  className,
  children,
}: SettingsNavigateLinkProps) {
  const query = new URLSearchParams({ tab });
  if (highlightKey) {
    query.set('highlight', highlightKey);
  }

  return (
    <Link
      to={`/settings?${query.toString()}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? 'font-semibold text-app-brand hover:underline'}
    >
      {children}
    </Link>
  );
}
