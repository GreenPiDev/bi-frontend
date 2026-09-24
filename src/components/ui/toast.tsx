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

/** bg: kartin islem turune gore gradyanli arkaplani, glow: kart etrafindaki renkli isima golgesi. */
const VARIANT_CLASSES: Record<ToastVariant, { bg: string; glow: string }> = {
  success: {
    bg: 'bg-gradient-to-r from-[color-mix(in_srgb,var(--color-success)_78%,black)] via-[color-mix(in_srgb,var(--color-success)_78%,black)] via-60% to-black',
    glow: 'shadow-app-success/35',
  },
  error: {
    bg: 'bg-gradient-to-r from-[color-mix(in_srgb,var(--color-danger)_78%,black)] via-[color-mix(in_srgb,var(--color-danger)_78%,black)] via-60% to-black',
    glow: 'shadow-app-danger/35',
  },
  info: {
    bg: 'bg-gradient-to-r from-[color-mix(in_srgb,var(--color-primary)_78%,black)] via-[color-mix(in_srgb,var(--color-primary)_78%,black)] via-60% to-black',
    glow: 'shadow-app-primary/35',
  },
};

const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 280;

interface TimerState {
  timeoutId: number;
  startedAt: number;
  remaining: number;
}

/** İşlem (ekleme/güncelleme/silme) sonuçlarını kullanıcıya bildiren tek merkezi mekanizma.
 * Ekstra bağımlılık yok (CLAUDE.md §3 "shadcn yok, elle yazılmış bileşenler" ilkesiyle
 * tutarlı) - sabit-pozisyonlu bir portal olmadan, provider App'in en üstünde render edildiği
 * icin ekranin her yerinden erisilebilir. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  // id -> otomatik kapanma zamanlayicisinin durumu (hover'da durdurup kaldigi yerden devam etmek icin).
  const timers = useRef(new Map<number, TimerState>());

  // Anında listeden çıkarmak yerine önce "leaving" isaretleniyor (cikis animasyonunun
  // oynayabilmesi icin), gercek kaldirma cikis suresi kadar gecikmeli yapiliyor.
  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      const timer = timers.current.get(id);
      if (timer) {
        window.clearTimeout(timer.timeoutId);
        timers.current.delete(id);
      }
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
      );
      window.setTimeout(() => remove(id), EXIT_ANIMATION_MS);
    },
    [remove],
  );

  const startTimer = useCallback(
    (id: number, delay: number) => {
      const timeoutId = window.setTimeout(() => dismiss(id), delay);
      timers.current.set(id, { timeoutId, startedAt: Date.now(), remaining: delay });
    },
    [dismiss],
  );

  const pauseTimer = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    const elapsed = Date.now() - timer.startedAt;
    timers.current.set(id, {
      ...timer,
      remaining: Math.max(timer.remaining - elapsed, 0),
    });
  }, []);

  const resumeTimer = useCallback(
    (id: number) => {
      const timer = timers.current.get(id);
      if (!timer) return;
      startTimer(id, timer.remaining);
    },
    [startTimer],
  );

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, variant, message, leaving: false }]);
      startTimer(id, AUTO_DISMISS_MS);
    },
    [startTimer],
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
      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = VARIANT_ICON[toast.variant];
          const styles = VARIANT_CLASSES[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              onMouseEnter={() => pauseTimer(toast.id)}
              onMouseLeave={() => resumeTimer(toast.id)}
              className={clsx(
                'group pointer-events-auto relative flex min-h-[4.5rem] items-center gap-3 overflow-hidden rounded-md',
                'px-4 py-5 pr-9 text-sm text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm',
                styles.bg,
                styles.glow,
                toast.leaving ? 'animate-toast-out' : 'animate-toast-in',
              )}
            >
              <Icon
                size={96}
                strokeWidth={1.5}
                className="pointer-events-none absolute -left-5 top-1/2 -translate-y-1/2 text-white/15"
              />
              <p className="relative z-10 flex-1 pl-2 font-medium text-white">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="absolute right-2 top-2 shrink-0 text-white/80 transition-transform hover:scale-125 hover:text-white"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-black/15">
                <span
                  className="block h-full origin-left bg-white/70 [animation-fill-mode:forwards] group-hover:[animation-play-state:paused]"
                  style={{
                    animationName: toast.leaving ? 'none' : 'toast-progress',
                    animationDuration: `${AUTO_DISMISS_MS}ms`,
                    animationTimingFunction: 'linear',
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
