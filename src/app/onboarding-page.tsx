import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import {
  useDatasetQuery,
  useDatasourceStatusQuery,
  useUpdateDatasetFieldsMutation,
  useUploadDatasourceMutation,
} from '../features/datasets/use-datasets';
import {
  useCreateStarterDashboardMutation,
  useSeedDemoDatasetMutation,
} from '../features/onboarding/use-onboarding';
import type { DatasetField, DatasetFieldRole, DatasetFieldType } from '../lib/api';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

type Step = 'upload' | 'processing' | 'confirm' | 'dashboard';

interface FieldEdit {
  label: string;
  type: DatasetFieldType;
  role: DatasetFieldRole;
  isVisible: boolean;
}

function toEdit(field: DatasetField): FieldEdit {
  return { label: field.label, type: field.type, role: field.role, isVisible: field.isVisible };
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [dataSourceId, setDataSourceId] = useState<string>();
  const [datasetId, setDatasetId] = useState<string>();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [fileError, setFileError] = useState<string>();
  const [edits, setEdits] = useState<Record<string, FieldEdit>>({});
  const [loadedAt, setLoadedAt] = useState<number>();

  const uploadMutation = useUploadDatasourceMutation();
  const seedDemoMutation = useSeedDemoDatasetMutation();
  const statusQuery = useDatasourceStatusQuery(dataSourceId ?? '');
  const datasetQuery = useDatasetQuery(datasetId ?? '');
  const updateFieldsMutation = useUpdateDatasetFieldsMutation(datasetId ?? '');
  const createDashboardMutation = useCreateStarterDashboardMutation();

  if (step === 'processing' && statusQuery.data?.status === 'READY' && statusQuery.data.datasetId) {
    if (datasetId !== statusQuery.data.datasetId) {
      setDatasetId(statusQuery.data.datasetId);
      setStep('confirm');
    }
  }

  if (
    step === 'confirm' &&
    datasetQuery.dataUpdatedAt &&
    datasetQuery.dataUpdatedAt !== loadedAt &&
    datasetQuery.data
  ) {
    const next: Record<string, FieldEdit> = {};
    for (const field of datasetQuery.data.fields) {
      next[field.id] = toEdit(field);
    }
    setEdits(next);
    setLoadedAt(datasetQuery.dataUpdatedAt);
  }

  function handleUploadSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setFileError(tr.onboarding.stepUpload.fileRequired);
      return;
    }
    setFileError(undefined);
    uploadMutation.mutate(
      { file, name: name.trim() || undefined },
      {
        onSuccess: (result) => {
          setDataSourceId(result.id);
          setStep('processing');
        },
      },
    );
  }

  function handleDemoStart() {
    seedDemoMutation.mutate(undefined, {
      onSuccess: (result) => {
        setDataSourceId(result.id);
        setStep('processing');
      },
    });
  }

  function updateField(fieldId: string, patch: Partial<FieldEdit>) {
    setEdits((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], ...patch } }));
  }

  function handleConfirmFields() {
    if (!datasetQuery.data) return;
    const changed = datasetQuery.data.fields
      .filter((field) => {
        const edit = edits[field.id];
        return (
          edit &&
          (edit.label !== field.label ||
            edit.type !== field.type ||
            edit.role !== field.role ||
            edit.isVisible !== field.isVisible)
        );
      })
      .map((field) => ({ id: field.id, ...edits[field.id] }));

    if (changed.length === 0) {
      setStep('dashboard');
      return;
    }
    updateFieldsMutation.mutate(changed, { onSuccess: () => setStep('dashboard') });
  }

  function handleCreateDashboard() {
    if (!datasetId) return;
    createDashboardMutation.mutate(datasetId, {
      onSuccess: (dashboard) => navigate(`/dashboards/${dashboard.id}`, { replace: true }),
    });
  }

  const uploadApiError =
    uploadMutation.error instanceof ApiError
      ? uploadMutation.error.message
      : seedDemoMutation.error instanceof ApiError
        ? seedDemoMutation.error.message
        : undefined;

  return (
    <AppShell>
      <div className="mx-auto mt-6 max-w-2xl">
        <h1 className="text-xl font-bold text-app-text">{tr.onboarding.title}</h1>
        <p className="mt-1 text-sm text-app-muted">{tr.onboarding.subtitle}</p>

        <div className="mt-6 rounded-xl border border-app-border bg-app-surface p-8">
          {step === 'upload' && (
            <>
              <h2 className="text-lg font-bold text-app-text">
                {tr.onboarding.stepUpload.heading}
              </h2>
              <p className="mt-1 text-sm text-app-muted">{tr.onboarding.stepUpload.description}</p>

              <form onSubmit={handleUploadSubmit} className="mt-6 flex flex-col gap-4">
                <TextField
                  label={tr.onboarding.stepUpload.nameLabel}
                  name="name"
                  placeholder={tr.onboarding.stepUpload.namePlaceholder}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="file" className="text-sm font-semibold text-app-muted">
                    {tr.onboarding.stepUpload.fileLabel}
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

                <FormError message={uploadApiError} />

                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending
                    ? tr.onboarding.stepUpload.uploading
                    : tr.onboarding.stepUpload.uploadButton}
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase text-app-muted">
                <div className="h-px flex-1 bg-app-border" />
                {tr.onboarding.stepUpload.or}
                <div className="h-px flex-1 bg-app-border" />
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleDemoStart}
                disabled={seedDemoMutation.isPending}
              >
                {seedDemoMutation.isPending
                  ? tr.onboarding.stepUpload.seedingDemo
                  : tr.onboarding.stepUpload.demoButton}
              </Button>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center">
              {statusQuery.data?.status === 'FAILED' ? (
                <>
                  <h2 className="text-lg font-bold text-app-danger">
                    {tr.onboarding.stepProcessing.failed}
                  </h2>
                  <Button type="button" className="mt-4" onClick={() => setStep('upload')}>
                    {tr.onboarding.stepProcessing.retry}
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-app-border border-t-app-brand"
                    role="status"
                    aria-label={tr.onboarding.stepProcessing.heading}
                  />
                  <h2 className="mt-4 text-lg font-bold text-app-text">
                    {tr.onboarding.stepProcessing.heading}
                  </h2>
                  <p className="mt-1 text-sm text-app-muted">
                    {tr.onboarding.stepProcessing.description}
                  </p>
                </>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <>
              <h2 className="text-lg font-bold text-app-text">
                {tr.onboarding.stepConfirm.heading}
              </h2>
              <p className="mt-1 text-sm text-app-muted">{tr.onboarding.stepConfirm.description}</p>

              {datasetQuery.data && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-app-border text-xs uppercase text-app-muted">
                      <tr>
                        <th className="px-3 py-2">{tr.datasets.detail.columnLabel}</th>
                        <th className="px-3 py-2">{tr.datasets.detail.columnType}</th>
                        <th className="px-3 py-2">{tr.datasets.detail.columnRole}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasetQuery.data.fields.map((field) => {
                        const edit = edits[field.id] ?? toEdit(field);
                        return (
                          <tr key={field.id} className="border-b border-app-border last:border-0">
                            <td className="px-3 py-2">
                              <input
                                value={edit.label}
                                onChange={(event) =>
                                  updateField(field.id, { label: event.target.value })
                                }
                                className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={edit.type}
                                onChange={(event) =>
                                  updateField(field.id, {
                                    type: event.target.value as DatasetFieldType,
                                  })
                                }
                                className="rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                              >
                                {Object.entries(tr.datasets.detail.types).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={edit.role}
                                onChange={(event) =>
                                  updateField(field.id, {
                                    role: event.target.value as DatasetFieldRole,
                                  })
                                }
                                className="rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                              >
                                {Object.entries(tr.datasets.detail.roles).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <FormError
                message={
                  updateFieldsMutation.error instanceof ApiError
                    ? updateFieldsMutation.error.message
                    : undefined
                }
              />

              <Button
                type="button"
                className="mt-6"
                onClick={handleConfirmFields}
                disabled={updateFieldsMutation.isPending || !datasetQuery.data}
              >
                {tr.onboarding.stepConfirm.continueButton}
              </Button>
            </>
          )}

          {step === 'dashboard' && (
            <div className="text-center">
              <h2 className="text-lg font-bold text-app-text">
                {tr.onboarding.stepDashboard.heading}
              </h2>
              <p className="mt-1 text-sm text-app-muted">
                {tr.onboarding.stepDashboard.description}
              </p>

              <FormError
                message={
                  createDashboardMutation.error instanceof ApiError
                    ? createDashboardMutation.error.message
                    : createDashboardMutation.isError
                      ? tr.onboarding.stepDashboard.createError
                      : undefined
                }
              />

              <Button
                type="button"
                className="mt-6"
                onClick={handleCreateDashboard}
                disabled={createDashboardMutation.isPending}
              >
                {createDashboardMutation.isPending
                  ? tr.onboarding.stepDashboard.creating
                  : tr.onboarding.stepDashboard.createButton}
              </Button>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboards')}
                  className="text-sm font-semibold text-app-muted hover:text-app-text"
                >
                  {tr.onboarding.stepDashboard.skipToManual}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
