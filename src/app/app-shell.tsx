import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  Contact2,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  LogOut,
  type LucideIcon,
  Mail,
  MessageCircle,
  Package,
  Settings,
  Table2,
  Tags,
  Target,
  Truck,
  User,
  Warehouse,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { FloatingWidgetsDock } from '../components/ui/floating-widgets-dock';
import { ChatbotWidget } from '../features/chatbot/chatbot-widget';
import { useMeQuery, useLogoutMutation } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import { MessagingWidget } from '../features/crm/messaging-widget';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { useUnreadConversationsTotal } from '../features/crm/use-messages';
import { tr } from '../i18n/tr';

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  badgeCount?: number;
}

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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string, currentlyCollapsed: boolean) =>
    setCollapsedGroups((prev) => ({ ...prev, [key]: !currentlyCollapsed }));
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
    'purchase-orders': useIsPageModuleAccessible('purchase-orders'),
    stock: useIsPageModuleAccessible('stock'),
    messages: useIsPageModuleAccessible('messages'),
    settings: useIsPageModuleAccessible('settings'),
  };
  const canAccessPage = (pageKey: string) => canView(pageKey) && pageModuleAccess[pageKey];
  const canAccessMessages = canAccessPage('messages');
  const unreadConversationsTotal = useUnreadConversationsTotal(canAccessMessages);

  const navGroups: { key: string; label: string; icon: LucideIcon; items: NavItem[] }[] = [
    {
      key: 'analytics',
      label: tr.shell.navGroups.analytics,
      icon: LayoutDashboard,
      items: [
        ...(canAccessPage('dashboards')
          ? [{ label: tr.shell.nav.dashboards, icon: LayoutDashboard, path: '/dashboards' }]
          : []),
        ...(canAccessPage('datasets')
          ? [{ label: tr.shell.nav.datasets, icon: Table2, path: '/datasets' }]
          : []),
      ],
    },
    {
      key: 'accounts',
      label: tr.shell.navGroups.accounts,
      icon: Building2,
      items: [
        ...(canAccessPage('accounts')
          ? [{ label: tr.shell.nav.accounts, icon: Building2, path: '/firmalar' }]
          : []),
        ...(canAccessPage('contacts')
          ? [{ label: tr.shell.nav.contacts, icon: Contact2, path: '/kisiler' }]
          : []),
      ],
    },
    {
      key: 'salesProcess',
      label: tr.shell.navGroups.salesProcess,
      icon: Target,
      items: [
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
        ...(canAccessMessages
          ? [
              {
                label: tr.shell.nav.messages,
                icon: Mail,
                path: '/mesajlar',
                badgeCount: unreadConversationsTotal,
              },
            ]
          : []),
      ],
    },
    {
      key: 'operations',
      label: tr.shell.navGroups.operations,
      icon: Package,
      items: [
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
        ...(canAccessPage('purchase-orders')
          ? [{ label: tr.shell.nav.purchaseOrders, icon: Truck, path: '/siparisler' }]
          : []),
        ...(canAccessPage('stock')
          ? [{ label: tr.shell.nav.stock, icon: Warehouse, path: '/stok' }]
          : []),
        ...(canAccessPage('products')
          ? [{ label: tr.shell.nav.products, icon: Package, path: '/urunler' }]
          : []),
        ...(canAccessPage('price-lists')
          ? [{ label: tr.shell.nav.priceLists, icon: Tags, path: '/fiyat-listeleri' }]
          : []),
      ],
    },
    {
      key: 'system',
      label: tr.shell.navGroups.system,
      icon: Settings,
      items: [
        { label: tr.shell.nav.profile, icon: User, path: '/profile' },
        ...(canAccessPage('settings')
          ? [{ label: tr.shell.nav.settings, icon: Settings, path: '/settings' }]
          : []),
      ],
    },
    {
      key: 'platformAdmin',
      label: tr.shell.navGroups.platformAdmin,
      icon: Layers,
      items: meQuery.data?.isPlatformAdmin
        ? [
            { label: tr.shell.nav.platformAdmin, icon: Building2, path: '/platform-admin' },
            {
              label: tr.shell.nav.platformAdminPageModules,
              icon: Layers,
              path: '/platform-admin/sayfa-modulleri',
            },
          ]
        : [],
    },
  ].filter((group) => group.items.length > 0);

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
            <div className="hidden items-center gap-2 sm:flex">
              {meQuery.data.avatarUrl ? (
                <img
                  src={meQuery.data.avatarUrl}
                  alt={tr.profile.avatarSection.alt}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-bg-muted text-xs font-bold text-app-muted">
                  {meQuery.data.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-app-brand">
                {tr.shell.welcome(meQuery.data.name)}
              </span>
            </div>
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
          {navGroups.map((group) => {
            const containsActiveItem = group.items.some((item) =>
              location.pathname.startsWith(item.path),
            );
            const isCollapsed = collapsedGroups[group.key] ?? !containsActiveItem;
            return (
              <li key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key, isCollapsed)}
                  className="flex h-9 w-full cursor-pointer items-center gap-3 whitespace-nowrap text-app-muted transition-colors duration-200 hover:bg-app-brand/10 hover:text-app-text"
                >
                  <span className="relative inline-flex h-5 w-16 shrink-0 items-center justify-center">
                    <group.icon
                      size={18}
                      className={clsx(
                        'absolute transition-all duration-300 ease-in-out',
                        sidebarOpen ? 'scale-50 opacity-0' : 'scale-100 opacity-100',
                      )}
                    />
                    <ChevronDown
                      size={14}
                      className={clsx(
                        'absolute transition-all duration-300 ease-in-out',
                        sidebarOpen ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                        isCollapsed && '-rotate-90',
                      )}
                    />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide">{group.label}</span>
                </button>
                <div
                  className={clsx(
                    'grid transition-[grid-template-rows] duration-300 ease-in-out',
                    isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
                  )}
                >
                  <ul className="overflow-hidden">
                    {group.items.map(({ label, icon: Icon, path, badgeCount }) => {
                      const isActive = location.pathname.startsWith(path);
                      const unreadCount = badgeCount ?? 0;
                      const hasUnread = unreadCount > 0;
                      return (
                        <li key={label}>
                          <button
                            type="button"
                            onClick={() => navigate(path)}
                            className={clsx(
                              'flex h-12 w-full cursor-pointer items-center gap-3 whitespace-nowrap transition-colors duration-200 hover:bg-app-brand/10 hover:text-app-text',
                              hasUnread && 'text-app-danger',
                              !hasUnread &&
                                (isActive ? 'bg-app-bg text-app-brand' : 'text-app-muted'),
                            )}
                          >
                            <span className="relative inline-flex w-16 shrink-0 items-center justify-center">
                              <Icon size={20} />
                              {hasUnread && (
                                <span
                                  className="absolute top-1 right-3 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold text-white"
                                  aria-label={tr.crm.messages.unreadCountAria(unreadCount)}
                                >
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                              )}
                            </span>
                            <span className="text-sm font-semibold">{label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="pt-16 md:pl-16">
        <div className="p-6 md:p-8">{children}</div>
      </main>

      <FloatingWidgetsDock>
        <ChatbotWidget />
        {canAccessPage('messages') && <MessagingWidget />}
      </FloatingWidgetsDock>
    </div>
  );
}
