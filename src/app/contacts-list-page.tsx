import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useExportEntityMutation } from '../features/crm/use-imports';
import { downloadBlob } from '../lib/download';
import type { Contact } from '../lib/api';
import { tr } from '../i18n/tr';

const columns: TableColumn<Contact>[] = [
  {
    key: 'name',
    header: tr.crm.contacts.nameColumn,
    render: (c) => (
      <span className="font-semibold text-app-text">
        {c.firstName} {c.lastName}
      </span>
    ),
  },
  {
    key: 'account',
    header: tr.crm.contacts.accountColumn,
    className: 'text-app-muted',
    render: (c) => c.account?.name ?? tr.crm.contacts.noAccount,
  },
  {
    key: 'phone',
    header: tr.crm.contacts.phoneColumn,
    className: 'text-app-muted',
    render: (c) => c.phone ?? '—',
  },
  {
    key: 'email',
    header: tr.crm.contacts.emailColumn,
    className: 'text-app-muted',
    render: (c) => c.email ?? '—',
  },
  {
    key: 'status',
    header: tr.crm.contacts.statusColumn,
    render: (c) => (
      <Badge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}>
        {c.status === 'ACTIVE' ? tr.crm.contacts.statusActive : tr.crm.contacts.statusInactive}
      </Badge>
    ),
  },
];

export function ContactsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const contactsQuery = useContactsQuery({ page, q: q || undefined });
  const exportMutation = useExportEntityMutation('contacts');

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">{tr.crm.contacts.title}</h1>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.contacts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            type="button"
            disabled={exportMutation.isPending}
            onClick={() =>
              exportMutation.mutate(undefined, {
                onSuccess: (blob) => downloadBlob(blob, 'kisiler.xlsx'),
              })
            }
          >
            {tr.crm.contacts.exportButton}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/kisiler/ice-aktar')}>
            {tr.crm.contacts.importButton}
          </Button>
          <Button type="button" onClick={() => navigate('/kisiler/yeni')}>
            {tr.crm.contacts.newButton}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="mt-6 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
          />
          <input
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            placeholder={tr.crm.contacts.searchPlaceholder}
            className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
        <Button type="submit" variant="secondary">
          {tr.crm.contacts.title}
        </Button>
      </form>

      <Table
        columns={columns}
        data={contactsQuery.data?.data ?? []}
        keyField={(contact) => contact.id}
        onRowClick={(contact) => navigate(`/kisiler/${contact.id}`)}
        isLoading={contactsQuery.isPending}
        loadingMessage={tr.crm.contacts.loading}
        emptyMessage={tr.crm.contacts.empty}
      />

      {contactsQuery.data && contactsQuery.data.data.length > 0 && (
        <Pagination
          page={contactsQuery.data.meta.page}
          totalPages={contactsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
