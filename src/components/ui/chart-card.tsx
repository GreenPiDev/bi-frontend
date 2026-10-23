import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/** Pasta/cizgi grafik widget'lari icin ortak kart kabugu - baslangicta sadece
 * quote-charts-content.tsx'te yereldi, teklif raporlari (quote-reports-content.tsx)
 * da ayni gorsel stili kullanmak istedigi icin buraya cikarildi. */
export function ChartCard({
  title,
  children,
  className,
  headerAction,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  /** Baslikla ayni satira, sagina yerlestirilecek kucuk bir kontrol (orn. "Durum Bazli
   * Toplam Deger" grafiginin para birimi secici) - verilmezse eskisi gibi sadece baslik
   * gorunur. */
  headerAction?: ReactNode;
}) {
  return (
    <div className={clsx('border border-app-border bg-app-surface p-5', className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold tracking-wide text-app-muted uppercase">{title}</h2>
        {headerAction}
      </div>
      <div className="h-80">{children}</div>
    </div>
  );
}
