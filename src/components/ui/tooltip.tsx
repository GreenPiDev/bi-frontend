import { clsx } from 'clsx';
import { useState, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  /** 'top' (varsayılan): tetikleyicinin üstünde, ortalı. 'bottom-right': tetikleyicinin
   * sağ altında - G4 (sayfa bilgilendirmesi) icin. */
  position?: 'top' | 'bottom-right';
  /** 'sm' (varsayılan, mevcut kullanımlar) | 'md': daha büyük yazı - G4 icin. */
  size?: 'sm' | 'md';
}

const POSITION_CLASSES: Record<NonNullable<TooltipProps['position']>, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  'bottom-right': 'top-full left-0 mt-2',
};

const SIZE_CLASSES: Record<NonNullable<TooltipProps['size']>, string> = {
  sm: 'text-xs px-3 py-2',
  md: 'text-sm px-3.5 py-2.5',
};

/** Basit hover/focus tabanlı ipucu kutusu - A5 (eksik alan uyarısı) ve G4 (sayfa
 * bilgilendirmesi) icin ortak yapı taşı. Konumlandırma `position` ile secilebilir iki
 * sabit varyanttan biri; karmaşık flip/collision mantığı için harici bir kütüphane
 * eklenmedi (CLAUDE.md §3). */
export function Tooltip({
  content,
  children,
  className,
  position = 'top',
  size = 'sm',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={clsx('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={clsx(
            'animate-tooltip-pop pointer-events-none absolute z-20 w-max max-w-xs rounded-lg bg-app-text text-app-surface shadow-lg',
            POSITION_CLASSES[position],
            SIZE_CLASSES[size],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
