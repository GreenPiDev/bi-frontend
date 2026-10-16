import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSectionHighlight } from './use-section-highlight';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  className?: string;
  /** Baska bir sayfadaki "...tanimlamak icin ayarlara git" linki `?highlight=<key>`
   * ile buraya yonlendirdiginde bu bolume scroll edip (ACMADAN) arka planini bir
   * kere mavi yanip-sondurur - bkz. `useSectionHighlight`. */
  highlightKey?: string;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  className,
  highlightKey,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { ref, className: highlightClassName } = useSectionHighlight(highlightKey);

  return (
    <div ref={ref} className={`rounded-lg bg-white ${className ?? ''} ${highlightClassName ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center gap-3 p-3 text-left hover:bg-sky-50 ${open ? 'rounded-t-lg' : 'rounded-lg'}`}
      >
        <ChevronDown
          size={18}
          className={`shrink-0 text-app-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
        <div>
          <h3 className="text-sm font-bold text-app-text">{title}</h3>
          {subtitle && <p className="text-sm text-app-muted">{subtitle}</p>}
        </div>
      </button>

      {open && <div className="rounded-b-lg px-3 pb-3">{children}</div>}
    </div>
  );
}
