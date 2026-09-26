import { useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { PageHelp } from '../components/ui/page-help';
import { useUserStatsQuery } from '../features/roles/use-users';
import { tr } from '../i18n/tr';

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
export function UserStatsPage() {
  const { id = '' } = useParams();
  const statsQuery = useUserStatsQuery(id);
  const strings = tr.settings.roles.users.statsPage;

  return (
    <AppShell>
      <BackLink to="/settings?tab=users" label={strings.back} />

      {statsQuery.isPending && <p className="mt-6 text-sm text-app-muted">{tr.common.loading}</p>}

      {statsQuery.data && (
        <>
          <div className="mt-6 flex items-center gap-4">
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
        </>
      )}
    </AppShell>
  );
}
