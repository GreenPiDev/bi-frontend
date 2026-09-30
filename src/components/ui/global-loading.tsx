import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { tr } from '../../i18n/tr';
import { GlobalLoadingContext, type GlobalLoadingContextValue } from './global-loading-context';

/** Tüm ekranı kaplayan, iş bitene kadar kullanıcı etkileşimini engelleyen yükleniyor katmanı.
 * Sayaç bazlı: iç içe/eş zamanlı show() çağrıları tek bir hide() ile erken kapanmaz. */
export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const activeCount = useRef(0);

  const show = useCallback((customMessage?: string) => {
    activeCount.current += 1;
    setMessage(customMessage ?? tr.common.loading);
  }, []);

  const hide = useCallback(() => {
    activeCount.current = Math.max(activeCount.current - 1, 0);
    if (activeCount.current === 0) {
      setMessage(null);
    }
  }, []);

  const value = useMemo<GlobalLoadingContextValue>(() => ({ show, hide }), [show, hide]);

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
      {message !== null ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-[2px]"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
          <p className="text-sm font-medium text-white">{message}</p>
        </div>
      ) : null}
    </GlobalLoadingContext.Provider>
  );
}
