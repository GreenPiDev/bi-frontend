import { LayoutDashboard, LogOut, Settings, Table2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useMeQuery, useLogoutMutation } from '../features/auth/use-auth';
import { tr } from '../i18n/tr';

const navItems = [
  { label: tr.shell.nav.dashboards, icon: LayoutDashboard },
  { label: tr.shell.nav.datasets, icon: Table2 },
  { label: tr.shell.nav.settings, icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const meQuery = useMeQuery();
  const logoutMutation = useLogoutMutation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="fixed inset-x-0 top-0 z-[100] flex h-16 items-center justify-between border-b border-app-border bg-app-surface px-5">
        <span className="text-lg font-bold text-app-brand">{tr.common.appName}</span>
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
          {navItems.map(({ label, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                className="flex h-12 w-full items-center gap-3 whitespace-nowrap text-app-muted hover:bg-app-bg hover:text-app-text"
              >
                <span className="inline-flex w-16 shrink-0 items-center justify-center">
                  <Icon size={20} />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="pt-16 md:pl-16">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
