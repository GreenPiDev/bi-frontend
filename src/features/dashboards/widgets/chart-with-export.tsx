import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Download } from 'lucide-react';
import { useRef } from 'react';
import { tr } from '../../../i18n/tr';

interface ChartWithExportProps {
  option: EChartsOption;
  fileName: string;
  onEvents?: Record<string, (params: { dataIndex: number }) => void>;
  /** PDF/yazdirma goruntusunde (bkz. quote-reports-content.tsx reports-page.tsx print
   * modu) bu buton anlamsiz/gorsel curuftur - verilince tamamen render edilmez. */
  hideExportButton?: boolean;
}

/** F10: grafik widget'lari icin ortak "PNG indir" davranisi. ECharts'in kendi
 * getDataURL()'ini kullandigindan sunucuya istek atmaz (bkz. docs/VARSAYIMLAR.md). */
export function ChartWithExport({
  option,
  fileName,
  onEvents,
  hideExportButton = false,
}: ChartWithExportProps) {
  const chartRef = useRef<ReactECharts>(null);

  function downloadPng() {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.png`;
    link.click();
  }

  return (
    <div className="relative h-full w-full">
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%' }}
        notMerge
        onEvents={onEvents}
      />
      {!hideExportButton && (
        <button
          type="button"
          onClick={downloadPng}
          aria-label={tr.dashboards.widget.exportPng}
          title={tr.dashboards.widget.exportPng}
          className="absolute right-1 top-1 rounded-md bg-app-surface/90 p-1 text-app-muted hover:text-app-text"
        >
          <Download size={14} />
        </button>
      )}
    </div>
  );
}
