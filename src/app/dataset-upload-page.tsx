import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useUploadDatasourceMutation } from '../features/datasets/use-datasets';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

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
    </AppShell>
  );
}
