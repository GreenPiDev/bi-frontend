import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

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

// animate-drawer-slide-out'un (index.css) suresiyle esit olmali.
const EXIT_ANIMATION_MS = 200;

/**
 * Generic, sagdan acilan filtre/aksiyon cekmecesi - Modal ile ayni ESC/overlay-click
 * desenini kullanir, sadece konumu (fixed inset-y-0 right-0) farkli. Mesajlara ozel
 * hicbir sey bilmez - baska liste sayfalarinda da yeniden kullanilmak icin yazildi.
 * Kapanirken de acilma animasyonunun tersi yonde kayarak kaybolur - bunun icin
 * gercek `onClose` cagrisi, kapanis animasyonu bitene kadar (EXIT_ANIMATION_MS)
 * ertelenir; bu sirada bilesen hala DOM'da kalir (parent onu hemen kaldirmaz).
 */
export function Drawer({ title, onClose, children, footer, width = 'sm' }: DrawerProps) {
  const [isClosing, setIsClosing] = useState(false);

  function requestClose() {
    setIsClosing(true);
  }

  useEffect(() => {
    if (!isClosing) return;
    const timeoutId = window.setTimeout(onClose, EXIT_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isClosing, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-50 bg-black/40" onClick={requestClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'fixed top-16 right-0 bottom-0 flex w-full flex-col bg-app-surface p-5 shadow-xl',
          isClosing ? 'animate-drawer-slide-out' : 'animate-drawer-slide-in',
          WIDTH_CLASSES[width],
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-bold text-app-text">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            className="shrink-0 text-app-muted hover:text-app-text"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        {/* overflow-x'i acikca 'visible' yapmak sart: CSS spec'e gore overflow-y
            'visible' disi bir degere sahipken overflow-x belirtilmezse (varsayilan
            'visible'), tarayici overflow-x'i de otomatik olarak 'auto'ya cevirir -
            sadece `overflow-y-auto` yazmak yetmiyor. overflow-x auto olunca focus
            ring'in (box-shadow) konteynerin sag/sol kenarindan tasan kismi
            kirpiliyor, alan odaklaninca kenarlar "kesik" gorunuyordu. */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible">{children}</div>

        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
