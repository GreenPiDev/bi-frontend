import { Building2, Contact2, LayoutDashboard, LogOut, Settings, Table2, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatbotWidget } from '../features/chatbot/chatbot-widget';
import { useMeQuery, useLogoutMutation } from '../features/auth/use-auth';
import { useIsModuleEnabled } from '../features/crm/use-tenant-modules';
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

  const isAdmin = meQuery.data?.role === 'OWNER' || meQuery.data?.role === 'ADMIN';
  const crmEnabled = useIsModuleEnabled('crm');
  const navItems = [
    { label: tr.shell.nav.dashboards, icon: LayoutDashboard, path: '/dashboards' },
    { label: tr.shell.nav.datasets, icon: Table2, path: '/datasets' },
    ...(crmEnabled
      ? [
          { label: tr.shell.nav.accounts, icon: Building2, path: '/firmalar' },
          { label: tr.shell.nav.contacts, icon: Contact2, path: '/kisiler' },
        ]
      : []),
    { label: tr.shell.nav.profile, icon: User, path: '/profile' },
    { label: tr.shell.nav.settings, icon: Settings, path: isAdmin ? '/settings' : undefined },
    ...(meQuery.data?.isPlatformAdmin
      ? [{ label: tr.shell.nav.platformAdmin, icon: Building2, path: '/platform-admin' }]
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
                    'flex h-12 w-full items-center gap-3 whitespace-nowrap hover:bg-app-bg hover:text-app-text disabled:cursor-not-allowed disabled:opacity-50',
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
