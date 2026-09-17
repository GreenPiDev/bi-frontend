import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useOpportunitiesQuery,
  useUpdateOpportunityMutation,
} from '../features/crm/use-opportunities';
import { ApiError, type Opportunity, type OpportunityStage } from '../lib/api';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

const DESCRIPTION_TRUNCATE_LENGTH = 40;

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function OpportunityStageSelect({ opportunity }: { opportunity: Opportunity }) {
  const toast = useToast();
  const updateMutation = useUpdateOpportunityMutation(opportunity.id);

  return (
    <select
      value={opportunity.stage}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const stage = event.target.value as OpportunityStage;
        updateMutation.mutate(
          { stage },
          {
            onSuccess: () => toast.success(tr.crm.opportunities.stageUpdateSuccess),
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.opportunities.stageUpdateError,
              );
            },
          },
        );
      }}
      disabled={updateMutation.isPending}
      className="cursor-pointer rounded-md border-none bg-transparent p-0 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary disabled:opacity-50"
    >
      {STAGE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const ALL_COLUMNS: TableColumn<Opportunity>[] = [
  {
    key: 'name',
    header: tr.crm.opportunities.nameColumn,
    required: true,
    render: (o) => <span className="font-semibold text-app-text">{o.name}</span>,
  },
  {
    key: 'stage',
    header: tr.crm.opportunities.stageColumn,
    render: (o) => <OpportunityStageSelect opportunity={o} />,
  },
  {
    key: 'estimatedValue',
    header: tr.crm.opportunities.valueColumn,
    className: 'text-app-muted',
    render: (o) =>
      o.estimatedValue
        ? new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: o.estimatedValueCurrency,
          }).format(Number(o.estimatedValue))
        : '—',
  },
  {
    key: 'description',
    header: tr.crm.opportunities.descriptionColumn,
    className: 'text-app-muted',
    render: (o) => (o.description ? truncate(o.description, DESCRIPTION_TRUNCATE_LENGTH) : '—'),
  },
  {
    key: 'occurredAt',
    header: tr.crm.opportunities.occurredAtColumn,
    className: 'text-app-muted',
    render: (o) => new Date(o.occurredAt).toLocaleDateString('tr-TR'),
  },
];

export function OpportunitiesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [stage, setStage] = useState<OpportunityStage | ''>('');
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const opportunitiesQuery = useOpportunitiesQuery({ page, pageSize, stage: stage || undefined });
  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'opportunities',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.opportunities.title}</h1>
            <PageHelp text={tr.help.opportunities} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.opportunities.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/firsatlar/yeni')}>
          {tr.crm.opportunities.newButton}
        </Button>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          label={tr.crm.opportunities.stageFilterLabel}
          value={stage}
          onChange={(event) => {
            setPage(1);
            setStage(event.target.value as OpportunityStage | '');
          }}
          placeholder={tr.crm.opportunities.allStages}
          options={STAGE_OPTIONS}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      <Table
        columns={columns}
        data={opportunitiesQuery.data?.data ?? []}
        keyField={(opportunity) => opportunity.id}
        onRowClick={(opportunity) => navigate(`/firsatlar/${opportunity.id}`)}
        isLoading={opportunitiesQuery.isPending}
        loadingMessage={tr.crm.opportunities.loading}
        emptyMessage={tr.crm.opportunities.empty}
      />

      {opportunitiesQuery.data && opportunitiesQuery.data.data.length > 0 && (
        <Pagination
          page={opportunitiesQuery.data.meta.page}
          totalPages={opportunitiesQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
