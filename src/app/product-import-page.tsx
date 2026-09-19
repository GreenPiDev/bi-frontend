import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import {
  usePreviewProductImportMappedMutation,
  usePreviewProductImportRawMutation,
  useRunProductImportMutation,
} from '../features/crm/use-product-imports';
import { ApiError, type NumberFormat, type ProductImportResult } from '../lib/api';
import { tr } from '../i18n/tr';

type Assignment = 'ignore' | 'attribute' | string;

const TARGET_FIELDS = Object.keys(
  tr.crm.productImports.fieldLabels,
) as (keyof typeof tr.crm.productImports.fieldLabels)[];

export function ProductImportPage() {
  const { id: productListId } = useParams();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<string[][] | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[] | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('tr');
  const [result, setResult] = useState<ProductImportResult | null>(null);

  const rawPreviewMutation = usePreviewProductImportRawMutation();
  const mappedPreviewMutation = usePreviewProductImportMappedMutation();
  const runMutation = useRunProductImportMutation(productListId ?? '');

  function handleUpload() {
    if (!file) {
      return;
    }
    rawPreviewMutation.mutate(file, {
      onSuccess: (data) => setRawRows(data.rows),
    });
  }

  function handlePickHeaderRow(index: number) {
    if (!file) {
      return;
    }
    mappedPreviewMutation.mutate(
      { file, headerRowIndex: index },
      {
        onSuccess: (data) => {
          setHeaderRowIndex(index);
          setHeaders(data.headers);
          setSampleRows(data.sampleRows);
          setAssignments({});
        },
      },
    );
  }

  function handleChangeHeaderRow() {
    setHeaderRowIndex(null);
    setHeaders(null);
    setSampleRows(null);
    setAssignments({});
  }

  const nameIsMapped = Object.values(assignments).includes('name');

  function handleImport() {
    if (!file || headerRowIndex === null || !nameIsMapped) {
      return;
    }
    const mapping: Record<string, string> = {};
    const attributeColumns: string[] = [];
    for (const [column, assignment] of Object.entries(assignments)) {
      if (assignment === 'ignore') {
        continue;
      }
      if (assignment === 'attribute') {
        attributeColumns.push(column);
      } else {
        mapping[assignment] = column;
      }
    }
    runMutation.mutate(
      { file, headerRowIndex, mapping, attributeColumns, numberFormat },
      { onSuccess: (data) => setResult(data) },
    );
  }

  const uploadError =
    rawPreviewMutation.error instanceof ApiError ? rawPreviewMutation.error.message : undefined;
  const headerRowError =
    mappedPreviewMutation.error instanceof ApiError
      ? mappedPreviewMutation.error.message
      : undefined;
  const importError = runMutation.error instanceof ApiError ? runMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink
        to={`/urun-listeleri/${productListId}/duzenle`}
        label={tr.crm.productImports.back}
      />

      <div className="mx-auto mt-6 max-w-3xl p-8">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-app-text">{tr.crm.productImports.title}</h1>
          <PageHelp text={tr.help.productImports} />
        </div>

        {!rawRows && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.productImports.stepUpload}</h2>
            <div className="mt-3 flex flex-col gap-3">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
              />
              <FormError message={uploadError} />
              <Button
                type="button"
                disabled={!file || rawPreviewMutation.isPending}
                onClick={handleUpload}
              >
                {rawPreviewMutation.isPending
                  ? tr.crm.productImports.uploading
                  : tr.crm.productImports.uploadButton}
              </Button>
            </div>
          </div>
        )}

        {rawRows && headerRowIndex === null && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.productImports.stepUpload}</h2>
            <p className="mt-1 text-sm text-app-muted">
              {tr.crm.productImports.rawPreviewInstructions}
            </p>
            <FormError message={headerRowError} />
            <div className="mt-3 overflow-x-auto rounded-lg border border-app-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <tbody>
                  {rawRows.map((row, index) => (
                    <tr key={index} className="border-t border-app-border first:border-t-0">
                      <td className="w-40 py-2 pl-3 pr-2 align-top">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={mappedPreviewMutation.isPending}
                          onClick={() => handlePickHeaderRow(index)}
                        >
                          {tr.crm.productImports.pickHeaderRowButton}
                        </Button>
                      </td>
                      <td className="py-2 pr-3 align-top text-app-text">{row.join(' | ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setFile(null);
                setRawRows(null);
              }}
            >
              {tr.crm.productImports.changeFileButton}
            </Button>
          </div>
        )}

        {headers && headerRowIndex !== null && !result && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.productImports.stepMap}</h2>
            <p className="mt-1 text-sm text-app-muted">{tr.crm.productImports.mapInstructions}</p>

            <div className="mt-4 max-w-xs">
              <Select
                label={tr.crm.productImports.numberFormatLabel}
                value={numberFormat}
                onChange={(event) => setNumberFormat(event.target.value as NumberFormat)}
                options={[
                  { value: 'tr', label: tr.crm.productImports.numberFormatTr },
                  { value: 'en', label: tr.crm.productImports.numberFormatEn },
                ]}
              />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase text-app-muted">
                  <tr>
                    <th className="w-56 py-2 pr-3">{tr.crm.productImports.columnHeader}</th>
                    <th className="w-48 py-2 pr-3">{tr.crm.productImports.sampleValueLabel}</th>
                    <th className="w-56 py-2 pr-3">{tr.crm.productImports.assignmentHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((column) => (
                    <tr key={column} className="border-t border-app-border">
                      <td className="py-2 pr-3 align-top font-semibold text-app-text">{column}</td>
                      <td className="py-2 pr-3 align-top text-app-muted">
                        {sampleRows?.[0]?.[column] ?? '—'}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <select
                          value={assignments[column] ?? 'ignore'}
                          onChange={(event) =>
                            setAssignments((prev) => ({ ...prev, [column]: event.target.value }))
                          }
                          className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                        >
                          <option value="ignore">{tr.crm.productImports.assignmentIgnore}</option>
                          <option value="attribute">
                            {tr.crm.productImports.assignmentAttribute}
                          </option>
                          {TARGET_FIELDS.map((field) => (
                            <option key={field} value={field}>
                              {tr.crm.productImports.fieldLabels[field]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!nameIsMapped && (
              <p className="mt-3 text-sm text-app-danger">
                {tr.crm.productImports.nameRequiredError}
              </p>
            )}
            <FormError message={importError} />
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                disabled={!nameIsMapped || runMutation.isPending}
                onClick={handleImport}
              >
                {runMutation.isPending
                  ? tr.crm.productImports.importing
                  : tr.crm.productImports.importButton}
              </Button>
              <Button type="button" variant="secondary" onClick={handleChangeHeaderRow}>
                {tr.crm.productImports.changeHeaderRowButton}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.productImports.stepResult}</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.totalRows}</p>
                <p className="text-xs text-app-muted">{tr.crm.productImports.totalRowsLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.imported}</p>
                <p className="text-xs text-app-muted">{tr.crm.productImports.importedLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.errors.length}</p>
                <p className="text-xs text-app-muted">{tr.crm.productImports.errorsLabel}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-4 flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-app-danger">
                {result.errors.map((error) => (
                  <li key={error.row}>
                    {tr.crm.productImports.rowErrorPrefix} {error.row}: {error.messages.join(', ')}
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              className="mt-4"
              onClick={() => navigate(`/urun-listeleri/${productListId}/duzenle`)}
            >
              {tr.crm.productImports.done}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
