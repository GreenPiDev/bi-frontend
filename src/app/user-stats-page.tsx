import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useUserStatsQuery } from '../features/roles/use-users';
import { extractUserId } from '../features/roles/user-slug';
import { tr } from '../i18n/tr';
import type { UserStats } from '../lib/api';

const numberFormatter = new Intl.NumberFormat('tr-TR');

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 border border-app-border bg-app-surface p-6">
      <span className="text-3xl font-bold text-app-text">{numberFormatter.format(value)}</span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </div>
  );
}

/** Facebook/Twitter profili benzeri, salt-okunur kullanici istatistik sayfasi -
 * /settings?tab=users tablosundaki bir satira tiklayinca acilir (bkz. users-section.tsx). */
const RESPONSIBLE_PROJECT_COLUMNS: TableColumn<UserStats['responsibleProjects'][number]>[] = [
  {
    key: 'projectNumber',
    header: tr.crm.projects.numberColumn,
    render: (p) => <span className="font-semibold text-app-text">{p.projectNumber}</span>,
  },
  {
    key: 'name',
    header: tr.crm.projects.nameColumn,
    render: (p) => p.name,
  },
];

export function UserStatsPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const id = extractUserId(slug);
  const statsQuery = useUserStatsQuery(id);
  const strings = tr.settings.roles.users.statsPage;
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  return (
    <AppShell>
      <BackLink to="/settings?tab=users" label={strings.back} />

      {statsQuery.isPending && <p className="mt-6 text-sm text-app-muted">{tr.common.loading}</p>}

      {statsQuery.data && (
        <>
          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {statsQuery.data.user.avatarUrl ? (
                <img
                  src={statsQuery.data.user.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-app-bg-muted text-lg font-bold text-app-muted">
                  {statsQuery.data.user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-app-text">{statsQuery.data.user.name}</h1>
                  <PageHelp text={tr.help.userStats} />
                </div>
                <p className="text-sm text-app-muted">{statsQuery.data.user.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {statsQuery.data.user.roles.map((role) => (
                    <Badge key={role.id}>{role.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <CircleIconButton
              icon={Mail}
              tooltip={strings.sendMessageTooltip}
              onClick={() => setIsMessageModalOpen(true)}
            />
          </div>
          <p className="mt-2 text-sm text-app-muted">{strings.subtitle}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={strings.accountsLabel} value={statsQuery.data.counts.accounts} />
            <StatCard label={strings.contactsLabel} value={statsQuery.data.counts.contacts} />
            <StatCard
              label={strings.interactionsLabel}
              value={statsQuery.data.counts.interactions}
            />
            <StatCard
              label={strings.opportunitiesLabel}
              value={statsQuery.data.counts.opportunities}
            />
            <StatCard label={strings.quotesLabel} value={statsQuery.data.counts.quotes} />
            <StatCard label={strings.projectsLabel} value={statsQuery.data.counts.projects} />
            <StatCard
              label={strings.purchaseOrdersLabel}
              value={statsQuery.data.counts.purchaseOrders}
            />
          </div>

          <div className="mt-6 rounded-xl border border-app-border bg-white p-5">
            <h2 className="mb-4 text-[11px] font-bold tracking-wide text-app-muted uppercase">
              {strings.responsibleProjectsTitle}
            </h2>
            <Table
              columns={RESPONSIBLE_PROJECT_COLUMNS}
              data={statsQuery.data.responsibleProjects}
              keyField={(project) => project.id}
              onRowClick={(project) => navigate(`/projeler/${project.projectNumber}`)}
              getRowHref={(project) => `/projeler/${project.projectNumber}`}
              emptyMessage={strings.noResponsibleProjects}
            />
          </div>
        </>
      )}

      {isMessageModalOpen && statsQuery.data && (
        <NewMessageModal
          onClose={() => setIsMessageModalOpen(false)}
          defaultToUserIds={[statsQuery.data.user.id]}
        />
      )}
    </AppShell>
  );
}
