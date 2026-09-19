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
  type LucideIcon,
  Mail,
  MessageCircle,
  Search,
  Settings,
  Table2,
  Target,
  Truck,
  User,
  Warehouse,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
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

// AppShell paylasilan/kalici bir layout degil - her sayfa kendi icinde <AppShell>
// render eder (bkz. App.tsx route tanimlari, Outlet kullanilmiyor). Yani sidebar nav
// oguna tiklanip navigate() cagrildiginda eski sayfa unmount, yenisi mount olur ve
// AppShell'in kendi state'i sifirlanir - fare hala sidebar uzerindeyken bile sidebar
// kapaniyormus gibi gorunur. Acik/kapali durumu React state'inin disinda, modul
// seviyesinde tutup yeni instance'in baslangic degeri olarak kullanmak bu remount'u
// "atlatir": fare gercekten ayrilmadiysa yeni mouseenter/mouseleave hic tetiklenmez,
// deger true olarak kalir.
let persistedSidebarOpen = false;

export function AppShell({ children, print = false }: AppShellProps) {
  const meQuery = useMeQuery();
  const logoutMutation = useLogoutMutation();
  const [sidebarOpen, setSidebarOpenState] = useState(persistedSidebarOpen);
  const setSidebarOpen = (value: boolean) => {
    persistedSidebarOpen = value;
    setSidebarOpenState(value);
  };
  const [navSearch, setNavSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const closeSidebarTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeSidebarTimeoutRef.current) {
        window.clearTimeout(closeSidebarTimeoutRef.current);
      }
    };
  }, []);

  function handleSidebarMouseEnter() {
    if (closeSidebarTimeoutRef.current) {
      window.clearTimeout(closeSidebarTimeoutRef.current);
      closeSidebarTimeoutRef.current = null;
    }
    setSidebarOpen(true);
  }

  function handleSidebarMouseLeave() {
    // Sayfa navigasyonu sirasinda DOM yeniden render olurken tarayici bazen
    // imlec hic hareket etmemisken de bir mouseleave tetikliyor (hit-test'in
    // yeniden hesaplanmasi) - kisa bir gecikmeyle kapatip, bu sure icinde
    // gercek bir mouseenter gelirse iptal ederek yanlis kapanmayi onluyoruz.
    closeSidebarTimeoutRef.current = window.setTimeout(() => {
      setSidebarOpen(false);
      setNavSearch('');
    }, 150);
  }

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
    'product-lists': useIsPageModuleAccessible('product-lists'),
    products: useIsPageModuleAccessible('products'),
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

  const navItems: NavItem[] = [
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
    ...(canAccessPage('post-sale-cases')
      ? [{ label: tr.shell.nav.postSaleSupport, icon: HeartHandshake, path: '/satis-sonrasi' }]
      : []),
    ...(canAccessPage('projects')
      ? [{ label: tr.shell.nav.projects, icon: Briefcase, path: '/projeler' }]
      : []),
    ...(canAccessPage('purchase-orders')
      ? [{ label: tr.shell.nav.purchaseOrders, icon: Truck, path: '/siparisler' }]
      : []),
    ...(canAccessPage('stock') || canAccessPage('product-lists') || canAccessPage('products')
      ? [{ label: tr.shell.nav.inventory, icon: Warehouse, path: '/envanter' }]
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

  const normalizedSearch = navSearch.trim().toLocaleLowerCase('tr');
  const visibleNavItems = normalizedSearch
    ? navItems.filter((item) => item.label.toLocaleLowerCase('tr').includes(normalizedSearch))
    : navItems;

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
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={clsx(
          'fixed top-16 bottom-0 left-0 z-[90] hidden flex-col overflow-hidden border-r border-app-border bg-app-surface transition-[width] duration-200 md:flex',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        <div className="px-3 pt-3 pb-2">
          <label className="relative flex items-center">
            <Search
              size={16}
              className="pointer-events-none absolute left-2.5 shrink-0 text-app-muted"
            />
            <input
              type="text"
              value={navSearch}
              onChange={(event) => setNavSearch(event.target.value)}
              placeholder={tr.shell.searchPlaceholder}
              aria-label={tr.shell.searchPlaceholder}
              className={clsx(
                'h-9 rounded-lg border border-app-border bg-app-bg pl-8 pr-2 text-sm text-app-text outline-none transition-[width,opacity] duration-200 focus:ring-2 focus:ring-app-primary',
                sidebarOpen ? 'w-full opacity-100' : 'w-9 opacity-0',
              )}
            />
          </label>
        </div>
        <ul className="flex flex-col overflow-y-auto pb-3">
          {visibleNavItems.length === 0 && (
            <li className="px-5 py-3 text-xs text-app-muted whitespace-nowrap">
              {tr.shell.searchNoResults}
            </li>
          )}
          {visibleNavItems.map(({ label, icon: Icon, path, badgeCount }) => {
            const isActive = location.pathname.startsWith(path);
            const unreadCount = badgeCount ?? 0;
            const hasUnread = unreadCount > 0;
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => navigate(path)}
                  className={clsx(
                    'flex h-12 w-full cursor-pointer items-center whitespace-nowrap transition-colors duration-200',
                    !isActive && 'hover:bg-app-brand/10 hover:text-app-text',
                    !isActive && hasUnread && 'text-app-danger',
                    !isActive && !hasUnread && 'text-app-muted',
                  )}
                >
                  <span
                    className={clsx(
                      'inline-flex h-9 items-center gap-3 overflow-hidden rounded-lg transition-colors duration-200',
                      sidebarOpen ? 'mr-2 ml-2 flex-1' : 'mx-auto w-10 shrink-0',
                      isActive && 'bg-app-brand text-white',
                    )}
                  >
                    <span
                      className={clsx(
                        'relative inline-flex shrink-0 items-center justify-center',
                        sidebarOpen ? 'w-14' : 'w-10',
                      )}
                    >
                      <Icon size={20} />
                      {hasUnread && (
                        <span
                          className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold text-white"
                          aria-label={tr.crm.messages.unreadCountAria(unreadCount)}
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </span>
                    <span className="pr-3 text-sm font-semibold">{label}</span>
                  </span>
                </button>
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
