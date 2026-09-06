import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useInteractionsQuery } from '../features/crm/use-interactions';
import type { Interaction } from '../lib/api';
import { tr } from '../i18n/tr';

const columns: TableColumn<Interaction>[] = [
  {
    key: 'occurredAt',
    header: tr.crm.interactions.dateColumn,
    className: 'text-app-muted',
    render: (i) => new Date(i.occurredAt).toLocaleDateString('tr-TR'),
  },
  {
    key: 'account',
    header: tr.crm.interactions.accountColumn,
    render: (i) => <span className="font-semibold text-app-text">{i.account.name}</span>,
  },
  {
    key: 'contact',
    header: tr.crm.interactions.contactColumn,
    className: 'text-app-muted',
    render: (i) => (i.contact ? `${i.contact.firstName} ${i.contact.lastName}` : '—'),
  },
  {
    key: 'type',
    header: tr.crm.interactions.typeColumn,
    render: (i) => tr.crm.interactions.typeOptions[i.type],
  },
  {
    key: 'status',
    header: tr.crm.interactions.statusColumn,
    render: (i) => (
      <Badge variant={i.status === 'OPEN' ? 'success' : 'neutral'}>
        {tr.crm.interactions.statusOptions[i.status]}
      </Badge>
    ),
  },
];

export function InteractionsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const interactionsQuery = useInteractionsQuery({ page });

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">{tr.crm.interactions.title}</h1>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.interactions.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/gorusmeler/yeni')}>
          {tr.crm.interactions.newButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={interactionsQuery.data?.data ?? []}
        keyField={(interaction) => interaction.id}
        onRowClick={(interaction) => navigate(`/gorusmeler/${interaction.id}`)}
        isLoading={interactionsQuery.isPending}
        loadingMessage={tr.crm.interactions.loading}
        emptyMessage={tr.crm.interactions.empty}
      />

      {interactionsQuery.data && interactionsQuery.data.data.length > 0 && (
        <Pagination
          page={interactionsQuery.data.meta.page}
          totalPages={interactionsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
