import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { getDataset } from '../../lib/api';
import type { DatasetFieldType, DatasetWithFields, FilterOperator } from '../../lib/api';
import { tr } from '../../i18n/tr';
import type { DashboardFilter } from './dashboard-filters';

const OPERATORS_BY_TYPE: Record<DatasetFieldType, FilterOperator[]> = {
  STRING: ['eq', 'neq', 'contains', 'is_null', 'is_not_null'],
  NUMBER: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null'],
  DATE: ['eq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null'],
  BOOLEAN: ['eq', 'is_null', 'is_not_null'],
};

const inputTypeByFieldType: Record<DatasetFieldType, string> = {
  STRING: 'text',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'text',
};

function coerceValue(fieldType: DatasetFieldType, raw: string): unknown {
  if (fieldType === 'NUMBER') return Number(raw);
  return raw;
}

interface DashboardFilterFormProps {
  datasets: DatasetWithFields[];
  onAdd: (filter: DashboardFilter) => void;
  onCancel: () => void;
}

function DashboardFilterForm({ datasets, onAdd, onCancel }: DashboardFilterFormProps) {
  const [datasetId, setDatasetId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [op, setOp] = useState<FilterOperator>('eq');
  const [value, setValue] = useState('');
  const [valueTo, setValueTo] = useState('');

  const dataset = datasets.find((d) => d.id === datasetId);
  const fields = dataset?.fields.filter((f) => f.isVisible) ?? [];
  const field = fields.find((f) => f.name === fieldName);
  const operators = field ? OPERATORS_BY_TYPE[field.type] : [];
  const inputType = field ? (inputTypeByFieldType[field.type] ?? 'text') : 'text';
  const needsValue = op !== 'is_null' && op !== 'is_not_null';
  const needsRange = op === 'between';

  function selectDataset(nextDatasetId: string) {
    setDatasetId(nextDatasetId);
    setFieldName('');
    setOp('eq');
    setValue('');
    setValueTo('');
  }

  function selectField(nextFieldName: string) {
    setFieldName(nextFieldName);
    const nextField = fields.find((f) => f.name === nextFieldName);
    setOp(nextField ? OPERATORS_BY_TYPE[nextField.type][0] : 'eq');
    setValue('');
    setValueTo('');
  }

  function handleSubmit() {
    if (!dataset || !field) return;
    const filterValue = !needsValue
      ? undefined
      : needsRange
        ? [coerceValue(field.type, value), coerceValue(field.type, valueTo)]
        : coerceValue(field.type, value);
    const valueLabel = !needsValue
      ? tr.dashboards.filters.operators[op]
      : needsRange
        ? `${value} – ${valueTo}`
        : value;

    onAdd({
      id: crypto.randomUUID(),
      datasetId: dataset.id,
      datasetName: dataset.name,
      field: field.name,
      fieldLabel: field.label,
      fieldType: field.type,
      op,
      value: filterValue,
      valueLabel,
    });
  }

  const canSubmit =
    Boolean(dataset && field) && (!needsValue || (needsRange ? value && valueTo : value !== ''));

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-app-border bg-app-surface p-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="dash-filter-dataset" className="text-xs font-semibold text-app-muted">
          {tr.dashboards.filters.datasetLabel}
        </label>
        <select
          id="dash-filter-dataset"
          value={datasetId}
          onChange={(event) => selectDataset(event.target.value)}
          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        >
          <option value="">{tr.dashboards.filters.datasetPlaceholder}</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {dataset && (
        <div className="flex flex-col gap-1">
          <label htmlFor="dash-filter-field" className="text-xs font-semibold text-app-muted">
            {tr.dashboards.filters.fieldLabel}
          </label>
          <select
            id="dash-filter-field"
            value={fieldName}
            onChange={(event) => selectField(event.target.value)}
            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          >
            <option value="">{tr.dashboards.filters.fieldPlaceholder}</option>
            {fields.map((f) => (
              <option key={f.id} value={f.name}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {field && (
        <div className="flex flex-col gap-1">
          <label htmlFor="dash-filter-operator" className="text-xs font-semibold text-app-muted">
            {tr.dashboards.filters.operatorLabel}
          </label>
          <select
            id="dash-filter-operator"
            value={op}
            onChange={(event) => setOp(event.target.value as FilterOperator)}
            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          >
            {operators.map((o) => (
              <option key={o} value={o}>
                {tr.dashboards.filters.operators[o]}
              </option>
            ))}
          </select>
        </div>
      )}

      {field && needsValue && !needsRange && (
        <div className="flex flex-col gap-1">
          <label htmlFor="dash-filter-value" className="text-xs font-semibold text-app-muted">
            {tr.dashboards.filters.valueLabel}
          </label>
          <input
            id="dash-filter-value"
            type={inputType}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
      )}

      {field && needsRange && (
        <>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="dash-filter-value-from"
              className="text-xs font-semibold text-app-muted"
            >
              {tr.dashboards.filters.valueFromLabel}
            </label>
            <input
              id="dash-filter-value-from"
              type={inputType}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dash-filter-value-to" className="text-xs font-semibold text-app-muted">
              {tr.dashboards.filters.valueToLabel}
            </label>
            <input
              id="dash-filter-value-to"
              type={inputType}
              value={valueTo}
              onChange={(event) => setValueTo(event.target.value)}
              className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
            />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
          {tr.dashboards.filters.apply}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {tr.dashboards.filters.cancel}
        </Button>
      </div>
    </div>
  );
}

interface DashboardFilterBarProps {
  datasetIds: string[];
  filters: DashboardFilter[];
  onChange: (filters: DashboardFilter[]) => void;
}

export function DashboardFilterBar({ datasetIds, filters, onChange }: DashboardFilterBarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const datasetQueries = useQueries({
    queries: datasetIds.map((id) => ({
      queryKey: ['datasets', id],
      queryFn: () => getDataset(id),
    })),
  });
  const datasets = datasetQueries
    .map((q) => q.data)
    .filter((d): d is DatasetWithFields => Boolean(d));

  function addFilter(filter: DashboardFilter) {
    onChange([...filters, filter]);
    setIsAdding(false);
  }

  function removeFilter(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }

  if (datasets.length === 0 && filters.length === 0 && !isAdding) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <span
          key={f.id}
          className="flex items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text"
        >
          <span className="text-app-muted">{f.datasetName}:</span>
          <span className="font-semibold">{f.fieldLabel}</span>
          <span className="text-app-muted">{tr.dashboards.filters.operators[f.op]}</span>
          {f.valueLabel && <span>{f.valueLabel}</span>}
          <button
            type="button"
            onClick={() => removeFilter(f.id)}
            aria-label={tr.dashboards.filters.remove}
            className="text-app-muted hover:text-app-danger"
          >
            ×
          </button>
        </span>
      ))}

      {isAdding ? (
        <DashboardFilterForm
          datasets={datasets}
          onAdd={addFilter}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        datasets.length > 0 && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="rounded-full border border-dashed border-app-border px-3 py-1.5 text-sm font-semibold text-app-muted hover:border-app-primary hover:text-app-primary"
          >
            {tr.dashboards.filters.addButton}
          </button>
        )
      )}
    </div>
  );
}
