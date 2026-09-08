import { HelpCircle } from 'lucide-react';
import { Tooltip } from './tooltip';
import { tr } from '../../i18n/tr';

interface PageHelpProps {
  text: string;
}

/** G4: her sayfanin basligi yanindaki "?" ikonu - o ekranin ne ise yaradigini
 * anlatan kisa bir ipucu paneli. Mevcut Tooltip (hover+focus) ustune kurulu,
 * ayri bir popover kutuphanesi eklenmedi. */
export function PageHelp({ text }: PageHelpProps) {
  return (
    <Tooltip content={text} position="bottom-right" size="md">
      <button
        type="button"
        aria-label={tr.common.pageHelp}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-app-muted hover:text-app-brand"
      >
        <HelpCircle size={16} />
      </button>
    </Tooltip>
  );
}
