import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

type DrawerWidth = 'sm' | 'md' | 'lg';

interface DrawerProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: DrawerWidth;
}

const WIDTH_CLASSES: Record<DrawerWidth, string> = {
  sm: 'max-w-xs',
  md: 'max-w-sm',
  lg: 'max-w-md',
};

/**
 * Generic, sagdan acilan filtre/aksiyon cekmecesi - Modal ile ayni ESC/overlay-click
 * desenini kullanir, sadece konumu (fixed inset-y-0 right-0) farkli. Mesajlara ozel
 * hicbir sey bilmez - baska liste sayfalarinda da yeniden kullanilmak icin yazildi.
 */
export function Drawer({ title, onClose, children, footer, width = 'sm' }: DrawerProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'fixed inset-y-0 right-0 flex h-full w-full flex-col bg-app-surface p-5 shadow-xl',
          WIDTH_CLASSES[width],
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-bold text-app-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-app-muted hover:text-app-text"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">{children}</div>

        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
