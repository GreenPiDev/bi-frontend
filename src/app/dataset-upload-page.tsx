import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FileDropzone } from '../components/ui/file-dropzone';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import {
  usePreviewDatasourceRawMutation,
  useUploadDatasourceMutation,
} from '../features/datasets/use-datasets';
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
  const rawPreviewMutation = usePreviewDatasourceRawMutation();
  const uploadMutation = useUploadDatasourceMutation();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [fileError, setFileError] = useState<string>();
  const [rawRows, setRawRows] = useState<string[][] | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setFileError(tr.datasets.upload.fileRequired);
      return;
    }
    setFileError(undefined);
    rawPreviewMutation.mutate(file, {
      onSuccess: (data) => setRawRows(data.rows),
    });
  }

  function handlePickHeaderRow(index: number) {
    if (!file) {
      return;
    }
    uploadMutation.mutate(
      { file, name: name.trim() || undefined, headerRowIndex: index },
      {
        onSuccess: (result) => {
          navigate(`/datasets/processing/${result.id}`);
        },
      },
    );
  }

  function handleChangeFile() {
    setFile(null);
    setRawRows(null);
  }

  const previewErrorMessage =
    rawPreviewMutation.error instanceof ApiError ? rawPreviewMutation.error.message : undefined;
  const uploadErrorMessage =
    uploadMutation.error instanceof ApiError ? uploadMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/datasets'} label={tr.datasets.upload.back} />

      <div className="mx-auto mt-6 max-w-xl p-8">
        <h1 className="text-lg font-bold text-app-text">{tr.datasets.upload.title}</h1>
        <p className="mt-1 text-sm text-app-muted">{tr.datasets.upload.subtitle}</p>

        {!rawRows && (
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
              <FileDropzone
                id="file"
                file={file}
                onFileSelect={setFile}
                accept=".csv,.xlsx"
                disabled={rawPreviewMutation.isPending}
              />
              {fileError && <p className="text-xs text-app-danger">{fileError}</p>}
            </div>

            <FormError message={previewErrorMessage} />

            <Button type="submit" disabled={rawPreviewMutation.isPending}>
              {rawPreviewMutation.isPending
                ? tr.datasets.upload.submitting
                : tr.datasets.upload.submit}
            </Button>
          </form>
        )}

        {rawRows && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-app-text">
              {tr.datasets.upload.stepPickHeaderTitle}
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              {tr.datasets.upload.rawPreviewInstructions}
            </p>
            <FormError message={uploadErrorMessage} />
            <div className="mt-3 overflow-x-auto rounded-lg border border-app-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <tbody>
                  {rawRows.map((row, index) => (
                    <tr key={index} className="border-t border-app-border first:border-t-0">
                      <td className="w-40 py-2 pl-3 pr-2 align-top">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={uploadMutation.isPending}
                          onClick={() => handlePickHeaderRow(index)}
                        >
                          {tr.datasets.upload.pickHeaderRowButton}
                        </Button>
                      </td>
                      <td className="py-2 pr-3 align-top text-app-text">{row.join(' | ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {uploadMutation.isPending && (
              <p className="mt-2 text-sm text-app-muted">{tr.datasets.upload.creatingDataset}</p>
            )}
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              disabled={uploadMutation.isPending}
              onClick={handleChangeFile}
            >
              {tr.datasets.upload.changeFileButton}
            </Button>
          </div>
        )}
      </div>

      {!rawRows && (
        <div className="mx-auto mt-4 max-w-xl p-6">
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
      )}
    </AppShell>
  );
}
