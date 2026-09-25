import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

type ModalWidth = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: ModalWidth;
}

const WIDTH_CLASSES: Record<ModalWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ title, subtitle, onClose, children, footer, width = 'md' }: ModalProps) {
  // Metin secimi icin input'ta baslayip mouse'u modal disina surukleyip birakan bir
  // kullanici, modali kapatmak istemiyor - sadece hem mousedown hem click backdrop'un
  // kendisinde basladiysa kapat (bkz. kullanici bildirimi).
  const mouseDownOnBackdrop = useRef(false);

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    mouseDownOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (mouseDownOnBackdrop.current && event.target === event.currentTarget) {
      onClose();
    }
    mouseDownOnBackdrop.current = false;
  }

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'flex max-h-[85vh] w-full flex-col rounded-xl bg-app-surface p-5 shadow-xl',
          WIDTH_CLASSES[width],
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-app-text">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-app-muted">{subtitle}</p>}
          </div>
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
