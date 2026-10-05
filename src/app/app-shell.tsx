import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact2,
  FileStack,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  LogOut,
  type LucideIcon,
  Mail,
  MessageCircle,
  PanelLeft,
  Search,
  Settings,
  Table2,
  Target,
  Truck,
  User,
  Warehouse,
} from 'lucide-react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { FloatingWidgetsDock } from '../components/ui/floating-widgets-dock';
import { ChatbotWidget } from '../features/chatbot/chatbot-widget';
import { useMeQuery, useLogoutMutation } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import { MessagingWidget } from '../features/crm/messaging-widget';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { useUnreadConversationsTotal } from '../features/crm/use-messages';
import { NotificationBell } from '../features/notifications/notification-bell';
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
  /** print=true iken varsayilan PiLens logosu yerine gosterilecek logo -
   * teklif PDF'i gibi musteriye giden belgelerde tenant'in kendi sirket logosu
   * (bkz. /settings?tab=crm "Sirket Logosu") kullanilir. Verilmezse/null ise
   * PiLens logosu gosterilmeye devam eder (dashboard PDF export'u gibi). */
  printLogoUrl?: string | null;
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

export function AppShell({ children, print = false, printLogoUrl }: AppShellProps) {
  const meQuery = useMeQuery();
  const logoutMutation = useLogoutMutation();
  // Header ortasinda arka planda buyuk "filigran" olarak gosterilen sirket logosu
  // (bkz. /settings?tab=crm "Sirket Logosu") - print modda kullanilmiyor, o zaten
  // kendi printLogoUrl'ini ayri render ediyor.
  const tenantProfileQuery = useTenantProfileQuery(!print);
  const watermarkLogoUrl = tenantProfileQuery.data?.logoUrl;
  const [sidebarOpen, setSidebarOpenState] = useState(persistedSidebarOpen);
  const setSidebarOpen = (value: boolean) => {
    persistedSidebarOpen = value;
    setSidebarOpenState(value);
  };
  const [navSearch, setNavSearch] = useState('');
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const [hoveredNavItem, setHoveredNavItem] = useState<{ label: string; top: number } | null>(null);

  function toggleSidebar() {
    if (sidebarOpen) {
      setNavSearch('');
    }
    setSidebarOpen(!sidebarOpen);
  }

  // Nav icindeki bos bir alana (link/input olmayan bir yer) tiklaninca sidebar
  // acilip kapansin - link/input tiklamalari kendi davranisini (navigate/yazma)
  // yapmaya devam eder, bu handler sadece onlarin disinda kalan bosluklar icin
  // devreye girer.
  function handleNavAreaClick(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input')) {
      return;
    }
    if (sidebarOpen) {
      setNavSearch('');
    }
    setSidebarOpen(!sidebarOpen);
  }

  // Bos alanin uzerindeyken kullaniciya "tiklarsan acilir/kapanir" hissini veren
  // kucuk bir ok gostergesi - sidebarin kendi arka plan rengini degistirmiyoruz,
  // sadece hafif bir yer degistirme (nudge) animasyonu + sag kenarda bir ok.
  const [emptyAreaHovered, setEmptyAreaHovered] = useState(false);
  function handleNavMouseOver(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    setEmptyAreaHovered(!target.closest('a, button, input'));
  }

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (navRef.current?.contains(target) || toggleButtonRef.current?.contains(target)) {
        return;
      }
      persistedSidebarOpen = false;
      setSidebarOpenState(false);
      setNavSearch('');
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [sidebarOpen]);

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
    'quote-templates': useIsPageModuleAccessible('quote-templates'),
    'post-sale-cases': useIsPageModuleAccessible('post-sale-cases'),
    projects: useIsPageModuleAccessible('projects'),
    'purchase-orders': useIsPageModuleAccessible('purchase-orders'),
    stock: useIsPageModuleAccessible('stock'),
    warehouses: useIsPageModuleAccessible('warehouses'),
    messages: useIsPageModuleAccessible('messages'),
    settings: useIsPageModuleAccessible('settings'),
  };
  const canAccessPage = (pageKey: string) => canView(pageKey) && pageModuleAccess[pageKey];
  const canAccessMessages = canAccessPage('messages');
  const unreadConversationsTotal = useUnreadConversationsTotal(canAccessMessages);

  const navItems: NavItem[] = [
    ...(canAccessPage('accounts')
      ? [{ label: tr.shell.nav.accounts, icon: Building2, path: '/firmalar' }]
      : []),
    ...(canAccessPage('contacts')
      ? [{ label: tr.shell.nav.contacts, icon: Contact2, path: '/kisiler' }]
      : []),
    ...(canAccessPage('interactions')
      ? [{ label: tr.shell.nav.interactions, icon: MessageCircle, path: '/gorusmeler' }]
      : []),
    ...(canAccessPage('opportunities')
      ? [{ label: tr.shell.nav.opportunities, icon: Target, path: '/firsatlar' }]
      : []),
    ...(canAccessPage('calendar')
      ? [{ label: tr.shell.nav.calendar, icon: CalendarDays, path: '/ajanda' }]
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
    ...(canAccessPage('projects')
      ? [{ label: tr.shell.nav.projects, icon: Briefcase, path: '/projeler' }]
      : []),
    ...(canAccessPage('quotes')
      ? [{ label: tr.shell.nav.quotes, icon: FileText, path: '/teklifler' }]
      : []),
    ...(canAccessPage('quote-templates')
      ? [
          {
            label: tr.shell.nav.quoteTemplates,
            icon: FileStack,
            path: '/teklif-sablonlari',
          },
        ]
      : []),
    ...(canAccessPage('purchase-orders')
      ? [{ label: tr.shell.nav.purchaseOrders, icon: Truck, path: '/siparisler' }]
      : []),
    ...(canAccessPage('post-sale-cases')
      ? [{ label: tr.shell.nav.postSaleSupport, icon: HeartHandshake, path: '/satis-sonrasi' }]
      : []),
    ...(canAccessPage('stock') ||
    canAccessPage('product-lists') ||
    canAccessPage('products') ||
    canAccessPage('warehouses')
      ? [{ label: tr.shell.nav.inventory, icon: Warehouse, path: '/envanter' }]
      : []),
    ...(canAccessPage('datasets')
      ? [{ label: tr.shell.nav.datasets, icon: Table2, path: '/datasets' }]
      : []),
    ...(canAccessPage('dashboards')
      ? [{ label: tr.shell.nav.dashboards, icon: LayoutDashboard, path: '/dashboards' }]
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
      <div className="print-mode min-h-screen bg-white">
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-5">
          <img
            src={printLogoUrl || '/pilens-logo.png'}
            alt={tr.common.appName}
            className="h-11 w-auto object-contain"
          />
        </header>
        <main>
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="fixed inset-x-0 top-0 z-[100] flex h-16 items-center border-b border-app-border bg-app-surface">
        <button
          ref={toggleButtonRef}
          type="button"
          onClick={toggleSidebar}
          className={clsx(
            'flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center border-b transition-colors duration-200',
            sidebarOpen
              ? 'border-app-border bg-app-surface text-app-brand-dark hover:bg-app-bg-muted'
              : 'border-white/20 bg-app-brand text-white hover:bg-app-brand-dark',
          )}
          aria-label={sidebarOpen ? tr.shell.collapseSidebar : tr.shell.expandSidebar}
        >
          <PanelLeft size={20} />
        </button>
        <div className="flex flex-1 items-center justify-between pr-5">
          <img src="/pilens-logo.png" alt={tr.common.appName} className="h-11 w-auto" />
          <div className="flex items-center gap-4">
            <NotificationBell />
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
        </div>
      </header>

      <nav
        ref={navRef}
        onClick={handleNavAreaClick}
        onMouseOver={handleNavMouseOver}
        onMouseLeave={() => setEmptyAreaHovered(false)}
        className={clsx(
          'fixed top-16 bottom-0 left-0 z-[90] hidden flex-col overflow-hidden border-r border-app-brand-dark bg-app-brand transition-[width] duration-200 md:flex',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        <div className="px-3 pt-3 pb-2">
          <label className="relative flex items-center">
            <Search
              size={16}
              className="pointer-events-none absolute left-2.5 shrink-0 text-white"
            />
            <input
              type="text"
              value={navSearch}
              onChange={(event) => setNavSearch(event.target.value)}
              placeholder={tr.shell.searchPlaceholder}
              aria-label={tr.shell.searchPlaceholder}
              className={clsx(
                'h-9 rounded-lg border border-white/20 bg-white/10 pl-8 pr-2 text-sm text-white outline-none transition-[width,opacity] duration-200 placeholder:text-white/50 focus:border-white/60',
                sidebarOpen ? 'w-full opacity-100' : 'w-9 opacity-0',
              )}
            />
          </label>
        </div>
        <ul className="flex flex-col overflow-y-auto pb-3">
          {visibleNavItems.length === 0 && (
            <li className="px-5 py-3 text-xs text-white whitespace-nowrap">
              {tr.shell.searchNoResults}
            </li>
          )}
          {visibleNavItems.map(({ label, icon: Icon, path, badgeCount }) => {
            const isActive = location.pathname.startsWith(path);
            const unreadCount = badgeCount ?? 0;
            const hasUnread = unreadCount > 0;
            return (
              <li
                key={label}
                onMouseEnter={(event) => {
                  if (!sidebarOpen) {
                    setHoveredNavItem({
                      label,
                      top: event.currentTarget.getBoundingClientRect().top + 20,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredNavItem(null)}
              >
                <Link
                  to={path}
                  className={clsx(
                    'flex h-10 w-full cursor-pointer items-center whitespace-nowrap text-white transition-colors duration-200',
                    !isActive && 'hover:bg-white/15',
                    !isActive && hasUnread && 'text-red-300',
                  )}
                >
                  <span
                    className={clsx(
                      'inline-flex h-9 items-center gap-3 overflow-hidden rounded-lg transition-colors duration-200',
                      sidebarOpen ? 'mr-2 ml-2 flex-1' : 'mx-auto w-10 shrink-0',
                      isActive && 'bg-white text-app-brand',
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
                </Link>
              </li>
            );
          })}
        </ul>
        {watermarkLogoUrl && (
          <div className="mt-auto flex shrink-0 items-center justify-center overflow-hidden border-t border-white/20 px-3 py-4">
            <img
              src={watermarkLogoUrl}
              alt=""
              aria-hidden="true"
              className={clsx(
                'object-contain opacity-80 transition-[height,width] duration-200',
                sidebarOpen ? 'h-16 w-full' : 'h-8 w-8',
              )}
            />
          </div>
        )}
      </nav>

      {!sidebarOpen && hoveredNavItem && (
        <span
          style={{ top: hoveredNavItem.top }}
          className="pointer-events-none fixed left-16 z-[100] ml-2 -translate-y-1/2 rounded-md bg-app-brand-dark px-3 py-2 text-base font-semibold whitespace-nowrap text-white shadow-lg"
        >
          {hoveredNavItem.label}
        </span>
      )}

      {/* Bos alan hover gostergesi: tiklarsan sidebar acilir/kapanir hissini veren,
       * arka fonsuz lacivert bir ok - sidebar ve ok yerinden oynamaz, ok oldugu
       * yerde belirip animasyonlu sekilde kaybolur (sadece opaklik gecisi). */}
      <div
        aria-hidden="true"
        className={clsx(
          'pointer-events-none fixed top-1/2 z-[95] hidden -translate-y-1/2 items-center justify-center text-app-brand-dark transition-opacity duration-200 md:flex',
          sidebarOpen ? 'left-60' : 'left-16',
          emptyAreaHovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        {sidebarOpen ? (
          <ChevronLeft size={22} strokeWidth={2.5} />
        ) : (
          <ChevronRight size={22} strokeWidth={2.5} />
        )}
      </div>

      <main className="pt-16 md:pl-16">
        <div className="p-6 pb-24 md:p-8 md:pb-24">{children}</div>
      </main>

      <FloatingWidgetsDock>
        <ChatbotWidget />
        {canAccessPage('messages') && <MessagingWidget />}
      </FloatingWidgetsDock>
    </div>
  );
}
