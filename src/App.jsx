import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { isLoggedIn, getUserRole } from "./api/auth";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // After login, redirect to the correct dashboard based on role
  const getDefaultDashboard = () => {
    const role = getUserRole();
    switch (role) {
      case "SuperAdmin":
        return "/superadmin/dashboard";
      case "Admin":
        return "/admin/dashboard";
      default:
        return "/dashboard";
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route
          path="/login"
          element={
            isLoggedIn() ? (
              <Navigate to={getDefaultDashboard()} replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isLoggedIn() ? (
              <Navigate to={getDefaultDashboard()} replace />
            ) : (
              <SignupPage />
            )
          }
        />

        {/* ===== USER ROUTES ===== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["User", "Admin", "SuperAdmin"]}>
              <MainLayout darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:page"
          element={
            <ProtectedRoute allowedRoles={["User", "Admin", "SuperAdmin"]}>
              <MainLayout darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        />

        {/* ===== ADMIN ROUTES ===== */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
              <MainLayout darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/:page"
          element={
            <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
              <MainLayout darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        />

        {/* ===== SUPERADMIN ROUTES ===== */}
        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["SuperAdmin"]}>
              <MainLayout darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/:page"
          element={
            <ProtectedRoute allowedRoles={["SuperAdmin"]}>
              <MainLayout darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        />

        {/* ===== FALLBACKS ===== */}
        <Route
          path="/"
          element={
            isLoggedIn() ? (
              <Navigate to={getDefaultDashboard()} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
