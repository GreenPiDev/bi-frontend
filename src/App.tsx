import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AccountDetailPage } from './app/account-detail-page';
import { AccountFormPage } from './app/account-form-page';
import { AccountsListPage } from './app/accounts-list-page';
import { CalendarPage } from './app/calendar-page';
import { ContactDetailPage } from './app/contact-detail-page';
import { ContactFormPage } from './app/contact-form-page';
import { ContactsListPage } from './app/contacts-list-page';
import { CrmImportPage } from './app/crm-import-page';
import { DashboardEditPage } from './app/dashboard-edit-page';
import { DashboardViewPage } from './app/dashboard-view-page';
import { DashboardsListPage } from './app/dashboards-list-page';
import { DatasetDetailPage } from './app/dataset-detail-page';
import { DatasetProcessingPage } from './app/dataset-processing-page';
import { DatasetUploadPage } from './app/dataset-upload-page';
import { DatasetsListPage } from './app/datasets-list-page';
import { InteractionDetailPage } from './app/interaction-detail-page';
import { InteractionFormPage } from './app/interaction-form-page';
import { InteractionsListPage } from './app/interactions-list-page';
import { LoginPage } from './app/login-page';
import { NewCustomerPage } from './app/new-customer-page';
import { OnboardingPage } from './app/onboarding-page';
import { OpportunityDetailPage } from './app/opportunity-detail-page';
import { OpportunityFormPage } from './app/opportunity-form-page';
import { OpportunitiesListPage } from './app/opportunities-list-page';
import { PageModuleRoute } from './app/page-module-route';
import { PermissionRoute } from './app/permission-route';
import { PlatformAdminPage } from './app/platform-admin-page';
import { MessageDetailPage } from './app/message-detail-page';
import { MessagesListPage } from './app/messages-list-page';
import { PlatformAdminPageModulesPage } from './app/platform-admin-page-modules-page';
import { PlatformAdminRoute } from './app/platform-admin-route';
import { PriceListFormPage } from './app/price-list-form-page';
import { PriceListsListPage } from './app/price-lists-list-page';
import { ProductDetailPage } from './app/product-detail-page';
import { ProductFormPage } from './app/product-form-page';
import { ProductsListPage } from './app/products-list-page';
import { ProfilePage } from './app/profile-page';
import { ProjectDetailPage } from './app/project-detail-page';
import { ProjectFormPage } from './app/project-form-page';
import { ProjectsListPage } from './app/projects-list-page';
import { ProtectedRoute } from './app/protected-route';
import { PostSaleCaseDetailPage } from './app/post-sale-case-detail-page';
import { PostSaleCaseListPage } from './app/post-sale-case-list-page';
import { PurchaseOrderDetailPage } from './app/purchase-order-detail-page';
import { PurchaseOrderListPage } from './app/purchase-order-list-page';
import { QuoteDetailPage } from './app/quote-detail-page';
import { QuoteFormPage } from './app/quote-form-page';
import { QuotesListPage } from './app/quotes-list-page';
import { SettingsPage } from './app/settings-page';
import { StockListPage } from './app/stock-list-page';
import { hasPermission } from './features/auth/permissions';
import { useMeQuery } from './features/auth/use-auth';
import { usePageAccessQuery } from './features/crm/use-page-access';
import { tr } from './i18n/tr';

function DashboardEditRoute() {
  const { id = '' } = useParams();
  return (
    <PermissionRoute pageKey="dashboards" action="UPDATE" redirectTo={`/dashboards/${id}`}>
      <DashboardEditPage />
    </PermissionRoute>
  );
}

/** Tenant sayfalarinin ortak guard zinciri: giris yapilmis olmali (ProtectedRoute),
 * sayfa VIEW iznine sahip olmali (PermissionRoute - bkz. G1, backend'deki
 * @RequiresPermission(pageKey,'VIEW') ile ayni guvenlik sinirinin frontend karsiligi),
 * ve sayfanin bagli oldugu modul (crm/analytics) tenant'ta acik olmali (PageModuleRoute).
 * Izinsiz erisim denemesi kok / rotasina duser, orada RootRedirect kullaniciyi gercekten
 * erisebildigi ilk sayfaya (yoksa /profile'a) yonlendirir. */
