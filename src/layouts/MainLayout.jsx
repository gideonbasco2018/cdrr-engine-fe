// FILE: src/layouts/MainLayout.jsx
import { useLocation } from "react-router-dom";
import { getUser } from "../api/auth";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DashboardPage from "../pages/DashboardPage";
import DeckingPage from "../pages/DeckingPage";
import ProfilePage from "../pages/ProfilePage";
import ForEvaluationPage from "../pages/ForEvaluationPage";
import FDAVerificationPortalPage from "../pages/FDAVerificationPortalPage";
import ReportsPage from "../pages/ReportsPage";
import UserManagementPage from "../pages/UserManagementPage";
import GroupManagementPage from "../pages/GroupManagementPage";
import OTCPage from "../pages/OTCPage";
import CDRRInspectorReportsPage from "../pages/CDRRInspectorReportsPage";
import MonitoringPage from "../pages/MonitoringPage";

function MainLayout({ darkMode, setDarkMode }) {
  const location = useLocation();

  // Get user data
  const user = getUser();
  const userRole = user?.role || "User";

  // ✅ FIXED: Handle both single group_id and groups array
  let userGroup = null;

  // First, try to get from groups array (new format)
  if (user?.groups && Array.isArray(user.groups) && user.groups.length > 0) {
    userGroup = user.groups[0]?.id || user.groups[0];
  }
  // Fallback to group_id (old format)
  else if (user?.group_id) {
    userGroup = user.group_id;
  }

  const userGroupName = user?.groups?.[0]?.name || user?.group_name || null;

  console.log("🔍 DEBUG - MainLayout User:", {
    user,
    userRole,
    userGroup,
    userGroupName,
    allGroups: user?.groups,
    group_id: user?.group_id,
  });

  // ✅ FIXED: Determine active menu from URL - CHECK SPECIFIC PATHS FIRST!
  const getActiveMenuFromUrl = () => {
    const path = location.pathname;

    // ✅ Check specific paths BEFORE checking dashboard
    if (path.includes("announcements")) return "announcements";
    if (path.includes("support")) return "support";
    if (path.includes("access")) return "access";
    if (path.includes("users")) return "users";
    if (path.includes("settings")) return "settings";

    // Workflow paths
    if (path.includes("for-decking")) return "for-decking";
    if (path.includes("for-evaluation")) return "for-evaluation";
    if (path.includes("for-compliance")) return "for-compliance";
    if (path.includes("for-checking")) return "for-checking";
    if (path.includes("supervisor")) return "supervisor";
    if (path.includes("for-qa")) return "for-qa";
    if (path.includes("for-director-signature"))
      return "for-director-signature";
    if (path.includes("for-releasing")) return "for-releasing";

    // Other databases
    if (path.includes("fda-verification")) return "fda-verification";
    if (path.includes("otc-database")) return "otc-database";
    if (path.includes("cdrr-inspector-reports"))
      return "cdrr-inspector-reports"; // ✅ NEW

    if (path.includes("reports")) return "reports";

    // Profile
    if (path.includes("profile")) return "profile";

    // ✅ Check dashboard LAST (default)
    if (path.includes("dashboard")) return "dashboard";
    if (path.includes("monitoring")) return "monitoring";

    return "dashboard";
  };

  const activeMenu = getActiveMenuFromUrl();

  console.log("🔍 DEBUG - Active Menu:", {
    pathname: location.pathname,
    activeMenu,
  });

  // Color scheme based on darkMode prop
  const colors = darkMode
    ? {
        mainBg: "#0a0a0a",
        textPrimary: "#fff",
      }
    : {
        mainBg: "#f8f8f8",
        textPrimary: "#000",
      };

  // Render content based on active menu
  const renderContent = () => {
    console.log("🎨 Rendering content for:", activeMenu);

    switch (activeMenu) {
      case "reports":
        return <ReportsPage darkMode={darkMode} userRole={userRole} />;
      case "profile":
        return <ProfilePage darkMode={darkMode} userRole={userRole} />;
      case "for-decking":
        return <DeckingPage darkMode={darkMode} userRole={userRole} />;
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
      case "fda-verification":
        return <FDAVerificationPortalPage darkMode={darkMode} />;

      case "otc-database":
        return <OTCPage darkMode={darkMode} userRole={userRole} />;

      case "cdrr-inspector-reports":
        return (
          <CDRRInspectorReportsPage darkMode={darkMode} userRole={userRole} />
        );

      case "monitoring":
        return <MonitoringPage darkMode={darkMode} userRole={userRole} />;

      case "announcements":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
              📢 Announcements
            </h1>
            <p>Announcements Page - Coming Soon</p>
          </div>
        );
      case "support":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
              🎧 Support
            </h1>
            <p>Support Page - Coming Soon</p>
          </div>
        );

      case "access":
        return <GroupManagementPage darkMode={darkMode} userRole={userRole} />;
      case "users":
        return <UserManagementPage darkMode={darkMode} userRole={userRole} />;
      case "settings":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
              ⚙️ Settings
            </h1>
            <p>Settings Page - Coming Soon</p>
          </div>
        );
      case "dashboard":
      default:
        return <DashboardPage darkMode={darkMode} userRole={userRole} />;
    }
  };

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
        userGroup={userGroup}
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

        {/* Page Content */}
        {renderContent()}
      </div>
    </div>
  );
}

export default MainLayout;
