import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute.js';
import ToastContainer from './components/common/Toast.js';
import AppLayout from './components/layout/AppLayout.js';
import LoginPage from './pages/auth/LoginPage.js';
import RegisterPage from './pages/auth/RegisterPage.js';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.js';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.js';
import DashboardPage from './pages/DashboardPage.js';
import BuildingsPage from './pages/BuildingsPage.js';
import BuildingDetailPage from './pages/BuildingDetailPage.js';
import FloorDetailPage from './pages/FloorDetailPage.js';
import RoomDetailPage from './pages/RoomDetailPage.js';
import SettingsPage from './pages/SettingsPage.js';

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/buildings" element={<BuildingsPage />} />
            <Route path="/buildings/:id" element={<BuildingDetailPage />} />
            <Route path="/buildings/:id/floors/:floorId" element={<FloorDetailPage />} />
            <Route
              path="/buildings/:id/floors/:floorId/rooms/:roomId"
              element={<RoomDetailPage />}
            />
            <Route path="/measurements" element={<Navigate to="/buildings" replace />} />
            <Route path="/drawings*" element={<Navigate to="/buildings" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

