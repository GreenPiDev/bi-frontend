import { clsx } from 'clsx';
import { CheckCircle2, X, XCircle, Info } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastContextValue } from './toast-context';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-app-success/40 text-app-success',
  error: 'border-app-danger/40 text-app-danger',
  info: 'border-app-primary/40 text-app-primary',
};

const AUTO_DISMISS_MS = 4000;

/** İşlem (ekleme/güncelleme/silme) sonuçlarını kullanıcıya bildiren tek merkezi mekanizma.
 * Ekstra bağımlılık yok (CLAUDE.md §3 "shadcn yok, elle yazılmış bileşenler" ilkesiyle
 * tutarlı) - sabit-pozisyonlu bir portal olmadan, provider App'in en üstünde render edildiği
 * icin ekranin her yerinden erisilebilir. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, variant, message }]);
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
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = VARIANT_ICON[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={clsx(
                'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-app-surface px-4 py-3 text-sm shadow-lg',
                VARIANT_CLASSES[toast.variant],
              )}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-app-text">{toast.message}</p>
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
