import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import {
  useCreateDashboardMutation,
  useDashboardsQuery,
} from '../features/dashboards/use-dashboards';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

export function DashboardsListPage() {
  const navigate = useNavigate();
  const dashboardsQuery = useDashboardsQuery();
  const createMutation = useCreateDashboardMutation();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: (dashboard) => {
          setIsCreating(false);
          setName('');
          navigate(`/dashboards/${dashboard.id}/edit`);
        },
      },
    );
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-app-text">{tr.dashboards.list.title}</h1>
          <p className="mt-1 text-sm text-app-muted">{tr.dashboards.list.subtitle}</p>
        </div>
        {!isCreating && (
          <Button type="button" onClick={() => setIsCreating(true)}>
            {tr.dashboards.list.createButton}
          </Button>
        )}
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="mt-6 flex items-end gap-3 rounded-xl border border-app-border bg-app-surface p-6"
        >
          <div className="flex-1">
            <TextField
              name="name"
              label={tr.dashboards.list.nameLabel}
              placeholder={tr.dashboards.list.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? tr.dashboards.list.creating : tr.dashboards.list.create}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsCreating(false);
              setName('');
            }}
          >
            {tr.dashboards.list.cancel}
          </Button>
        </form>
      )}
      <FormError message={apiErrorMessage && tr.dashboards.list.createError} />

      {dashboardsQuery.isPending && (
        <p className="mt-6 text-sm text-app-muted">{tr.dashboards.list.loading}</p>
      )}

      {dashboardsQuery.data?.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
          {tr.dashboards.list.empty}
        </div>
      )}

      {dashboardsQuery.data && dashboardsQuery.data.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-app-border bg-app-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-app-border text-xs uppercase text-app-muted">
              <tr>
                <th className="px-4 py-3">{tr.dashboards.list.nameColumn}</th>
                <th className="px-4 py-3">{tr.dashboards.list.createdAtColumn}</th>
              </tr>
            </thead>
            <tbody>
              {dashboardsQuery.data.map((dashboard) => (
                <tr
                  key={dashboard.id}
                  onClick={() => navigate(`/dashboards/${dashboard.id}`)}
                  className="cursor-pointer border-b border-app-border last:border-0 hover:bg-app-bg"
                >
                  <td className="px-4 py-3 font-semibold text-app-text">{dashboard.name}</td>
                  <td className="px-4 py-3 text-app-muted">
                    {dateFormatter.format(new Date(dashboard.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
