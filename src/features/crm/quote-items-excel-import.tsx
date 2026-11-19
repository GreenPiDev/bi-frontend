import { clsx } from 'clsx';
import { ChevronDown, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../components/ui/toast-context';
import { Tooltip } from '../../components/ui/tooltip';
import { tr } from '../../i18n/tr';
import {
  ApiError,
  downloadQuoteGroupedItemImportTemplate,
  downloadQuoteItemImportTemplate,
  type QuoteItemImportResult,
  type QuoteItemImportRowError,
} from '../../lib/api';
import { downloadBlob } from '../../lib/download';
import { useImportQuoteItemsMutation } from './use-quote-imports';

interface QuoteItemsExcelImportProps {
  /** Backend'in çözümlediği satırlar - `result.format` (backend'in dosya başlıklarından
   * algıladığı şablon) gruplu mu grupsuz mu olduğunu söyler, forma yerleştirmek
   * çağıranın işi. */
  onImported: (result: QuoteItemImportResult) => void;
}

type ImportKind = 'ungrouped' | 'grouped';

const ACCEPTED_FILE_TYPES =
  '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

const SMALL_BUTTON_CLASS = 'flex items-center gap-1.5 !px-3 !py-1.5 text-xs';

function extractRowErrors(error: unknown): QuoteItemImportRowError[] | null {
  if (!(error instanceof ApiError) || error.code !== 'IMPORT_ROWS_INVALID') return null;
  const details = error.details as { errors?: QuoteItemImportRowError[] } | undefined;
  return details?.errors ?? null;
}

/**
 * `/teklifler/yeni` "Ürün Listesi" kartının sağ üstündeki Excel butonları: grupsuz
 * (fiyatlı, bkz. docs/VARSAYIMLAR.md V83) ve gruplu (fiyatsız, grup satırlı, bkz. V86)
 * iki sabit şablon için örnek indirme + içe aktarma. Format katıdır - başlık satırı
 * seçimi/sütun eşleme yok (bkz. bi-backend quote-item-import.format.ts,
 * quote-grouped-item-import.format.ts).
 */
export function QuoteItemsExcelImport({ onImported }: QuoteItemsExcelImportProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportQuoteItemsMutation();
  const [downloading, setDownloading] = useState<ImportKind | null>(null);
  const [rowErrors, setRowErrors] = useState<QuoteItemImportRowError[] | null>(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const texts = tr.crm.quotes.form.excelImport;

  // Disari tiklayinca menu kapanir - export-menu-button.tsx'teki ayni desen.
  useEffect(() => {
    if (!isTemplateMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTemplateMenuOpen]);

  async function handleDownloadTemplate(kind: ImportKind) {
    setIsTemplateMenuOpen(false);
    setDownloading(kind);
    try {
      const blob =
        kind === 'grouped'
          ? await downloadQuoteGroupedItemImportTemplate()
          : await downloadQuoteItemImportTemplate();
      downloadBlob(
        blob,
        kind === 'grouped' ? texts.groupedTemplateFileName : texts.templateFileName,
      );
    } catch {
      toast.error(texts.templateDownloadFailed);
    } finally {
      setDownloading(null);
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
        const message = result.productList
          ? texts.successWithNewList(
              result.items.length,
              result.createdProductCount,
              result.productList.name,
            )
          : texts.success(result.items.length);
        toast.success(
          result.format === 'GROUPED' ? `${message} ${texts.groupedSuccessHint}` : message,
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="relative" ref={templateMenuRef}>
          <Button
            type="button"
            variant="secondary"
            className={SMALL_BUTTON_CLASS}
            disabled={downloading !== null}
            aria-haspopup="menu"
            aria-expanded={isTemplateMenuOpen}
            onClick={() => setIsTemplateMenuOpen((open) => !open)}
          >
            <Download size={14} aria-hidden="true" />
            {texts.templateMenuButton}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={clsx('transition-transform', isTemplateMenuOpen && 'rotate-180')}
            />
          </Button>
          {isTemplateMenuOpen && (
            <div
              role="menu"
              className="animate-export-menu-in absolute top-full right-0 z-20 mt-2 w-72 origin-top-right overflow-hidden rounded-lg border border-app-border bg-app-surface py-1 shadow-lg"
            >
              {(
                [
                  ['ungrouped', texts.templateButton, texts.templateTooltip],
                  ['grouped', texts.groupedTemplateButton, texts.groupedTemplateTooltip],
                ] as const
              ).map(([kind, label, description]) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitem"
                  onClick={() => void handleDownloadTemplate(kind)}
                  className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 text-left hover:bg-app-bg-muted"
                >
                  <FileSpreadsheet size={16} className="mt-0.5 shrink-0 text-app-success" />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-app-text">{label}</span>
                    <span className="text-xs text-app-muted">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Tooltip content={texts.importTooltip}>
          <Button
            type="button"
            className={SMALL_BUTTON_CLASS}
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
