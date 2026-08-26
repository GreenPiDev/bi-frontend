import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AccountDetailPage } from './app/account-detail-page';
import { AccountFormPage } from './app/account-form-page';
import { AccountsListPage } from './app/accounts-list-page';
import { AdminRoute } from './app/admin-route';
import { ContactDetailPage } from './app/contact-detail-page';
import { ContactFormPage } from './app/contact-form-page';
import { ContactsListPage } from './app/contacts-list-page';
import { CrmImportPage } from './app/crm-import-page';
import { CrmModuleRoute } from './app/crm-module-route';
import { DashboardEditPage } from './app/dashboard-edit-page';
import { DashboardViewPage } from './app/dashboard-view-page';
import { DashboardsListPage } from './app/dashboards-list-page';
import { DatasetDetailPage } from './app/dataset-detail-page';
import { DatasetProcessingPage } from './app/dataset-processing-page';
import { DatasetUploadPage } from './app/dataset-upload-page';
import { DatasetsListPage } from './app/datasets-list-page';
import { EditorRoute } from './app/editor-route';
import { InvitationAcceptPage } from './app/invitation-accept-page';
import { LoginPage } from './app/login-page';
import { OnboardingPage } from './app/onboarding-page';
import { PlatformAdminPage } from './app/platform-admin-page';
import { PlatformAdminRoute } from './app/platform-admin-route';
import { ProfilePage } from './app/profile-page';
import { ProtectedRoute } from './app/protected-route';
import { RegisterPage } from './app/register-page';
import { SettingsPage } from './app/settings-page';

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
              <DashboardsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards/:id"
          element={
            <ProtectedRoute>
              <DashboardViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards/:id/edit"
          element={
            <ProtectedRoute>
              <EditorRoute>
                <DashboardEditPage />
              </EditorRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets"
          element={
            <ProtectedRoute>
              <DatasetsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets/upload"
          element={
            <ProtectedRoute>
              <DatasetUploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets/processing/:dataSourceId"
          element={
            <ProtectedRoute>
              <DatasetProcessingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets/:id"
          element={
            <ProtectedRoute>
              <DatasetDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <AccountsListPage />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/yeni"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <AccountFormPage />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/ice-aktar"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <CrmImportPage entity="accounts" />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/:id"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <AccountDetailPage />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmalar/:id/duzenle"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <AccountFormPage />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <ContactsListPage />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/yeni"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <ContactFormPage />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/ice-aktar"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <CrmImportPage entity="contacts" />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/:id"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <ContactDetailPage />
              </CrmModuleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kisiler/:id/duzenle"
          element={
            <ProtectedRoute>
              <CrmModuleRoute>
                <ContactFormPage />
              </CrmModuleRoute>
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
              <AdminRoute>
                <SettingsPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
