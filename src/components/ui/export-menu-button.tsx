import { clsx } from 'clsx';
import { FileSpreadsheet, FileText, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ExportFormat } from '../../lib/api';
import { Tooltip } from './tooltip';
import { tr } from '../../i18n/tr';

interface ExportMenuButtonProps {
  tooltip: string;
  disabled?: boolean;
  onSelect: (format: ExportFormat) => void;
}

// animate-export-menu-out'un (index.css) suresiyle esit olmali.
const EXIT_ANIMATION_MS = 140;

/** Firmalar/Kisiler/Gorusmeler listelerinin "Disa Aktar" butonu - CircleIconButton'in
 * ayni gorunumu, ama tiklaninca bir modal degil, butonun hemen altinda PDF/Excel
 * secimi sunan kucuk bir dropdown panel acar (autocomplete.tsx'teki disari-tiklama-ile-
 * kapat desenin ayni kopyasi). Acilis/kapanis, drawer.tsx'teki ertelemeli-unmount
 * deseniyle animasyonlu: kapanista panel hemen kaldirilmaz, cikis animasyonu
 * (EXIT_ANIMATION_MS) bitene kadar DOM'da kalir. */
export function ExportMenuButton({ tooltip, disabled, onSelect }: ExportMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = tr.common.exportFormatModal;

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

  function handleSelect(format: ExportFormat) {
    onSelect(format);
    requestClose();
  }

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip content={tooltip}>
        <button
          type="button"
          aria-label={tooltip}
          disabled={disabled}
          onClick={() => (isOpen ? requestClose() : setIsOpen(true))}
          className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-app-brand text-white transition-colors hover:bg-app-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload size={20} />
        </button>
      </Tooltip>

      {isOpen && (
        <div
          className={clsx(
            'absolute top-full right-0 z-20 mt-2 w-40 origin-top-right overflow-hidden rounded-lg border border-app-border bg-app-surface py-1 shadow-lg',
            isClosing ? 'animate-export-menu-out' : 'animate-export-menu-in',
          )}
        >
          <button
            type="button"
            onClick={() => handleSelect('pdf')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-app-text hover:bg-app-bg-muted"
          >
            <FileText size={16} className="text-app-danger" />
            {t.pdf}
          </button>
          <button
            type="button"
            onClick={() => handleSelect('xlsx')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-app-text hover:bg-app-bg-muted"
          >
            <FileSpreadsheet size={16} className="text-app-success" />
            {t.excel}
          </button>
        </div>
      )}
    </div>
  );
}
