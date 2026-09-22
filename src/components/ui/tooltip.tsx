import { clsx } from 'clsx';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  /** 'top' (varsayılan): tetikleyicinin üstünde, ortalı. 'bottom-right': tetikleyicinin
   * sağ altında - G4 (sayfa bilgilendirmesi) icin. Ikisi de sadece *tercih*; ekrana
   * sığmıyorsa computePosition ters yöne çevirir/kenara yaslar. */
  position?: 'top' | 'bottom-right';
  /** 'sm' (varsayılan, mevcut kullanımlar) | 'md': daha büyük yazı - G4 icin. */
  size?: 'sm' | 'md';
}

const SIZE_CLASSES: Record<NonNullable<TooltipProps['size']>, string> = {
  sm: 'text-xs px-3 py-2',
  md: 'text-sm px-3.5 py-2.5',
};

const VIEWPORT_MARGIN = 8;

interface ComputedPosition {
  top: number;
  left: number;
}

/** Tetikleyicinin ve balonun *gerçek* (ölçülmüş) boyutlarına göre konum hesaplar: önce
 * tercih edilen tarafa yerleştirir, sığmıyorsa ters tarafa çevirir (flip), o da
 * sığmıyorsa ekran kenarına yaslar (clamp) - böylece balon hiçbir zaman viewport dışına
 * taşmaz. Karmaşık collision kütüphanesi yerine (CLAUDE.md §3) bu basit hesap yeterli. */
function computePosition(
  triggerRect: DOMRect,
  bubbleRect: DOMRect,
  position: NonNullable<TooltipProps['position']>,
): ComputedPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top: number;
  let left: number;

  if (position === 'bottom-right') {
    left = triggerRect.left;
    top = triggerRect.bottom + VIEWPORT_MARGIN;
    if (top + bubbleRect.height > viewportHeight - VIEWPORT_MARGIN) {
      top = triggerRect.top - bubbleRect.height - VIEWPORT_MARGIN;
    }
    // Sağa taşıyorsa viewport kenarına değil, tetikleyicinin sağ kenarına yasla - bu
    // yüzden balon her zaman tetikleyiciye yakın kalır (ör. sabit sol sidebar'ın üzerine
    // düşmez).
    if (left + bubbleRect.width > viewportWidth - VIEWPORT_MARGIN) {
      left = triggerRect.right - bubbleRect.width;
    }
  } else {
    left = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
    top = triggerRect.top - bubbleRect.height - VIEWPORT_MARGIN;
    if (top < VIEWPORT_MARGIN) {
      top = triggerRect.bottom + VIEWPORT_MARGIN;
    }
    // Ortalamak balonu sola taşırıyorsa tetikleyicinin sol kenarına, sağa taşırıyorsa
    // sağ kenarına yasla - viewport kenarına (ör. sabit sidebar'ın üzerine) değil.
    if (left < VIEWPORT_MARGIN) {
      left = triggerRect.left;
    } else if (left + bubbleRect.width > viewportWidth - VIEWPORT_MARGIN) {
      left = triggerRect.right - bubbleRect.width;
    }
  }

  left = Math.min(
    Math.max(left, VIEWPORT_MARGIN),
    viewportWidth - bubbleRect.width - VIEWPORT_MARGIN,
  );
  top = Math.min(
    Math.max(top, VIEWPORT_MARGIN),
    viewportHeight - bubbleRect.height - VIEWPORT_MARGIN,
  );

  return { top, left };
}

/** Basit hover/focus tabanlı ipucu kutusu - A5 (eksik alan uyarısı) ve G4 (sayfa
 * bilgilendirmesi) icin ortak yapı taşı. İçerik `document.body`'ye portal ile render
 * edilir - aksi halde `overflow-hidden` uygulayan bir ata (ör. `Table` gövdesi) baloncuğu
 * kırpar. Konum, `useLayoutEffect` içinde balon DOM'a yazıldıktan hemen sonra, tarayıcı
 * boyamadan önce ölçülüp hesaplanır - bu yüzden yanlış konumda görünüp zıplama olmaz. */
export function Tooltip({
  content,
  children,
  className,
  position = 'top',
  size = 'sm',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [computed, setComputed] = useState<ComputedPosition | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !bubbleRef.current) return;
    setComputed(
      computePosition(
        triggerRef.current.getBoundingClientRect(),
        bubbleRef.current.getBoundingClientRect(),
        position,
      ),
    );
  }, [visible, position]);

  function hide() {
    setVisible(false);
    setComputed(null);
  }

  return (
    <span
      ref={triggerRef}
      className={clsx('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={hide}
      onFocus={() => setVisible(true)}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <span
            ref={bubbleRef}
            role="tooltip"
            className={clsx(
              'animate-tooltip-pop pointer-events-none fixed z-[110] w-max max-w-xs rounded-lg bg-app-text text-app-surface shadow-lg',
              SIZE_CLASSES[size],
              !computed && 'invisible',
            )}
            style={{ top: computed?.top ?? 0, left: computed?.left ?? 0 }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
