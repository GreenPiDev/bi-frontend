import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useUploadDatasourceMutation } from '../features/datasets/use-datasets';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

const sampleFiles = [
  {
    href: '/demo-data/ornek-perakende-satis.csv',
    fileName: 'ornek-perakende-satis.csv',
    label: tr.datasets.upload.sampleCsvLabel,
    description: tr.datasets.upload.sampleCsvDescription,
    icon: FileText,
  },
  {
    href: '/demo-data/ornek-depo-stok.xlsx',
    fileName: 'ornek-depo-stok.xlsx',
    label: tr.datasets.upload.sampleXlsxLabel,
    description: tr.datasets.upload.sampleXlsxDescription,
    icon: FileSpreadsheet,
  },
];

export function DatasetUploadPage() {
  const navigate = useNavigate();
  const uploadMutation = useUploadDatasourceMutation();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [fileError, setFileError] = useState<string>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setFileError(tr.datasets.upload.fileRequired);
      return;
    }
    setFileError(undefined);
    uploadMutation.mutate(
      { file, name: name.trim() || undefined },
      {
        onSuccess: (result) => {
          navigate(`/datasets/processing/${result.id}`);
        },
      },
    );
  }

  const apiErrorMessage =
    uploadMutation.error instanceof ApiError ? uploadMutation.error.message : undefined;

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/datasets')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.datasets.upload.back}
      </button>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">{tr.datasets.upload.title}</h1>
        <p className="mt-1 text-sm text-app-muted">{tr.datasets.upload.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <TextField
            label={tr.datasets.upload.nameLabel}
            name="name"
            placeholder={tr.datasets.upload.namePlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="file" className="text-sm font-semibold text-app-muted">
              {tr.datasets.upload.fileLabel}
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
            />
            {fileError && <p className="text-xs text-app-danger">{fileError}</p>}
          </div>

          <FormError message={apiErrorMessage} />

          <Button type="submit" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? tr.datasets.upload.submitting : tr.datasets.upload.submit}
          </Button>
        </form>
      </div>

      <div className="mx-auto mt-4 max-w-xl rounded-xl border border-app-border bg-app-surface p-6">
        <h2 className="text-sm font-bold text-app-text">{tr.datasets.upload.sampleTitle}</h2>
        <p className="mt-1 text-sm text-app-muted">{tr.datasets.upload.sampleSubtitle}</p>

        <div className="mt-4 flex flex-col gap-2.5">
          {sampleFiles.map((sample) => (
            <a
              key={sample.href}
              href={sample.href}
              download={sample.fileName}
              className="flex items-center justify-between rounded-lg border border-app-border px-3.5 py-2.5 text-sm transition-colors hover:border-app-primary hover:bg-app-primary/5"
            >
              <span className="flex items-center gap-2.5">
                <sample.icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-semibold text-app-text">{sample.label}</span>
                  <span className="text-xs text-app-muted">{sample.description}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 font-semibold text-app-primary">
                <Download className="h-4 w-4" aria-hidden="true" />
                {tr.datasets.upload.sampleDownload}
              </span>
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
