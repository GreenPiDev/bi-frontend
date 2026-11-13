import { Download, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../components/ui/toast-context';
import { Tooltip } from '../../components/ui/tooltip';
import { tr } from '../../i18n/tr';
import {
  ApiError,
  downloadQuoteItemImportTemplate,
  type QuoteItemImportResult,
  type QuoteItemImportRowError,
} from '../../lib/api';
import { downloadBlob } from '../../lib/download';
import { useImportQuoteItemsMutation } from './use-quote-imports';

interface QuoteItemsExcelImportProps {
  /** Backend kalemleri çözümleyip (gerekirse yeni ürün listesi oluşturup) döndükten
   * sonra çağrılır - satırları forma eklemek çağıranın işi. */
  onImported: (result: QuoteItemImportResult) => void;
}

const ACCEPTED_FILE_TYPES =
  '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

function extractRowErrors(error: unknown): QuoteItemImportRowError[] | null {
  if (!(error instanceof ApiError) || error.code !== 'IMPORT_ROWS_INVALID') return null;
  const details = error.details as { errors?: QuoteItemImportRowError[] } | undefined;
  return details?.errors ?? null;
}

/**
 * `/teklifler/yeni` "Ürün Listesi" kartının sağ üstündeki iki buton: sabit şablonlu
 * Excel'den teklif kalemi içe aktarma + örnek şablonu indirme. Diğer içe aktarma
 * sihirbazlarının (başlık satırı seçimi/sütun eşleme) aksine burada format katıdır -
 * bkz. bi-backend quote-item-import.format.ts, docs/VARSAYIMLAR.md V83. Sadece
 * grupsuz modda render edilir (bkz. QuoteItemLinesCard headerActions).
 */
export function QuoteItemsExcelImport({ onImported }: QuoteItemsExcelImportProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportQuoteItemsMutation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [rowErrors, setRowErrors] = useState<QuoteItemImportRowError[] | null>(null);
  const texts = tr.crm.quotes.form.excelImport;

  async function handleDownloadTemplate() {
    setIsDownloading(true);
    try {
      const blob = await downloadQuoteItemImportTemplate();
      downloadBlob(blob, texts.templateFileName);
    } catch {
      toast.error(texts.templateDownloadFailed);
    } finally {
      setIsDownloading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Aynı dosya düzeltilip tekrar seçilebilsin diye input her seferinde sıfırlanır.
    event.target.value = '';
    if (!file) return;
    importMutation.mutate(file, {
      onSuccess: (result) => {
        onImported(result);
        toast.success(
          result.productList
            ? texts.successWithNewList(
                result.items.length,
                result.createdProductCount,
                result.productList.name,
              )
            : texts.success(result.items.length),
        );
      },
      onError: (error) => {
        const errors = extractRowErrors(error);
        if (errors && errors.length > 0) {
          setRowErrors(errors);
          return;
        }
        toast.error(error instanceof ApiError ? error.message : texts.failed);
      },
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Tooltip content={texts.templateTooltip}>
          <Button
            type="button"
            variant="secondary"
            className="flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
            disabled={isDownloading}
            onClick={() => void handleDownloadTemplate()}
          >
            <Download size={14} aria-hidden="true" />
            {texts.templateButton}
          </Button>
        </Tooltip>
        <Tooltip content={texts.importTooltip}>
          <Button
            type="button"
            className="flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
            disabled={importMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} aria-hidden="true" />
            {importMutation.isPending ? texts.importing : texts.importButton}
          </Button>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {rowErrors && (
        <Modal
          title={texts.rowErrorsTitle}
          subtitle={texts.rowErrorsHint}
          onClose={() => setRowErrors(null)}
          footer={
            <Button type="button" onClick={() => setRowErrors(null)}>
              {texts.close}
            </Button>
          }
        >
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto text-sm">
            {rowErrors.map((rowError) => (
              <li key={rowError.row} className="rounded-lg border border-app-border px-3 py-2">
                <span className="font-semibold text-app-text">{texts.rowLabel(rowError.row)}</span>
                <ul className="mt-1 list-disc pl-5 text-app-danger">
                  {rowError.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}
