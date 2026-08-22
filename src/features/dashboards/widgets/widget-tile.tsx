import type { ReactNode } from 'react';

interface WidgetTileProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function WidgetTile({ title, children, actions }: WidgetTileProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface">
      <div className="flex items-center justify-between gap-2 border-b border-app-border px-3 py-2">
        <span className="truncate text-sm font-semibold text-app-text">{title}</span>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      <div className="min-h-0 flex-1 p-2">{children}</div>
    </div>
  );
}
