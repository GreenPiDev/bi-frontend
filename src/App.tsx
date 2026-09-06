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
import { InvitationAcceptPage } from './app/invitation-accept-page';
import { LoginPage } from './app/login-page';
import { OnboardingPage } from './app/onboarding-page';
import { PageModuleRoute } from './app/page-module-route';
import { PermissionRoute } from './app/permission-route';
import { PlatformAdminPage } from './app/platform-admin-page';
import { PlatformAdminPageModulesPage } from './app/platform-admin-page-modules-page';
import { PlatformAdminRoute } from './app/platform-admin-route';
import { ProfilePage } from './app/profile-page';
import { ProtectedRoute } from './app/protected-route';
import { RegisterPage } from './app/register-page';
import { SettingsPage } from './app/settings-page';

function DashboardEditRoute() {
  const { id = '' } = useParams();
  return (
    <PermissionRoute pageKey="dashboards" action="UPDATE" redirectTo={`/dashboards/${id}`}>
      <DashboardEditPage />
    </PermissionRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitationAcceptPage />} />
        <Route
          path="/platform-admin"
          element={
            <PlatformAdminRoute>
              <PlatformAdminPage />
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
        <Route path="/" element={<Navigate to="/dashboards" replace />} />
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
            <ProtectedRoute>
              <PageModuleRoute pageKey="dashboards">
                <DashboardsListPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards/:id"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="dashboards">
                <DashboardViewPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards/:id/edit"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="dashboards">
                <DashboardEditRoute />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="datasets">
                <DatasetsListPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets/upload"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="datasets">
                <DatasetUploadPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets/processing/:dataSourceId"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="datasets">
                <DatasetProcessingPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets/:id"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="datasets">
                <DatasetDetailPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="accounts">
                <AccountsListPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/yeni"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="accounts">
                <AccountFormPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/ice-aktar"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="accounts">
                <CrmImportPage entity="accounts" />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/:id"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="accounts">
                <AccountDetailPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/:id/duzenle"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="accounts">
                <AccountFormPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="contacts">
                <ContactsListPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/yeni"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="contacts">
                <ContactFormPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/ice-aktar"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="contacts">
                <CrmImportPage entity="contacts" />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/:id"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="contacts">
                <ContactDetailPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/:id/duzenle"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="contacts">
                <ContactFormPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ajanda"
          element={
            <ProtectedRoute>
              <PageModuleRoute pageKey="calendar">
                <CalendarPage />
              </PageModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
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
