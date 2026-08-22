import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { exportWidgetCsv } from '../../../lib/api';
import { downloadBlob } from '../../../lib/download';
import { tr } from '../../../i18n/tr';

export function WidgetCsvExportButton({ widgetId, title }: { widgetId: string; title: string }) {
  const mutation = useMutation({
    mutationFn: () => exportWidgetCsv(widgetId),
    onSuccess: (blob) => downloadBlob(blob, `${title}.csv`),
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-label={tr.dashboards.widget.exportCsv}
      title={mutation.error ? tr.dashboards.widget.exportError : tr.dashboards.widget.exportCsv}
      className="rounded-md p-1 text-app-muted hover:text-app-text disabled:opacity-50"
    >
      <Download size={14} />
    </button>
  );
}
