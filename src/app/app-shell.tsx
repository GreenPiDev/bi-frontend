import {
  Briefcase,
  Building2,
  CalendarDays,
  Contact2,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  Table2,
  Tags,
  Target,
  User,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatbotWidget } from '../features/chatbot/chatbot-widget';
import { useMeQuery, useLogoutMutation } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { tr } from '../i18n/tr';

interface AppShellProps {
  children: ReactNode;
  /** PDF export'unun Playwright ile render ettigi sade rapor gorunumu (bkz.
   * dashboard-pdf.service.ts): sadece logo + verilen icerik kalir, navigasyon/
   * kullanici aksiyonlari/chatbot widget'i render edilmez. */
  print?: boolean;
}

export function AppShell({ children, print = false }: AppShellProps) {
  const meQuery = useMeQuery();
  const logoutMutation = useLogoutMutation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const permissions = meQuery.data?.permissions;
  const canView = (pageKey: string) => hasPermission(permissions, pageKey, 'VIEW');
  /* G1: kullaniciya kapali menuler burada tamamen listeden cikarilir - disabled
   * gosterip yine de gorunur birakmak yerine, yetkisi/modul erisimi olmayan
   * kullanici o ogenin varligini hic gormemeli (bkz. CLAUDE.md A2.3.1). Sayfa gorunurlugu
   * artik rol ismine degil (OWNER/ADMIN) Permission sistemine gore belirlenir. Modul
   * erisimi de artik sayfaya ozel kod yerine, sureper adminin yonettigi sayfa-modul
   * eslemesinden (bkz. features/crm/use-page-access.ts) genel bir sekilde okunur. */
  const pageModuleAccess: Record<string, boolean> = {
    dashboards: useIsPageModuleAccessible('dashboards'),
    datasets: useIsPageModuleAccessible('datasets'),
    accounts: useIsPageModuleAccessible('accounts'),
    contacts: useIsPageModuleAccessible('contacts'),
    calendar: useIsPageModuleAccessible('calendar'),
    interactions: useIsPageModuleAccessible('interactions'),
    opportunities: useIsPageModuleAccessible('opportunities'),
    products: useIsPageModuleAccessible('products'),
    'price-lists': useIsPageModuleAccessible('price-lists'),
    quotes: useIsPageModuleAccessible('quotes'),
    'post-sale-cases': useIsPageModuleAccessible('post-sale-cases'),
    projects: useIsPageModuleAccessible('projects'),
    settings: useIsPageModuleAccessible('settings'),
  };
  const canAccessPage = (pageKey: string) => canView(pageKey) && pageModuleAccess[pageKey];
  const navItems = [
    ...(canAccessPage('dashboards')
      ? [{ label: tr.shell.nav.dashboards, icon: LayoutDashboard, path: '/dashboards' }]
      : []),
    ...(canAccessPage('datasets')
      ? [{ label: tr.shell.nav.datasets, icon: Table2, path: '/datasets' }]
      : []),
    ...(canAccessPage('accounts')
      ? [{ label: tr.shell.nav.accounts, icon: Building2, path: '/firmalar' }]
      : []),
    ...(canAccessPage('contacts')
      ? [{ label: tr.shell.nav.contacts, icon: Contact2, path: '/kisiler' }]
      : []),
    ...(canAccessPage('calendar')
      ? [{ label: tr.shell.nav.calendar, icon: CalendarDays, path: '/ajanda' }]
      : []),
    ...(canAccessPage('interactions')
      ? [{ label: tr.shell.nav.interactions, icon: MessageCircle, path: '/gorusmeler' }]
      : []),
    ...(canAccessPage('opportunities')
      ? [{ label: tr.shell.nav.opportunities, icon: Target, path: '/firsatlar' }]
      : []),
    ...(canAccessPage('quotes')
      ? [{ label: tr.shell.nav.quotes, icon: FileText, path: '/teklifler' }]
      : []),
    ...(canAccessPage('post-sale-cases')
      ? [
          {
            label: tr.shell.nav.postSaleSupport,
            icon: HeartHandshake,
            path: '/satis-sonrasi',
          },
        ]
      : []),
    ...(canAccessPage('projects')
      ? [{ label: tr.shell.nav.projects, icon: Briefcase, path: '/projeler' }]
      : []),
    ...(canAccessPage('products')
      ? [{ label: tr.shell.nav.products, icon: Package, path: '/urunler' }]
      : []),
    ...(canAccessPage('price-lists')
      ? [{ label: tr.shell.nav.priceLists, icon: Tags, path: '/fiyat-listeleri' }]
      : []),
    { label: tr.shell.nav.profile, icon: User, path: '/profile' },
    ...(canAccessPage('settings')
      ? [{ label: tr.shell.nav.settings, icon: Settings, path: '/settings' }]
      : []),
    ...(meQuery.data?.isPlatformAdmin
      ? [
          { label: tr.shell.nav.platformAdmin, icon: Building2, path: '/platform-admin' },
          {
            label: tr.shell.nav.platformAdminPageModules,
            icon: Layers,
            path: '/platform-admin/sayfa-modulleri',
          },
        ]
      : []),
  ];

  if (print) {
    return (
      <div className="min-h-screen bg-app-bg">
        <header className="flex h-16 items-center border-b border-app-border bg-app-surface px-5">
          <img src="/pilens-logo.png" alt={tr.common.appName} className="h-11 w-auto" />
        </header>
        <main>
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="fixed inset-x-0 top-0 z-[100] flex h-16 items-center justify-between border-b border-app-border bg-app-surface px-5">
        <img src="/pilens-logo.png" alt={tr.common.appName} className="h-11 w-auto" />
        <div className="flex items-center gap-4">
          {meQuery.data && (
            <span className="hidden text-sm font-semibold text-app-brand sm:inline">
              {tr.shell.welcome(meQuery.data.name)}
            </span>
          )}
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-danger hover:bg-app-bg-muted"
            aria-label={tr.shell.logout}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <nav
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        className={clsx(
          'fixed top-16 bottom-0 left-0 z-[90] hidden flex-col overflow-hidden border-r border-app-border bg-app-surface transition-[width] duration-200 md:flex',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        <ul className="flex flex-col py-3">
          {navItems.map(({ label, icon: Icon, path }) => {
            const isActive = path !== undefined && location.pathname.startsWith(path);
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={path === undefined}
                  onClick={() => path && navigate(path)}
                  className={clsx(
                    'flex h-12 w-full items-center gap-3 whitespace-nowrap cursor-pointer hover:bg-app-bg hover:text-app-text disabled:cursor-not-allowed disabled:opacity-50',
                    isActive ? 'bg-app-bg text-app-brand' : 'text-app-muted',
                  )}
                >
                  <span className="inline-flex w-16 shrink-0 items-center justify-center">
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="pt-16 md:pl-16">
        <div className="p-6 md:p-8">{children}</div>
      </main>

      <ChatbotWidget />
    </div>
  );
}
