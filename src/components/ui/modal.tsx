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
  /**
   * Varsayilan (false): dialog yuksekligi `85vh` ile sinirli, tasan icerik dialog'un kendi
   * ic scroll'uyla (overflow-auto) gorulur. true: bu ust sinir kaldirilir, icerik sigarsa
   * dialog normalde oldugu gibi ortalanir; sigmiyorsa (ornegin `MultiSelect`'in
   * `menuPosition="absolute"` dropdown'u tastiginda) dialog kendi icerigi kadar buyur ve
   * tasan kisim, arka plandaki sayfanin/backdrop'un kendisi kaydirilarak gorulur (ic
   * scroll yerine sayfa scroll'u). Icinde `absolute` konumlu bir dropdown/MultiSelect
   * barindiran formlarda kullan.
   */
  allowPageScroll?: boolean;
}

const WIDTH_CLASSES: Record<ModalWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'md',
  allowPageScroll = false,
}: ModalProps) {
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

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={clsx(
        'flex w-full flex-col rounded-xl bg-app-surface p-5 shadow-xl',
        !allowPageScroll && 'max-h-[85vh]',
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

      <div className={clsx('flex-1 min-h-0', !allowPageScroll && 'overflow-auto')}>{children}</div>

      {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
    </div>
  );

  if (allowPageScroll) {
    // Klasik "ortalanmis ama tasarsa sayfa kaydirilabilir" deseni: backdrop kendisi
    // kaydirilabilir, icindeki wrapper `min-h-full` ile en az viewport kadar yuksek -
    // icerik sigarsa flex-center normal modaldaki gibi ortalar, sigmiyorsa (ornegin
    // MultiSelect'in `absolute` konumlu dropdown'u tastiginda) wrapper icerik kadar
    // buyur ve ust kenar viewport disina itilmeden, sayfa/backdrop kaydirilarak
    // tamami gorulebilir (bkz. kullanici bildirimi).
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
        <div
          className="flex min-h-full items-center justify-center p-4 py-8"
          onMouseDown={handleBackdropMouseDown}
          onClick={handleBackdropClick}
        >
          {dialog}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      {dialog}
    </div>
  );
}
