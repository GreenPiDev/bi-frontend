import type { ReactNode } from 'react';

/** Pasta/cizgi grafik widget'lari icin ortak kart kabugu - baslangicta sadece
 * quote-charts-content.tsx'te yereldi, teklif raporlari (quote-reports-content.tsx)
 * da ayni gorsel stili kullanmak istedigi icin buraya cikarildi. */
export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-app-border bg-app-surface p-5">
      <h2 className="mb-4 text-[11px] font-bold tracking-wide text-app-muted uppercase">{title}</h2>
      <div className="h-80">{children}</div>
    </div>
  );
}