function TenantPageRoute({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  return (
    <ProtectedRoute>
      <PermissionRoute pageKey={pageKey} action="VIEW" redirectTo="/">
        <PageModuleRoute pageKey={pageKey}>{children}</PageModuleRoute>
      </PermissionRoute>
    </ProtectedRoute>
  );
}

/** Sidebar'daki (app-shell.tsx) ile ayni sira - kullanicinin gercekten erisebildigi ilk
 * sayfa. Hicbiri erisilebilir degilse /profile'a duser (her zaman gorunur, bkz. G1). */
const ROOT_REDIRECT_CANDIDATES: readonly { pageKey: string; path: string }[] = [
  { pageKey: 'dashboards', path: '/dashboards' },
  { pageKey: 'datasets', path: '/datasets' },
  { pageKey: 'accounts', path: '/firmalar' },
  { pageKey: 'contacts', path: '/kisiler' },
  { pageKey: 'calendar', path: '/ajanda' },
  { pageKey: 'interactions', path: '/gorusmeler' },
  { pageKey: 'opportunities', path: '/firsatlar' },
  { pageKey: 'quotes', path: '/teklifler' },
  { pageKey: 'post-sale-cases', path: '/satis-sonrasi' },
  { pageKey: 'projects', path: '/projeler' },
  { pageKey: 'purchase-orders', path: '/siparisler' },
  { pageKey: 'stock', path: '/stok' },
  { pageKey: 'products', path: '/urunler' },
  { pageKey: 'price-lists', path: '/fiyat-listeleri' },
  { pageKey: 'messages', path: '/mesajlar' },
  { pageKey: 'settings', path: '/settings' },
];

function RootRedirect() {
  const meQuery = useMeQuery();
  // Platform-admin hicbir tenant sayfa/modul verisine ihtiyac duymaz - sorguyu
  // sadece normal tenant kullanicisi icin calistiririz (aksi halde gereksiz yere
  // bu sorgunun donmesini bekleriz).
  const isPlatformAdmin = meQuery.data?.isPlatformAdmin ?? false;
  const pageAccessQuery = usePageAccessQuery({ enabled: !!meQuery.data && !isPlatformAdmin });

  if (meQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-app-muted">
        {tr.common.loading}
      </div>
    );
  }

  if (!meQuery.data) {
    return <Navigate to="/login" replace />;
  }

  if (isPlatformAdmin) {
    return <Navigate to="/platform-admin" replace />;
  }

  if (pageAccessQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-app-muted">
        {tr.common.loading}
      </div>
    );
  }

  const permissions = meQuery.data.permissions;
  const isModuleAccessible = (pageKey: string) => {
    const entry = pageAccessQuery.data?.find((row) => row.pageKey === pageKey);
    return entry?.accessible ?? true;
  };
  const firstAccessible = ROOT_REDIRECT_CANDIDATES.find(
    ({ pageKey }) => hasPermission(permissions, pageKey, 'VIEW') && isModuleAccessible(pageKey),
  );

  return <Navigate to={firstAccessible?.path ?? '/profile'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/platform-admin"
          element={
            <PlatformAdminRoute>
              <PlatformAdminPage />
            </PlatformAdminRoute>
          }
        />
        <Route
          path="/new-customer"
          element={
            <PlatformAdminRoute>
              <NewCustomerPage />
            </PlatformAdminRoute>
          }
        />
        <Route
          path="/platform-admin/sayfa-modulleri"
          element={
            <PlatformAdminRoute>
              <PlatformAdminPageModulesPage />
            </PlatformAdminRoute>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards"
          element={
            <TenantPageRoute pageKey="dashboards">
              <DashboardsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/dashboards/:id"
          element={
            <TenantPageRoute pageKey="dashboards">
              <DashboardViewPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/dashboards/edit/:id"
          element={
            <TenantPageRoute pageKey="dashboards">
              <DashboardEditRoute />
            </TenantPageRoute>
          }
        />
        <Route
          path="/datasets"
          element={
            <TenantPageRoute pageKey="datasets">
              <DatasetsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/datasets/upload"
          element={
            <TenantPageRoute pageKey="datasets">
              <DatasetUploadPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/datasets/processing/:dataSourceId"
          element={
            <TenantPageRoute pageKey="datasets">
              <DatasetProcessingPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/datasets/:id"
          element={
            <TenantPageRoute pageKey="datasets">
              <DatasetDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firmalar"
          element={
            <TenantPageRoute pageKey="accounts">
              <AccountsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firmalar/yeni"
          element={
            <TenantPageRoute pageKey="accounts">
              <AccountFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firmalar/ice-aktar"
          element={
            <TenantPageRoute pageKey="accounts">
              <CrmImportPage entity="accounts" />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firmalar/:id"
          element={
            <TenantPageRoute pageKey="accounts">
              <AccountDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firmalar/:id/duzenle"
          element={
            <TenantPageRoute pageKey="accounts">
              <AccountFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/kisiler"
          element={
            <TenantPageRoute pageKey="contacts">
              <ContactsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/kisiler/yeni"
          element={
            <TenantPageRoute pageKey="contacts">
              <ContactFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/kisiler/ice-aktar"
          element={
            <TenantPageRoute pageKey="contacts">
              <CrmImportPage entity="contacts" />
            </TenantPageRoute>
          }
        />
        <Route
          path="/kisiler/:id"
          element={
            <TenantPageRoute pageKey="contacts">
              <ContactDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/kisiler/:id/duzenle"
          element={
            <TenantPageRoute pageKey="contacts">
              <ContactFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/ajanda"
          element={
            <TenantPageRoute pageKey="calendar">
              <CalendarPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/gorusmeler"
          element={
            <TenantPageRoute pageKey="interactions">
              <InteractionsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/gorusmeler/yeni"
          element={
            <TenantPageRoute pageKey="interactions">
              <InteractionFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/gorusmeler/:id"
          element={
            <TenantPageRoute pageKey="interactions">
              <InteractionDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firsatlar"
          element={
            <TenantPageRoute pageKey="opportunities">
              <OpportunitiesListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firsatlar/yeni"
          element={
            <TenantPageRoute pageKey="opportunities">
              <OpportunityFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firsatlar/:id"
          element={
            <TenantPageRoute pageKey="opportunities">
              <OpportunityDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/firsatlar/:id/duzenle"
          element={
            <TenantPageRoute pageKey="opportunities">
              <OpportunityFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/teklifler"
          element={
            <TenantPageRoute pageKey="quotes">
              <QuotesListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/teklifler/yeni"
          element={
            <TenantPageRoute pageKey="quotes">
              <QuoteFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/teklifler/:id"
          element={
            <TenantPageRoute pageKey="quotes">
              <QuoteDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/mesajlar"
          element={
            <TenantPageRoute pageKey="messages">
              <MessagesListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/mesajlar/:id"
          element={
            <TenantPageRoute pageKey="messages">
              <MessageDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/satis-sonrasi"
          element={
            <TenantPageRoute pageKey="post-sale-cases">
              <PostSaleCaseListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/satis-sonrasi/:id"
          element={
            <TenantPageRoute pageKey="post-sale-cases">
              <PostSaleCaseDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/projeler"
          element={
            <TenantPageRoute pageKey="projects">
              <ProjectsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/projeler/yeni"
          element={
            <TenantPageRoute pageKey="projects">
              <ProjectFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/projeler/:id"
          element={
            <TenantPageRoute pageKey="projects">
              <ProjectDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/projeler/:id/duzenle"
          element={
            <TenantPageRoute pageKey="projects">
              <ProjectFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/siparisler"
          element={
            <TenantPageRoute pageKey="purchase-orders">
              <PurchaseOrderListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/siparisler/:id"
          element={
            <TenantPageRoute pageKey="purchase-orders">
              <PurchaseOrderDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/stok"
          element={
            <TenantPageRoute pageKey="stock">
              <StockListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/urunler"
          element={
            <TenantPageRoute pageKey="products">
              <ProductsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/urunler/yeni"
          element={
            <TenantPageRoute pageKey="products">
              <ProductFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/urunler/duzenle/:id"
          element={
            <TenantPageRoute pageKey="products">
              <ProductFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/urunler/:id"
          element={
            <TenantPageRoute pageKey="products">
              <ProductDetailPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/fiyat-listeleri"
          element={
            <TenantPageRoute pageKey="price-lists">
              <PriceListsListPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/fiyat-listeleri/yeni"
          element={
            <TenantPageRoute pageKey="price-lists">
              <PriceListFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/fiyat-listeleri/:id/duzenle"
          element={
            <TenantPageRoute pageKey="price-lists">
              <PriceListFormPage />
            </TenantPageRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowPlatformAdmin>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PermissionRoute pageKey="settings" action="VIEW" redirectTo="/">
                <SettingsPage />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
