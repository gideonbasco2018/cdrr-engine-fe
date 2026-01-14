import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { isLoggedIn } from './api/auth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            isLoggedIn() ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />

        {/* User Dashboard - All roles can access */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['User', 'Admin', 'SuperAdmin']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard - Admin & SuperAdmin only */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* SuperAdmin Dashboard - SuperAdmin only */}
        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['SuperAdmin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;