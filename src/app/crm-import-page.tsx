import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { usePreviewImportMutation, useRunImportMutation } from '../features/crm/use-imports';
import { ApiError, type ImportEntity, type ImportPreview, type ImportResult } from '../lib/api';
import { tr } from '../i18n/tr';

const ENTITY_FIELDS: Record<ImportEntity, Record<string, string>> = {
  accounts: tr.crm.import.fields.accounts,
  contacts: tr.crm.import.fields.contacts,
};

const ENTITY_LIST_PATH: Record<ImportEntity, string> = {
  accounts: '/firmalar',
  contacts: '/kisiler',
};

function guessMapping(headers: string[], fields: Record<string, string>): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [target, label] of Object.entries(fields)) {
    const match = headers.find(
      (header) =>
        header.trim().toLowerCase() === label.toLowerCase() ||
        header.trim().toLowerCase() === target.toLowerCase(),
    );
    if (match) {
      mapping[target] = match;
    }
  }
  return mapping;
}

export function CrmImportPage({ entity }: { entity: ImportEntity }) {
  const navigate = useNavigate();
  const fields = ENTITY_FIELDS[entity];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  const previewMutation = usePreviewImportMutation();
  const runMutation = useRunImportMutation(entity);

  function handleUpload() {
    if (!file) {
      return;
    }
    previewMutation.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        setMapping(guessMapping(data.headers, fields));
      },
    });
  }

  function handleImport() {
    if (!file) {
      return;
    }
    runMutation.mutate({ file, mapping }, { onSuccess: (data) => setResult(data) });
  }

  const uploadError =
    previewMutation.error instanceof ApiError ? previewMutation.error.message : undefined;
  const importError = runMutation.error instanceof ApiError ? runMutation.error.message : undefined;

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate(ENTITY_LIST_PATH[entity])}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.import.back}
      </button>

      <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.import.title}</h1>

        {!preview && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.import.stepUpload}</h2>
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
                disabled={!file || previewMutation.isPending}
                onClick={handleUpload}
              >
                {previewMutation.isPending ? tr.crm.import.uploading : tr.crm.import.uploadButton}
              </Button>
            </div>
          </div>
        )}

        {preview && !result && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.import.stepMap}</h2>
            <p className="mt-1 text-sm text-app-muted">
              {tr.crm.import.mapInstructions} ({preview.totalRows} satır)
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {Object.entries(fields).map(([target, label]) => (
                <div key={target} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-app-text">{label}</span>
                  <select
                    value={mapping[target] ?? ''}
                    onChange={(event) =>
                      setMapping((prev) => ({ ...prev, [target]: event.target.value }))
                    }
                    className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                  >
                    <option value="">{tr.crm.import.mapNotMapped}</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <FormError message={importError} />
            <Button
              type="button"
              className="mt-4"
              disabled={runMutation.isPending}
              onClick={handleImport}
            >
              {runMutation.isPending ? tr.crm.import.importing : tr.crm.import.importButton}
            </Button>
          </div>
        )}

        {result && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">{tr.crm.import.stepResult}</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.totalRows}</p>
                <p className="text-xs text-app-muted">{tr.crm.import.totalRowsLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.imported}</p>
                <p className="text-xs text-app-muted">{tr.crm.import.importedLabel}</p>
              </div>
              <div className="rounded-lg border border-app-border p-3">
                <p className="text-lg font-bold text-app-text">{result.errors.length}</p>
                <p className="text-xs text-app-muted">{tr.crm.import.errorsLabel}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-4 flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-app-danger">
                {result.errors.map((error) => (
                  <li key={error.row}>
                    {tr.crm.import.rowErrorPrefix} {error.row}: {error.messages.join(', ')}
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              className="mt-4"
              onClick={() => navigate(ENTITY_LIST_PATH[entity])}
            >
              {tr.crm.import.done}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
