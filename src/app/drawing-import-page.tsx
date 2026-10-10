import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useDrawingImportCommitMutation,
  useDrawingImportPreviewMutation,
} from '../features/crm/use-drawing-imports';
import { useDrawingPanelTemplatesQuery } from '../features/crm/use-drawing-templates';
import { useProductsQuery } from '../features/crm/use-products';
import { useQuotesQuery } from '../features/crm/use-quotes';
import {
  ApiError,
  type DrawingImportCommitGroupInput,
  type DrawingImportSuggestedLine,
  type Product,
} from '../lib/api';
import { tr } from '../i18n/tr';

const BACK_TO = '/cizim-ayarlari';

function isProductDrawable(product: Product): boolean {
  const spec = product.drawingSpec;
  return Boolean(
    spec &&
    spec.widthMm != null &&
    spec.heightMm != null &&
    spec.libraryComponentKey &&
    spec.bandKey,
  );
}

interface EditableLine extends DrawingImportSuggestedLine {
  /** Her satir icin istikrarli bir React key - API'den id gelmiyor. */
  localId: string;
}

export function DrawingImportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const quotesQuery = useQuotesQuery({ pageSize: 50 });
  const templatesQuery = useDrawingPanelTemplatesQuery();
  const productsQuery = useProductsQuery({ drawable: true, pageSize: 100 });
  const previewMutation = useDrawingImportPreviewMutation();
  const commitMutation = useDrawingImportCommitMutation();

  // Bir teklif detayindan "PDF'den Cizim Olustur" ile gelindiyse (Faz D7, bkz.
  // docs/VARSAYIMLAR.md V55) teklif onceden secili gelir - kullanici hala degistirebilir.
  const [quoteId, setQuoteId] = useState(searchParams.get('quoteId') ?? '');
  const [templateId, setTemplateId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lines, setLines] = useState<EditableLine[] | null>(null);

  const drawableProducts = (productsQuery.data?.data ?? []).filter(isProductDrawable);

  const handlePreview = () => {
    if (!quoteId || !file) return;
    previewMutation.mutate(
      { quoteId, file },
      {
        onSuccess: (response) => {
          setLines(
            response.lines.map((line, index) => ({
              ...line,
              localId: `line-${index}`,
            })),
          );
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  };

  const updateLine = (localId: string, patch: Partial<EditableLine>) => {
    setLines(
      (prev) =>
        prev?.map((line) => (line.localId === localId ? { ...line, ...patch } : line)) ?? null,
    );
  };

  const removeLine = (localId: string) => {
    setLines((prev) => prev?.filter((line) => line.localId !== localId) ?? null);
  };

  const handleCommit = () => {
    if (!lines || !templateId) return;
    const committable = lines.filter((line) => line.productId && line.quantity > 0);
    const groupsByLabel = new Map<string, DrawingImportCommitGroupInput>();
    for (const line of committable) {
      const existing = groupsByLabel.get(line.panelGroupLabel);
      const item = { productId: line.productId!, quantity: line.quantity };
      if (existing) {
        existing.items.push(item);
      } else {
        groupsByLabel.set(line.panelGroupLabel, {
          panelGroupLabel: line.panelGroupLabel,
          name: line.panelGroupLabel,
          items: [item],
        });
      }
    }
    const groups = Array.from(groupsByLabel.values());
    if (groups.length === 0) {
      toast.error(tr.crm.drawingImports.noLinesHint);
      return;
    }
    commitMutation.mutate(
      { quoteId, templateId, groups },
      {
        onSuccess: (drawings) => {
          toast.success(tr.crm.drawingImports.commitSuccess);
          navigate(drawings.length === 1 ? `/cizimler/${drawings[0].id}` : BACK_TO);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  };

  const previewErrorMessage =
    previewMutation.error instanceof ApiError ? previewMutation.error.message : undefined;
  const commitErrorMessage =
    commitMutation.error instanceof ApiError ? commitMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={BACK_TO} label={tr.crm.drawingImports.backLabel} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.drawingImports.title}</h1>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.drawingImports.subtitle}</p>

        {!lines && (
          <div className="mt-6 flex flex-col gap-4">
            <FormError message={previewErrorMessage} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label={tr.crm.drawingImports.quoteLabel}
                placeholder={tr.crm.drawingImports.quotePlaceholder}
                options={(quotesQuery.data?.data ?? []).map((q) => ({
                  value: q.id,
                  label: `${q.quoteNumber} — ${q.account.name}`,
                }))}
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
              />
              <Select
                label={tr.crm.drawingImports.templateLabel}
                placeholder={tr.crm.drawingImports.templatePlaceholder}
                options={(templatesQuery.data ?? []).map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              />
            </div>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-app-text">
                {tr.crm.drawingImports.fileLabel}
              </label>
              <input
                type="file"
                accept="application/pdf"
                className="mt-1 block w-full text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Button
                type="button"
                disabled={!quoteId || !templateId || !file || previewMutation.isPending}
                onClick={handlePreview}
              >
                {previewMutation.isPending
                  ? tr.crm.drawingImports.previewing
                  : tr.crm.drawingImports.previewButton}
              </Button>
            </div>
          </div>
        )}

        {lines && (
          <div className="mt-6 flex flex-col gap-4">
            <FormError message={commitErrorMessage} />
            <p className="text-sm text-app-muted">{tr.crm.drawingImports.reviewInstructions}</p>

            <div className="overflow-x-auto rounded-lg border border-app-border">
              <table className="w-full text-sm">
                <thead className="bg-app-surface-muted text-left text-xs font-semibold text-app-muted">
                  <tr>
                    <th className="px-3 py-2">{tr.crm.drawingImports.rawLineHeader}</th>
                    <th className="px-3 py-2">{tr.crm.drawingImports.panelGroupHeader}</th>
                    <th className="px-3 py-2">{tr.crm.drawingImports.productHeader}</th>
                    <th className="px-3 py-2">{tr.crm.drawingImports.quantityHeader}</th>
                    <th className="px-3 py-2">{tr.crm.drawingImports.confidenceHeader}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr
                      key={line.localId}
                      className={
                        line.needsReview || !line.productId
                          ? 'bg-amber-50 dark:bg-amber-950/30'
                          : undefined
                      }
                    >
                      <td className="max-w-xs px-3 py-2 text-app-muted">{line.rawLine}</td>
                      <td className="px-3 py-2">
                        <TextField
                          label=""
                          value={line.panelGroupLabel}
                          onChange={(e) =>
                            updateLine(line.localId, { panelGroupLabel: e.target.value })
                          }
                        />
                      </td>
                      <td className="min-w-[14rem] px-3 py-2">
                        <Select
                          label=""
                          placeholder={tr.crm.drawingImports.productPlaceholder}
                          options={drawableProducts.map((p) => ({ value: p.id, label: p.name }))}
                          value={line.productId ?? ''}
                          onChange={(e) =>
                            updateLine(line.localId, {
                              productId: e.target.value || null,
                              productName:
                                drawableProducts.find((p) => p.id === e.target.value)?.name ?? null,
                            })
                          }
                        />
                      </td>
                      <td className="w-20 px-3 py-2">
                        <TextField
                          label=""
                          type="text"
                          inputMode="numeric"
                          value={String(line.quantity)}
                          onChange={(e) =>
                            updateLine(line.localId, {
                              quantity: Number(e.target.value.replace(/[^0-9]/g, '')) || 1,
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        {line.needsReview ? (
                          <Badge variant="warning">{tr.crm.drawingImports.needsReviewBadge}</Badge>
                        ) : (
                          <span className="text-xs text-app-muted">
                            {Math.round(line.confidence * 100)}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <IconActionButton
                          icon={Trash2}
                          tooltip={tr.crm.drawingImports.removeLineTooltip}
                          variant="danger"
                          onClick={() => removeLine(line.localId)}
                        />
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-sm text-app-muted">
                        {tr.crm.drawingImports.noLinesHint}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                disabled={lines.length === 0 || commitMutation.isPending}
                onClick={handleCommit}
              >
                {commitMutation.isPending
                  ? tr.crm.drawingImports.committing
                  : tr.crm.drawingImports.commitButton}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setLines(null)}>
                {tr.crm.drawingImports.backToUpload}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
