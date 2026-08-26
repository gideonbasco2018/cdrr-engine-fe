// FILE: src/layouts/MainLayout.jsx
import { useLocation } from "react-router-dom";
import { getUser } from "../api/auth";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DashboardPage from "../pages/DashboardPage";
import DeckingPage from "../pages/DeckingPage";
import ProfilePage from "../pages/ProfilePage";
import FDAVerificationPortalPage from "../pages/FDAVerificationPortalPage";
import ReportsPage from "../pages/ReportsPage";
import UserManagementPage from "../pages/UserManagementPage";
import GroupManagementPage from "../pages/GroupManagementPage";
import OTCPage from "../pages/OTCPage";
import CDRRInspectorReportsPage from "../pages/CDRRInspectorReportsPage";
import TaskPage from "../pages/TaskPage";
import MonitoringPage from "../pages/MonitoringPage";
import DoctrackMagicPage from "../pages/DoctrackMagicPage";
import RecordSectionPage from "../pages/RecordSectionPage";
import LeadAssignmentsPage from "../pages/LeadAssignmentsPage";
import ApplicationCorrectionPage from "../pages/ApplicationCorrectionPage";
import DocumentRenamePage from "../pages/DocumentRenamePage";
import BulkDocumentUploadPage from "../pages/BulkDocumentUploadPage";
import BulkFolderDocumentUploadPage from "../pages/BulkFolderDocumentUploadPage";
import TargetAssignmentsPage from "../pages/TargetAssignmentsPage";
import ReassignmentPage from "../pages/ReassignmentPage";
// ── GMP ────────────────────────────────────────────────────────────────────────
import GMPQueuePage from "../pages/GMPQueuePage";
import GMPTasksPage from "../pages/GMPTasksPage";
import EApplicationPage from "../pages/EApplicationPage";

function MainLayout({ darkMode, setDarkMode }) {
  const location = useLocation();

  const user = getUser();
  const userRole = user?.role || "User";

  let userGroup = null;
  if (user?.groups && Array.isArray(user.groups) && user.groups.length > 0) {
    userGroup = user.groups[0]?.id || user.groups[0];
  } else if (user?.group_id) {
    userGroup = user.group_id;
  }

  const getActiveMenuFromUrl = () => {
    const path = location.pathname;

    if (path.includes("announcements")) return "announcements";
    if (path.includes("support")) return "support";
    if (path.includes("access")) return "access";
    if (path.includes("users")) return "users";
    if (path.includes("settings")) return "settings";
    if (path.includes("lead-assignments")) return "lead-assignments";
    if (path.includes("target-assignments")) return "target-assignments";

    // Workflow paths
    if (path.includes("for-decking")) return "for-decking";
    if (path.includes("reassignment")) return "reassignment";
    if (path.includes("eapplication-tasks")) return "eapplication-tasks";
    // ── GMP checks MUST come before "task", since "gmp-tasks" contains "task" ──
    if (path.includes("gmp-queue")) return "gmp-queue";
    if (path.includes("gmp-tasks")) return "gmp-tasks";
    if (path.includes("task")) return "task";

    // Other databases
    if (path.includes("fda-verification")) return "fda-verification";
    if (path.includes("otc-database")) return "otc-database";
    if (path.includes("cdrr-inspector-reports"))
      return "cdrr-inspector-reports";
    if (path.includes("doctrack-magic")) return "doctrack-magic";
    if (path.includes("reports")) return "reports";
    if (path.includes("records-report")) return "records-report";

    // Profile
    if (path.includes("profile")) return "profile";
    if (path.includes("monitoring")) return "monitoring";
    if (path.includes("appCorrection")) return "appCorrection";
    if (path.includes("document-rename")) return "document-rename";
    if (path.includes("bulk-folder-document-upload"))
      return "bulk-folder-document-upload";
    if (path.includes("upload-document")) return "upload-document";
    // ✅ Check dashboard LAST (default)
    if (path.includes("dashboard")) return "dashboard";

    return "dashboard";
  };
  const activeMenu = getActiveMenuFromUrl();

  // console.log("🔍 DEBUG - Active Menu:", {
  //   pathname: location.pathname,
  //   activeMenu,
  // });

  // Color scheme based on darkMode prop
  const colors = darkMode
    ? { mainBg: "#0a0a0a", textPrimary: "#fff" }
    : { mainBg: "#f8f8f8", textPrimary: "#000" };

  const renderContent = () => {
    switch (activeMenu) {
      case "reports":
        return <ReportsPage darkMode={darkMode} userRole={userRole} />;
      case "profile":
        return <ProfilePage darkMode={darkMode} userRole={userRole} />;
      case "for-decking":
        return <DeckingPage darkMode={darkMode} userRole={userRole} />;
      case "reassignment":
        return <ReassignmentPage darkMode={darkMode} userRole={userRole} />;
      case "eapplication-tasks":
        return <EApplicationPage darkMode={darkMode} userRole={userRole} />;
      // ── GMP ───────────────────────────────────────────────────────────────
      case "gmp-queue":
        return <GMPQueuePage darkMode={darkMode} userRole={userRole} />;
      case "gmp-tasks":
        return <GMPTasksPage darkMode={darkMode} userRole={userRole} />;
      case "task":
        return <TaskPage darkMode={darkMode} userRole={userRole} />;
      case "fda-verification":
        return <FDAVerificationPortalPage darkMode={darkMode} />;
      case "otc-database":
        return <OTCPage darkMode={darkMode} userRole={userRole} />;
      case "cdrr-inspector-reports":
        return (
          <CDRRInspectorReportsPage darkMode={darkMode} userRole={userRole} />
        );
      case "doctrack-magic":
        return <DoctrackMagicPage darkMode={darkMode} userRole={userRole} />;
      case "records-report":
        return <RecordSectionPage darkMode={darkMode} userRole={userRole} />;
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
      case "lead-assignments":
        return <LeadAssignmentsPage darkMode={darkMode} userRole={userRole} />;
      case "settings":
        return (
          <div style={{ padding: "2rem", color: colors.textPrimary }}>
            <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
              ⚙️ Settings
            </h1>
            <p>Settings Page - Coming Soon</p>
          </div>
        );
      case "appCorrection":
        return (
          <ApplicationCorrectionPage darkMode={darkMode} userRole={userRole} />
        );
      case "document-rename":
        return <DocumentRenamePage darkMode={darkMode} userRole={userRole} />;
      case "upload-document":
        return (
          <BulkDocumentUploadPage darkMode={darkMode} userRole={userRole} />
        );
      case "bulk-folder-document-upload":
        return (
          <BulkFolderDocumentUploadPage
            darkMode={darkMode}
            userRole={userRole}
          />
        );
      case "target-assignments":
        return (
          <TargetAssignmentsPage darkMode={darkMode} userRole={userRole} />
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
      <Sidebar
        activeMenu={activeMenu}
        darkMode={darkMode}
        userRole={userRole}
        userGroup={userGroup}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        <Navbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          userRole={userRole}
        />
        {renderContent()}
      </div>
    </div>
  );
}

export default MainLayout;
