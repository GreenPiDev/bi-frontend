import { clsx } from 'clsx';
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface ActionsMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  variant?: 'default' | 'danger';
}

interface ActionsMenuProps {
  items: ActionsMenuItem[];
  /** Tetikleyici butonun erisilebilirlik etiketi (ör. "Not işlemleri"). */
  ariaLabel: string;
  className?: string;
  /** Tetikleyici ikon - verilmezse "uc nokta" (EllipsisVertical). */
  icon?: LucideIcon;
}

// animate-export-menu-out'un (index.css) suresiyle esit olmali.
const EXIT_ANIMATION_MS = 140;

/** Kart/satir sag-ust kosesinde "uc nokta" ikonuyla acilan genel amacli mini aksiyon
 * menusu (Duzenle/Sil gibi). export-menu-button.tsx ile ayni disari-tiklama-ile-kapat +
 * ertelemeli-cikis animasyonu desenini kullanir; secenekler `items` ile verilir. */
export function ActionsMenu({
  items,
  ariaLabel,
  className,
  icon: TriggerIcon = EllipsisVertical,
}: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function requestClose() {
    if (!isOpen) return;
    setIsClosing(true);
  }

  useEffect(() => {
    if (!isClosing) return;
    const timeoutId = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, EXIT_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isClosing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isOpen) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsClosing(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen && !isClosing}
        onClick={() => (isOpen ? requestClose() : setIsOpen(true))}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-bg-muted hover:text-app-text"
      >
        <TriggerIcon size={16} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={clsx(
            'absolute top-full right-0 z-20 mt-1 w-36 origin-top-right overflow-hidden rounded-lg border border-app-border bg-app-surface py-1 shadow-lg',
            isClosing ? 'animate-export-menu-out' : 'animate-export-menu-in',
          )}
        >
          {items.map(({ label, icon: Icon, onSelect, variant = 'default' }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                requestClose();
                onSelect();
              }}
              className={clsx(
                'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-app-bg-muted',
                variant === 'danger' ? 'text-app-danger' : 'text-app-text',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
