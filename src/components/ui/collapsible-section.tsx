import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-white p-3 text-left hover:bg-sky-50"
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

      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
