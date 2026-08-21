import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './app/home-page';
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
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
