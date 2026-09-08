import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { usePostSaleCasesQuery } from '../features/crm/use-post-sale-cases';
import type { PostSaleCase, PostSaleCaseStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS: { value: PostSaleCaseStatus; label: string }[] = (
  ['BEKLEMEDE', 'HATIRLATILDI', 'GERI_BILDIRIM_ALINDI'] as const
).map((status) => ({ value: status, label: tr.crm.postSaleCases.statusOptions[status] }));

const STATUS_BADGE_VARIANT: Record<PostSaleCaseStatus, 'success' | 'warning' | 'neutral'> = {
  BEKLEMEDE: 'neutral',
  HATIRLATILDI: 'warning',
  GERI_BILDIRIM_ALINDI: 'success',
};

const columns: TableColumn<PostSaleCase>[] = [
  {
    key: 'quote',
    header: tr.crm.postSaleCases.quoteColumn,
    render: (c) => <span className="font-semibold text-app-text">{c.quote.quoteNumber}</span>,
  },
  {
    key: 'account',
    header: tr.crm.postSaleCases.accountColumn,
    render: (c) => c.account.name,
  },
  {
    key: 'contact',
    header: tr.crm.postSaleCases.contactColumn,
    render: (c) =>
      c.contact ? `${c.contact.firstName} ${c.contact.lastName}` : tr.crm.postSaleCases.noContact,
  },
  {
    key: 'status',
    header: tr.crm.postSaleCases.statusColumn,
    render: (c) => (
      <Badge variant={STATUS_BADGE_VARIANT[c.status]}>
        {tr.crm.postSaleCases.statusOptions[c.status]}
      </Badge>
    ),
  },
];

export function PostSaleCaseListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PostSaleCaseStatus | ''>('');
  const casesQuery = usePostSaleCasesQuery({ page, status: status || undefined });

  return (
    <AppShell>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-app-text">{tr.crm.postSaleCases.title}</h1>
          <PageHelp text={tr.help.postSaleCases} />
        </div>
        <p className="mt-1 text-sm text-app-muted">{tr.crm.postSaleCases.subtitle}</p>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          label={tr.crm.postSaleCases.statusFilterLabel}
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as PostSaleCaseStatus | '');
          }}
          placeholder={tr.crm.postSaleCases.allStatuses}
          options={STATUS_OPTIONS}
        />
      </div>

      <Table
        columns={columns}
        data={casesQuery.data?.data ?? []}
        keyField={(c) => c.id}
        onRowClick={(c) => navigate(`/satis-sonrasi/${c.id}`)}
        isLoading={casesQuery.isPending}
        loadingMessage={tr.crm.postSaleCases.loading}
        emptyMessage={tr.crm.postSaleCases.empty}
      />

      {casesQuery.data && casesQuery.data.data.length > 0 && (
        <Pagination
          page={casesQuery.data.meta.page}
          totalPages={casesQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
