// src/components/DashboardLayout.jsx
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import DashboardPage from "../pages/DashboardPage";
import UploadReportsPage from "../pages/UploadReportsPage";
import ProfilePage from "../pages/ProfilePage";
import ForEvaluationPage from "../pages/ForEvaluationPage";

function DashboardLayout({ userRole = "User" }) {
  const { page } = useParams(); // Get page from URL
  const location = useLocation();

  // Determine active menu from URL
  const getActiveMenuFromUrl = () => {
    if (page) return page;

    // Check if we're on /dashboard, /admin/dashboard, or /superadmin/dashboard
    const path = location.pathname;
    if (path.endsWith("/dashboard") || path === "/dashboard") {
      return "dashboard";
    }

    return "dashboard"; // default
  };

  const activeMenu = getActiveMenuFromUrl();

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false; // false = light mode
  });

  // Define color schemes for dark and light modes
  const colors = darkMode
    ? {
        mainBg: "#0a0a0a",
        textPrimary: "#fff",
      }
    : {
        mainBg: "#f8f8f8",
        textPrimary: "#000",
      };

  // Function to render content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case "profile":
        return <ProfilePage darkMode={darkMode} userRole={userRole} />;
      case "upload":
        return <UploadReportsPage darkMode={darkMode} userRole={userRole} />;

      // ===== WORKFLOW STATUS PAGES =====
      case "for-evaluation":
        return <ForEvaluationPage darkMode={darkMode} userRole={userRole} />;
      case "for-compliance":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            For Compliance Page - Coming Soon
          </div>
        );
      case "for-checking":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            For Checking Page - Coming Soon
          </div>
        );
      case "supervisor":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            Supervisor Page - Coming Soon
          </div>
        );
      case "for-qa":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            For QA Page - Coming Soon
          </div>
        );
      case "for-director-signature":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            For Director Signature Page - Coming Soon
          </div>
        );
      case "for-releasing":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            For Releasing Page - Coming Soon
          </div>
        );

      // ===== PLATFORM PAGES =====
      case "announcements":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            Announcements Page - Coming Soon
          </div>
        );
      case "support":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            Support Page - Coming Soon
          </div>
        );
      case "access":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            Access Management Page - Coming Soon
          </div>
        );
      case "users":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            User Management Page - Coming Soon
          </div>
        );
      case "settings":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            Settings Page - Coming Soon
          </div>
        );

      case "dashboard":
      default:
        return <DashboardPage darkMode={darkMode} userRole={userRole} />;
    }
  };

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: colors.mainBg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: "hidden",
        color: colors.textPrimary,
        transition: "all 0.3s ease",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        activeMenu={activeMenu}
        darkMode={darkMode}
        userRole={userRole}
      />

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top Navbar */}
        <Navbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          userRole={userRole}
        />

        {/* Content Area - Conditionally render based on activeMenu */}
        {renderContent()}
      </div>
    </div>
  );
}

export default DashboardLayout;
