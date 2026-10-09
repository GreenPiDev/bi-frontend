/** /raporlar sayfasindaki tab'lar arasinda paylasilan basit KPI karti - quote-reports-content.tsx
 * icindeki yerel KpiCard ile ayni gorsel dil, ama tiklanabilir olmasi zorunlu degil (onClick
 * opsiyonel: verilmezse duz bir bilgi karti olarak render edilir). */
export function ReportKpiCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | number | undefined;
  onClick?: () => void;
}) {
  const displayValue = value === undefined ? '—' : value;
  const className =
    'flex flex-col items-center gap-1 border border-app-border bg-app-surface p-4 text-center transition-colors' +
    (onClick ? ' cursor-pointer hover:border-app-brand hover:bg-app-bg-muted' : '');

  const content = (
    <>
      <span className="text-2xl font-bold text-app-text">{displayValue}</span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
