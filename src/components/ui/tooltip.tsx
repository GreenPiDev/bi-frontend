import { clsx } from 'clsx';
import { useState, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Basit hover/focus tabanlı ipucu kutusu - A5 (eksik alan uyarısı) ve G4 (sayfa
 * bilgilendirmesi) icin ortak yapı taşı. Konumlandırma sabit (üstte, ortalı); karmaşık
 * flip/collision mantığı için harici bir kütüphane eklenmedi (CLAUDE.md §3). */
export function Tooltip({ content, children, className }: TooltipProps) {
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
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-xs -translate-x-1/2 rounded-lg bg-app-text px-3 py-2 text-xs text-app-surface shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
}
