import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WidgetCsvExportButton } from './widget-csv-export-button';
import * as api from '../../../lib/api';
import * as download from '../../../lib/download';

function renderButton() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <WidgetCsvExportButton widgetId="w1" title="Toplam Ciro" />
    </QueryClientProvider>,
  );
}

describe('WidgetCsvExportButton', () => {
  it('tiklaninca CSV indirir', async () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' });
    vi.spyOn(api, 'exportWidgetCsv').mockResolvedValue(blob);
    const downloadSpy = vi.spyOn(download, 'downloadBlob').mockImplementation(() => undefined);

    renderButton();
    fireEvent.click(screen.getByLabelText('CSV indir'));

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith(blob, 'Toplam Ciro.csv');
    });
  });
});
