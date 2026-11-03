import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { SettingsTarget } from '../../lib/settings-targets';

interface SettingsNavigateLinkProps {
  /** Hedef `/settings` tab'i + bolum - bkz. `SETTINGS_TARGETS`. */
  target: SettingsTarget;
  className?: string;
  children: ReactNode;
}

/**
 * "X alanini tanimlamak icin ayarlara git" seklindeki, forma dokunmadan yeni
 * sekmede `/settings`e goturen linklerin ortak hali - sector/departman/unvan/
 * birim/kategori/marka/... secicilerindeki ayni desenin tekrarini onlemek icin.
 * Form doldururken veriyi kaybetmemek icin daima yeni sekmede acilir.
 */
export function SettingsNavigateLink({ target, className, children }: SettingsNavigateLinkProps) {
  const query = new URLSearchParams({ tab: target.tab, highlight: target.highlightKey });

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
