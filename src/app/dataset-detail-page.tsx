import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import {
  useDatasetPreviewQuery,
  useDatasetQuery,
  useUpdateDatasetFieldsMutation,
} from '../features/datasets/use-datasets';
import type { DatasetField, DatasetFieldRole, DatasetFieldType } from '../lib/api';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

interface FieldEdit {
  label: string;
  type: DatasetFieldType;
  role: DatasetFieldRole;
  isVisible: boolean;
}

function toEdit(field: DatasetField): FieldEdit {
  return { label: field.label, type: field.type, role: field.role, isVisible: field.isVisible };
}

export function DatasetDetailPage() {
  const { id = '' } = useParams();
  const datasetQuery = useDatasetQuery(id);
  const previewQuery = useDatasetPreviewQuery(id);
  const updateMutation = useUpdateDatasetFieldsMutation(id);

  const [edits, setEdits] = useState<Record<string, FieldEdit>>({});
  const [savedMessage, setSavedMessage] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number>();

  if (datasetQuery.dataUpdatedAt && datasetQuery.dataUpdatedAt !== loadedAt && datasetQuery.data) {
    const next: Record<string, FieldEdit> = {};
    for (const field of datasetQuery.data.fields) {
      next[field.id] = toEdit(field);
    }
    setEdits(next);
    setLoadedAt(datasetQuery.dataUpdatedAt);
  }

  function updateField(fieldId: string, patch: Partial<FieldEdit>) {
    setSavedMessage(false);
    setEdits((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], ...patch } }));
  }

  function handleSave() {
    if (!datasetQuery.data) return;
    const fields = datasetQuery.data.fields
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

    if (fields.length === 0) return;
    updateMutation.mutate(fields, { onSuccess: () => setSavedMessage(true) });
  }

  const apiErrorMessage =
    updateMutation.error instanceof ApiError ? updateMutation.error.message : undefined;

  const schemaColumns: TableColumn<DatasetField>[] = [
    {
      key: 'label',
      header: tr.datasets.detail.columnLabel,
      render: (field) => {
        const edit = edits[field.id] ?? toEdit(field);
        return (
          <input
            value={edit.label}
            onChange={(event) => updateField(field.id, { label: event.target.value })}
            className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        );
      },
    },
    {
      key: 'type',
      header: tr.datasets.detail.columnType,
      render: (field) => {
        const edit = edits[field.id] ?? toEdit(field);
        return (
          <select
            value={edit.type}
            onChange={(event) =>
              updateField(field.id, { type: event.target.value as DatasetFieldType })
            }
            className="rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          >
            {Object.entries(tr.datasets.detail.types).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'role',
      header: tr.datasets.detail.columnRole,
      render: (field) => {
        const edit = edits[field.id] ?? toEdit(field);
        return (
          <select
            value={edit.role}
            onChange={(event) =>
              updateField(field.id, { role: event.target.value as DatasetFieldRole })
            }
            className="rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          >
            {Object.entries(tr.datasets.detail.roles).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'isVisible',
      header: tr.datasets.detail.columnVisible,
      render: (field) => {
        const edit = edits[field.id] ?? toEdit(field);
        return (
          <input
            type="checkbox"
            checked={edit.isVisible}
            onChange={(event) => updateField(field.id, { isVisible: event.target.checked })}
            aria-label={`${field.label} ${tr.datasets.detail.columnVisible}`}
          />
        );
      },
    },
  ];

  const previewColumns: TableColumn<unknown[]>[] = (previewQuery.data?.columns ?? []).map(
    (column, columnIndex) => ({
      key: column,
      header: column,
      className: 'whitespace-nowrap text-app-muted',
      render: (row) => String(row[columnIndex] ?? ''),
    }),
  );

  return (
    <AppShell>
      <BackLink to={'/datasets'} label={tr.datasets.detail.backToList} />

      {datasetQuery.data && (
        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-xl font-bold text-app-text">{datasetQuery.data.name}</h1>
          <PageHelp text={tr.help.datasetDetail} />
        </div>
      )}

      <section className="mt-6 border-t border-app-border p-6">
        <h2 className="text-base font-bold text-app-text">{tr.datasets.detail.schemaTitle}</h2>
        <p className="mt-1 text-sm text-app-muted">{tr.datasets.detail.schemaSubtitle}</p>

        {datasetQuery.data && (
          <Table
            columns={schemaColumns}
            data={datasetQuery.data.fields}
            keyField={(field) => field.id}
          />
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? tr.datasets.detail.saving : tr.datasets.detail.save}
          </Button>
          {savedMessage && !updateMutation.isPending && (
            <span className="text-sm font-medium text-app-brand">
              {tr.datasets.detail.saveSuccess}
            </span>
          )}
        </div>
        <FormError message={apiErrorMessage && tr.datasets.detail.saveError} />
      </section>

      <section className="mt-6 border-t border-app-border p-6">
        <h2 className="text-base font-bold text-app-text">{tr.datasets.detail.previewTitle}</h2>
        <p className="mt-1 text-sm text-app-muted">{tr.datasets.detail.previewSubtitle}</p>

        {previewQuery.data && (
          <Table
            columns={previewColumns}
            data={previewQuery.data.rows}
            keyField={(_row, index) => String(index)}
          />
        )}
      </section>
    </AppShell>
  );
}
