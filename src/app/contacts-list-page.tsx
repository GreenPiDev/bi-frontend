import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useExportEntityMutation } from '../features/crm/use-imports';
import { downloadBlob } from '../lib/download';
import { tr } from '../i18n/tr';

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

      {contactsQuery.isPending && (
        <p className="mt-6 text-sm text-app-muted">{tr.crm.contacts.loading}</p>
      )}

      {contactsQuery.data?.data.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
          {tr.crm.contacts.empty}
        </div>
      )}

      {contactsQuery.data && contactsQuery.data.data.length > 0 && (
        <>
          <div className="mt-6 overflow-hidden rounded-xl border border-app-border bg-app-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-app-border text-xs uppercase text-app-muted">
                <tr>
                  <th className="px-4 py-3">{tr.crm.contacts.nameColumn}</th>
                  <th className="px-4 py-3">{tr.crm.contacts.accountColumn}</th>
                  <th className="px-4 py-3">{tr.crm.contacts.phoneColumn}</th>
                  <th className="px-4 py-3">{tr.crm.contacts.emailColumn}</th>
                </tr>
              </thead>
              <tbody>
                {contactsQuery.data.data.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => navigate(`/kisiler/${contact.id}`)}
                    className="cursor-pointer border-b border-app-border last:border-0 hover:bg-app-bg"
                  >
                    <td className="px-4 py-3 font-semibold text-app-text">
                      {contact.firstName} {contact.lastName}
                    </td>
                    <td className="px-4 py-3 text-app-muted">
                      {contact.account?.name ?? tr.crm.contacts.noAccount}
                    </td>
                    <td className="px-4 py-3 text-app-muted">{contact.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-app-muted">{contact.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-app-muted">
            <span>
              {tr.common.pageOf(contactsQuery.data.meta.page, contactsQuery.data.meta.totalPages)}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {tr.common.previous}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= contactsQuery.data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tr.common.next}
              </Button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
