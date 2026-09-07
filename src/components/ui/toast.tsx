import { clsx } from 'clsx';
import { CheckCircle2, X, XCircle, Info } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastContextValue } from './toast-context';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  leaving: boolean;
}

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

/** accent: karti sol kenar seridi, glow: kart etrafindaki renkli isima golgesi. */
const VARIANT_CLASSES: Record<ToastVariant, { accent: string; icon: string; glow: string }> = {
  success: {
    accent: 'bg-app-success',
    icon: 'text-app-success',
    glow: 'shadow-app-success/25',
  },
  error: {
    accent: 'bg-app-danger',
    icon: 'text-app-danger',
    glow: 'shadow-app-danger/25',
  },
  info: {
    accent: 'bg-app-primary',
    icon: 'text-app-primary',
    glow: 'shadow-app-primary/25',
  },
};

const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 280;

/** İşlem (ekleme/güncelleme/silme) sonuçlarını kullanıcıya bildiren tek merkezi mekanizma.
 * Ekstra bağımlılık yok (CLAUDE.md §3 "shadcn yok, elle yazılmış bileşenler" ilkesiyle
 * tutarlı) - sabit-pozisyonlu bir portal olmadan, provider App'in en üstünde render edildiği
 * icin ekranin her yerinden erisilebilir. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  // Anında listeden çıkarmak yerine önce "leaving" isaretleniyor (cikis animasyonunun
  // oynayabilmesi icin), gercek kaldirma cikis suresi kadar gecikmeli yapiliyor.
  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
      );
      window.setTimeout(() => remove(id), EXIT_ANIMATION_MS);
    },
    [remove],
  );

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, variant, message, leaving: false }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = VARIANT_ICON[toast.variant];
          const styles = VARIANT_CLASSES[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={clsx(
                'pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl',
                'border border-app-border bg-app-surface/90 px-4 py-3.5 text-sm shadow-xl backdrop-blur-md',
                styles.glow,
                toast.leaving ? 'animate-toast-out' : 'animate-toast-in',
              )}
            >
              <span className={clsx('absolute inset-y-0 left-0 w-1', styles.accent)} />
              <Icon size={19} className={clsx('mt-0.5 shrink-0', styles.icon)} />
              <p className="flex-1 font-medium text-app-text">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-app-muted hover:text-app-text"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
