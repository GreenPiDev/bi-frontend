import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FileDropzone } from '../components/ui/file-dropzone';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { SampleTemplateNote } from '../components/ui/sample-template-note';
import { Select } from '../components/ui/select';
import {
  usePreviewQuoteImportMappedMutation,
  usePreviewQuoteImportRawMutation,
  useRunQuoteImportMutation,
} from '../features/crm/use-quote-imports';
import { ApiError, type NumberFormat, type QuoteImportResult } from '../lib/api';
import { tr } from '../i18n/tr';

type Assignment = 'ignore' | 'attribute' | string;

const TARGET_FIELDS = Object.keys(
  tr.crm.quoteImports.fieldLabels,
) as (keyof typeof tr.crm.quoteImports.fieldLabels)[];

const REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  'accountName',
  'quoteNumber',
  'quoteDate',
  'subtotal',
]);

const REQUIRED_TARGET_FIELDS: (keyof typeof tr.crm.quoteImports.fieldLabels)[] = [
  'accountName',
  'quoteNumber',
  'quoteDate',
  'subtotal',
];

export function QuoteImportPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<string[][] | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[] | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('tr');
  const [result, setResult] = useState<QuoteImportResult | null>(null);

  const rawPreviewMutation = usePreviewQuoteImportRawMutation();
  const mappedPreviewMutation = usePreviewQuoteImportMappedMutation();
  const runMutation = useRunQuoteImportMutation();

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

  const mappedFields = new Set(Object.values(assignments));
  const requiredFieldsMapped = REQUIRED_TARGET_FIELDS.every((field) => mappedFields.has(field));

  function handleImport() {
    if (!file || headerRowIndex === null || !requiredFieldsMapped) {
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
      <BackLink to="/teklifler" label={tr.crm.quoteImports.back} />

      <div className="mx-auto mt-6 max-w-3xl p-8">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-app-text">{tr.crm.quoteImports.title}</h1>
          <PageHelp text={tr.help.quoteImports} />
        </div>

        {!rawRows && (
          <SampleTemplateNote
            href="/sample-templates/ornek-teklif.xlsx"
            fileName="ornek-teklif.xlsx"
          />
        )}

        {!rawRows && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.quoteImports.stepUpload}</h2>
            <div className="mt-3 flex flex-col gap-3">
              <FileDropzone
                file={file}
                onFileSelect={setFile}
                accept=".csv,.xlsx"
                disabled={rawPreviewMutation.isPending}
              />
              <FormError message={uploadError} />
              <Button
                type="button"
                disabled={!file || rawPreviewMutation.isPending}
                onClick={handleUpload}
              >
                {rawPreviewMutation.isPending
                  ? tr.crm.quoteImports.uploading
                  : tr.crm.quoteImports.uploadButton}
              </Button>
            </div>
          </div>
        )}

        {rawRows && headerRowIndex === null && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.quoteImports.stepUpload}</h2>
            <p className="mt-1 text-sm text-app-text">
              {tr.crm.quoteImports.rawPreviewInstructions}
            </p>
            <FormError message={headerRowError} />
            <div className="mt-3 overflow-x-auto rounded-lg border border-app-border bg-white">
              <table className="w-full min-w-[480px] text-left text-sm">
                <tbody>
                  {rawRows.map((row, index) => (
                    <tr
                      key={index}
                      onClick={() => !mappedPreviewMutation.isPending && handlePickHeaderRow(index)}
                      className="cursor-pointer border-t border-app-border first:border-t-0 hover:bg-app-primary/5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                      aria-disabled={mappedPreviewMutation.isPending}
                    >
                      <td className="py-2 px-3 text-app-text">{row.join(' | ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="navy"
              className="mt-3"
              onClick={() => {
                setFile(null);
                setRawRows(null);
              }}
            >
              {tr.crm.quoteImports.changeFileButton}
            </Button>
          </div>
        )}

        {headers && headerRowIndex !== null && !result && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.quoteImports.stepMap}</h2>
            <p className="mt-1 text-sm text-app-muted">{tr.crm.quoteImports.mapInstructions}</p>
            <p className="mt-1 text-base font-semibold text-app-danger text-justify">
              {tr.crm.quoteImports.requiredFieldsHint}
            </p>

            <div className="mt-4 max-w-xs">
              <Select
                label={tr.crm.quoteImports.numberFormatLabel}
                value={numberFormat}
                onChange={(event) => setNumberFormat(event.target.value as NumberFormat)}
                options={[
                  { value: 'tr', label: tr.crm.quoteImports.numberFormatTr },
                  { value: 'en', label: tr.crm.quoteImports.numberFormatEn },
                ]}
              />
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-app-border bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase text-app-muted">
                  <tr>
                    <th className="w-56 py-2 pr-3">{tr.crm.quoteImports.columnHeader}</th>
                    <th className="w-48 py-2 pr-3">{tr.crm.quoteImports.sampleValueLabel}</th>
                    <th className="w-56 py-2 pr-3">{tr.crm.quoteImports.assignmentHeader}</th>
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
                          className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:border-app-primary"
                        >
                          <option value="ignore">{tr.crm.quoteImports.assignmentIgnore}</option>
                          <option value="attribute">
                            {tr.crm.quoteImports.assignmentAttribute}
                          </option>
                          {TARGET_FIELDS.map((field) => (
                            <option key={field} value={field}>
                              {tr.crm.quoteImports.fieldLabels[field]}
                              {REQUIRED_FIELDS.has(field) ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!requiredFieldsMapped && (
              <p className="mt-3 text-sm text-app-danger">
                {tr.crm.quoteImports.requiredFieldsError}
              </p>
            )}
            <FormError message={importError} />
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                disabled={!requiredFieldsMapped || runMutation.isPending}
                onClick={handleImport}
              >
                {runMutation.isPending
                  ? tr.crm.quoteImports.importing
                  : tr.crm.quoteImports.importButton}
              </Button>
              <Button type="button" variant="secondary" onClick={handleChangeHeaderRow}>
                {tr.crm.quoteImports.changeHeaderRowButton}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.quoteImports.stepResult}</h2>
            <div className="mt-3 grid grid-cols-5 gap-3 text-center">
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.totalRows}</p>
                <p className="text-xs text-app-muted">{tr.crm.quoteImports.totalRowsLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.imported}</p>
                <p className="text-xs text-app-muted">{tr.crm.quoteImports.importedLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.created}</p>
                <p className="text-xs text-app-muted">{tr.crm.quoteImports.createdLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.updated}</p>
                <p className="text-xs text-app-muted">{tr.crm.quoteImports.updatedLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.errors.length}</p>
                <p className="text-xs text-app-muted">{tr.crm.quoteImports.errorsLabel}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-4 flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-app-danger">
                {result.errors.map((error) => (
                  <li key={error.row}>
                    {tr.crm.quoteImports.rowErrorPrefix} {error.row}: {error.messages.join(', ')}
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" className="mt-4" onClick={() => navigate('/teklifler')}>
              {tr.crm.quoteImports.done}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
