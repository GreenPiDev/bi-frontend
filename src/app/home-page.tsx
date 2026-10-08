import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  FileText,
  Mail,
  MessageCircle,
  PackageX,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from './app-shell';
import { PageHelp } from '../components/ui/page-help';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import {
  usePendingCalendarInvitesQuery,
  useCalendarEventsQuery,
} from '../features/crm/use-calendar-events';
import { useUnreadConversationsTotal } from '../features/crm/use-messages';
import { useLowStockItemsQuery } from '../features/crm/use-stock-items';
import {
  useTotalInteractionsCount,
  useTotalOpportunitiesCount,
  useTotalProjectsCount,
  useTotalQuotesCount,
} from '../features/home/use-home-summary';
import { tr } from '../i18n/tr';

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'full',
  timeStyle: 'short',
});
const eventTimeFormatter = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short' });

function startOfTodayIso(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function endOfTodayIso(): string {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

/** Her 30sn'de bir dakika hassasiyetiyle guncellenen saat/tarih - saniye gostermedigi
 * icin daha sik yenilemeye gerek yok. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="relative flex items-center overflow-hidden border border-app-border bg-app-surface p-5 transition-colors hover:bg-app-bg-muted"
    >
      <Icon
        size={96}
        strokeWidth={1.5}
        className="pointer-events-none absolute -right-5 -bottom-2 rotate-[14deg] text-app-muted opacity-15"
      />
      <div className="relative z-10">
        <p className="text-2xl font-bold text-app-text">
          {value === undefined ? '—' : new Intl.NumberFormat('tr-TR').format(value)}
        </p>
        <p className="text-sm text-app-muted">{label}</p>
      </div>
    </Link>
  );
}

export function HomePage() {
  const meQuery = useMeQuery();
  const tenantProfileQuery = useTenantProfileQuery(!meQuery.data?.isPlatformAdmin);
  const now = useNow();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const permissions = meQuery.data?.permissions;
  const canView = (pageKey: string) => hasPermission(permissions, pageKey, 'VIEW');
  const pageModuleAccess = {
    calendar: useIsPageModuleAccessible('calendar'),
    messages: useIsPageModuleAccessible('messages'),
    quotes: useIsPageModuleAccessible('quotes'),
    interactions: useIsPageModuleAccessible('interactions'),
    opportunities: useIsPageModuleAccessible('opportunities'),
    projects: useIsPageModuleAccessible('projects'),
    stock: useIsPageModuleAccessible('stock'),
  };
  const canAccessPage = (pageKey: keyof typeof pageModuleAccess) =>
    canView(pageKey) && pageModuleAccess[pageKey];

  const canAccessCalendar = canAccessPage('calendar');
  const canAccessMessages = canAccessPage('messages');
  const canAccessQuotes = canAccessPage('quotes');
  const canAccessInteractions = canAccessPage('interactions');
  const canAccessOpportunities = canAccessPage('opportunities');
  const canAccessProjects = canAccessPage('projects');
  const canAccessStock = canAccessPage('stock');

  const pendingInvitesQuery = usePendingCalendarInvitesQuery(canAccessCalendar);
  const todayEventsQuery = useCalendarEventsQuery(
    {
      from: startOfTodayIso(),
      to: endOfTodayIso(),
      order: 'asc',
    },
    { enabled: canAccessCalendar },
  );
  const unreadMessagesTotal = useUnreadConversationsTotal(canAccessMessages);

  const quotesCountQuery = useTotalQuotesCount(canAccessQuotes);
  const interactionsCountQuery = useTotalInteractionsCount(canAccessInteractions);
  const opportunitiesCountQuery = useTotalOpportunitiesCount(canAccessOpportunities);
  const projectsCountQuery = useTotalProjectsCount(canAccessProjects);
  const lowStockItemsQuery = useLowStockItemsQuery(canAccessStock);

  const pendingInvites = pendingInvitesQuery.data ?? [];
  const todayEvents = todayEventsQuery.data ?? [];

  const hasAnyStat =
    canAccessQuotes ||
    canAccessInteractions ||
    canAccessOpportunities ||
    canAccessProjects ||
    canAccessMessages ||
    canAccessStock;

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.home.title}</h1>
        <PageHelp text={tr.help.home} />
      </div>
      <p className="text-sm text-app-muted">{tr.home.subtitle}</p>

      {meQuery.data && (
        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border border-app-border bg-app-surface p-5">
          <div>
            <p className="text-lg font-bold text-app-brand">{tr.home.welcome(meQuery.data.name)}</p>
            {tenantProfileQuery.data?.name && (
              <p className="text-sm text-app-muted">{tenantProfileQuery.data.name}</p>
            )}
          </div>
          <p className="text-sm font-medium text-app-text">{dateTimeFormatter.format(now)}</p>
        </div>
      )}

      {canAccessCalendar && pendingInvites.length > 0 && (
        <Link
          to="/ajanda?tab=pendingInvites"
          className="mt-4 flex items-center justify-between gap-3 border border-app-primary/30 bg-app-primary/10 p-4 text-app-primary transition-colors hover:bg-app-primary/15"
        >
          <span className="text-sm font-semibold">
            {tr.home.pendingInvites.title(pendingInvites.length)}
          </span>
          <span className="text-sm font-bold underline">{tr.home.pendingInvites.cta}</span>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {canAccessCalendar && (
          <div className="relative overflow-hidden border border-app-border bg-app-surface p-5 lg:col-span-1">
            <CalendarClock
              size={180}
              strokeWidth={1.5}
              className="pointer-events-none absolute -right-10 -bottom-10 rotate-[14deg] text-app-muted opacity-15"
            />
            <div className="relative z-10 mb-4 flex items-center justify-between">
              <h2 className="text-[11px] font-bold tracking-wide text-app-muted uppercase">
                {tr.home.todayEvents.title}
              </h2>
              <Link to="/ajanda" className="text-xs font-semibold text-app-primary hover:underline">
                {tr.home.todayEvents.viewAll}
              </Link>
            </div>
            <div className="relative z-10 max-h-72 overflow-y-auto">
              {todayEvents.length === 0 ? (
                <p className="text-sm text-app-muted">{tr.home.todayEvents.empty}</p>
              ) : (
                <ul className="divide-y divide-app-border">
                  {todayEvents.map((event) => {
                    const isExpanded = expandedEventId === event.id;
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEventId((current) =>
                              current === event.id ? null : event.id,
                            )
                          }
                          aria-expanded={isExpanded}
                          className="group flex w-full cursor-pointer items-center gap-3 py-2 text-left"
                        >
                          <CalendarClock
                            size={16}
                            className="shrink-0 text-app-muted group-hover:text-app-primary"
                          />
                          <span className="shrink-0 text-xs text-app-muted group-hover:text-app-primary">
                            {event.allDay
                              ? tr.crm.calendar.allDayLabel
                              : eventTimeFormatter.format(new Date(event.startAt))}
                          </span>
                          <span className="flex-1 truncate text-sm font-medium text-app-text group-hover:text-app-primary">
                            {event.title}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-app-muted transition-transform group-hover:text-app-primary ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="mb-2 border border-app-border bg-stone-50 p-3">
                            <p className="text-sm text-black">
                              {event.description || tr.home.todayEvents.noDescription}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {hasAnyStat && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            {canAccessQuotes && (
              <StatCard
                icon={FileText}
                label={tr.home.stats.quotes}
                value={quotesCountQuery.data?.meta.total}
                to="/teklifler?tab=reports"
              />
            )}
            {canAccessInteractions && (
              <StatCard
                icon={MessageCircle}
                label={tr.home.stats.interactions}
                value={interactionsCountQuery.data?.meta.total}
                to="/gorusmeler"
              />
            )}
            {canAccessOpportunities && (
              <StatCard
                icon={Target}
                label={tr.home.stats.opportunities}
                value={opportunitiesCountQuery.data?.meta.total}
                to="/firsatlar"
              />
            )}
            {canAccessProjects && (
              <StatCard
                icon={Briefcase}
                label={tr.home.stats.projects}
                value={projectsCountQuery.data?.meta.total}
                to="/projeler"
              />
            )}
            {canAccessMessages && (
              <StatCard
                icon={Mail}
                label={tr.home.unreadMessages.title}
                value={unreadMessagesTotal}
                to="/mesajlar"
              />
            )}
            {canAccessStock && (
              <StatCard
                icon={PackageX}
                label={tr.home.stats.lowStock}
                value={lowStockItemsQuery.data?.length}
                to="/envanter?tab=stock"
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
