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

/** Firmalar/Kisiler listelerinin "Disa Aktar" butonu - CircleIconButton'in ayni
 * gorunumu, ama tiklaninca bir modal degil, butonun hemen altinda PDF/Excel secimi
 * sunan kucuk bir dropdown panel acar (autocomplete.tsx'teki disari-tiklama-ile-kapat
 * desenin ayni kopyasi). */
export function ExportMenuButton({ tooltip, disabled, onSelect }: ExportMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = tr.common.exportFormatModal;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(format: ExportFormat) {
    setOpen(false);
    onSelect(format);
  }

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip content={tooltip}>
        <button
          type="button"
          aria-label={tooltip}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            'relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-[#1a2440] text-white transition-colors hover:bg-[#141c33] disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <Upload size={20} />
        </button>
      </Tooltip>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-36 overflow-hidden rounded-lg border border-app-border bg-app-surface py-1 shadow-lg">
          <button
            type="button"
            onClick={() => handleSelect('pdf')}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text hover:bg-app-bg-muted"
          >
            <FileText size={16} />
            {t.pdf}
          </button>
          <button
            type="button"
            onClick={() => handleSelect('xlsx')}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text hover:bg-app-bg-muted"
          >
            <FileSpreadsheet size={16} />
            {t.excel}
          </button>
        </div>
      )}
    </div>
  );
}
