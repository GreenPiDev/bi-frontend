import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardsListPage } from './app/dashboards-list-page';
import { DatasetDetailPage } from './app/dataset-detail-page';
import { DatasetProcessingPage } from './app/dataset-processing-page';
import { DatasetUploadPage } from './app/dataset-upload-page';
import { DatasetsListPage } from './app/datasets-list-page';
import { InvitationAcceptPage } from './app/invitation-accept-page';
import { LoginPage } from './app/login-page';
import { PlatformAdminPage } from './app/platform-admin-page';
import { PlatformAdminRoute } from './app/platform-admin-route';
import { ProtectedRoute } from './app/protected-route';
import { RegisterPage } from './app/register-page';

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
          path="/dashboards"
          element={
            <ProtectedRoute>
              <DashboardsListPage />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
