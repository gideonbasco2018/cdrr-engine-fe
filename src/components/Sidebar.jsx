import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUploadReports } from "../api/reports";
import { mapDataItem } from "./Reports/utils";

function Sidebar({ activeMenu, darkMode, userRole = "User" }) {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingEvalCount, setPendingEvalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path from current location
  const getBasePath = () => {
    if (location.pathname.startsWith("/superadmin")) return "/superadmin";
    if (location.pathname.startsWith("/admin")) return "/admin";
    return "/dashboard";
  };

  // ✅ GET CURRENT USER
  useEffect(() => {
    let username = null;

    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        username = userObj.username || userObj.email || userObj.first_name;
      } catch (e) {
        username = userStr;
      }
    }

    if (!username) {
      username =
        localStorage.getItem("username") || sessionStorage.getItem("username");
    }

    setCurrentUser(username);
  }, []);

  // ✅ FETCH PENDING EVALUATION COUNT
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!currentUser || currentUser === "Unknown User") {
        setPendingEvalCount(0);
        return;
      }

      try {
        const json = await getUploadReports({
          page: 1,
          pageSize: 10000, // Get all records to count properly
          search: "",
          sortBy: "",
          sortOrder: "desc",
        });

        if (!json || !json.data || !Array.isArray(json.data)) {
          setPendingEvalCount(0);
          return;
        }

        const mappedData = json.data.map(mapDataItem);

        // Filter records assigned to current user as evaluator
        const userRecords = mappedData.filter((item) => {
          const evaluator = item.evaluator || "";
          return (
            evaluator.toLowerCase().trim() ===
            (currentUser || "").toLowerCase().trim()
          );
        });

        // Count pending evaluations (no dateEvalEnd)
        const pendingCount = userRecords.filter(
          (item) =>
            !item.dateEvalEnd ||
            item.dateEvalEnd === "" ||
            item.dateEvalEnd === "N/A" ||
            item.dateEvalEnd === null,
        ).length;

        setPendingEvalCount(pendingCount);
        console.log("📊 Sidebar - Pending Evaluation Count:", pendingCount);
      } catch (err) {
        console.error("Failed to fetch pending count:", err);
        setPendingEvalCount(0);
      }
    };

    fetchPendingCount();

    // ✅ Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ===== MENU DEFINITIONS =====
  const mainMenuItems = [
    {
      id: "dashboard",
      icon: "📊",
      label: "Dashboard",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ];

  const cmsReportsItems = [
    {
      id: "upload",
      icon: "📤",
      label: "Upload Reports",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ];

  // NEW: Workflow Status Items with badge count
  const workflowItems = [
    {
      id: "for-evaluation",
      icon: "📋",
      label: "For Evaluation",
      roles: ["User", "Admin", "SuperAdmin"],
      badge: pendingEvalCount, // ✅ Add badge count
    },
    {
      id: "for-compliance",
      icon: "✓",
      label: "For Compliance",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-checking",
      icon: "🔍",
      label: "For Checking",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "supervisor",
      icon: "👔",
      label: "Supervisor",
      roles: ["Admin", "SuperAdmin"],
    },
    {
      id: "for-qa",
      icon: "✔️",
      label: "For QA",
      roles: ["Admin", "SuperAdmin"],
    },
    {
      id: "for-director-signature",
      icon: "✍️",
      label: "For Director Signature",
      roles: ["Admin", "SuperAdmin"],
    },
    {
      id: "for-releasing",
      icon: "📤",
      label: "For Releasing",
      roles: ["Admin", "SuperAdmin"],
    },
  ];

  const platformItems = [
    {
      id: "announcements",
      icon: "📢",
      label: "Announcements",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "support",
      icon: "🎧",
      label: "Support",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "access",
      icon: "🔐",
      label: "Access Management",
      roles: ["Admin", "SuperAdmin"],
    },
    {
      id: "users",
      icon: "👥",
      label: "User Management",
      roles: ["Admin", "SuperAdmin"],
    },
    { id: "settings", icon: "⚙️", label: "Settings", roles: ["SuperAdmin"] },
  ];

  const filterByRole = (items) =>
    items.filter((item) => item.roles.includes(userRole));

  const visibleMainMenu = filterByRole(mainMenuItems);
  const visibleCmsReports = filterByRole(cmsReportsItems);
  const visibleWorkflow = filterByRole(workflowItems);
  const visiblePlatform = filterByRole(platformItems);

  // ===== COLORS =====
  const colors = darkMode
    ? {
        sidebarBg: "#161616",
        sidebarBorder: "#252525",
        textPrimary: "#fff",
        textSecondary: "#999",
        sectionLabel: "#666",
        activeItemBg: "#1a1a1a",
        hoverBg: "#151515",
        toggleBg: "#151515",
        toggleHover: "#1f1f1f",
        badgeBg: "#ef4444",
        badgeText: "#fff",
      }
    : {
        sidebarBg: "#ffffff",
        sidebarBorder: "#e5e5e5",
        textPrimary: "#000",
        textSecondary: "#666",
        sectionLabel: "#999",
        activeItemBg: "#f5f5f5",
        hoverBg: "#fafafa",
        toggleBg: "#f7f7f7",
        toggleHover: "#ededed",
        badgeBg: "#ef4444",
        badgeText: "#fff",
      };

  const roleBadgeColors = {
    User: "#4CAF50",
    Admin: "#2196F3",
    SuperAdmin: "#ff9800",
  };

  // ===== NAVIGATION HANDLER =====
  const handleNavigation = (itemId) => {
    const basePath = getBasePath();

    if (itemId === "dashboard") {
      navigate(
        basePath === "/dashboard" ? "/dashboard" : `${basePath}/dashboard`,
      );
    } else {
      navigate(`${basePath}/${itemId}`);
    }
  };

  // ===== MENU ITEM =====
  const MenuItem = ({ item }) => (
    <div
      onClick={() => handleNavigation(item.id)}
      title={collapsed ? item.label : ""}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: collapsed ? 0 : "0.75rem",
        padding: collapsed ? "0.75rem" : "0.75rem 1.25rem",
        cursor: "pointer",
        background:
          activeMenu === item.id ? colors.activeItemBg : "transparent",
        color:
          activeMenu === item.id ? colors.textPrimary : colors.textSecondary,
        transition: "all 0.2s ease",
        borderLeft:
          activeMenu === item.id && !collapsed
            ? `3px solid ${roleBadgeColors[userRole]}`
            : "3px solid transparent",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (activeMenu !== item.id) {
          e.currentTarget.style.background = colors.hoverBg;
          e.currentTarget.style.color = colors.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (activeMenu !== item.id) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = colors.textSecondary;
        }
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : "0.75rem",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
      </div>

      {/* ✅ BADGE - Show only if item has badge and badge > 0 */}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span
          style={{
            padding: "0.2rem 0.5rem",
            background: colors.badgeBg,
            color: colors.badgeText,
            borderRadius: "10px",
            fontSize: "0.7rem",
            fontWeight: "700",
            minWidth: "20px",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
          }}
        >
          {item.badge}
        </span>
      )}

      {/* ✅ COLLAPSED BADGE - Show dot indicator when sidebar is collapsed */}
      {collapsed && item.badge !== undefined && item.badge > 0 && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "8px",
            height: "8px",
            background: colors.badgeBg,
            borderRadius: "50%",
            boxShadow: "0 0 4px rgba(239, 68, 68, 0.5)",
          }}
        />
      )}
    </div>
  );

  return (
    <div
      style={{
        width: collapsed ? "64px" : "240px",
        background: colors.sidebarBg,
        borderRight: `1px solid ${colors.sidebarBorder}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
      }}
    >
      {/* LOGO */}
      <div
        style={{
          padding: "1rem",
          borderBottom: `1px solid ${colors.sidebarBorder}`,
          textAlign: collapsed ? "center" : "left",
        }}
      >
        {!collapsed && (
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: "700",
              letterSpacing: "0.1em",
              color: colors.textPrimary,
            }}
          >
            FDA
          </div>
        )}
      </div>

      {/* MENUS */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* MAIN */}
        {visibleMainMenu.length > 0 && (
          <div style={{ padding: "1rem 0" }}>
            {!collapsed && (
              <div
                style={{
                  padding: "0 1.25rem",
                  fontSize: "0.7rem",
                  fontWeight: "600",
                  color: colors.sectionLabel,
                  marginBottom: "0.5rem",
                }}
              >
                MAIN
              </div>
            )}
            {visibleMainMenu.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* CDRR */}
        {visibleCmsReports.length > 0 && (
          <div style={{ paddingBottom: "1rem" }}>
            {!collapsed && (
              <div
                style={{
                  padding: "0 1.25rem",
                  fontSize: "0.7rem",
                  fontWeight: "600",
                  color: colors.sectionLabel,
                  marginBottom: "0.5rem",
                }}
              >
                CDRR REPORTS
              </div>
            )}
            {visibleCmsReports.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* WORKFLOW STATUS */}
        {visibleWorkflow.length > 0 && (
          <div style={{ paddingBottom: "1rem" }}>
            {!collapsed && (
              <div
                style={{
                  padding: "0 1.25rem",
                  fontSize: "0.7rem",
                  fontWeight: "600",
                  color: colors.sectionLabel,
                  marginBottom: "0.5rem",
                }}
              >
                WORKFLOW STATUS
              </div>
            )}
            {visibleWorkflow.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* PLATFORM */}
        {visiblePlatform.length > 0 && (
          <div style={{ paddingBottom: "1rem" }}>
            {!collapsed && (
              <div
                style={{
                  padding: "0 1.25rem",
                  fontSize: "0.7rem",
                  fontWeight: "600",
                  color: colors.sectionLabel,
                  marginBottom: "0.5rem",
                }}
              >
                PLATFORM
              </div>
            )}
            {visiblePlatform.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* COLLAPSE BUTTON (BOTTOM) */}
      <div
        style={{
          padding: "0.75rem",
          borderTop: `1px solid ${colors.sidebarBorder}`,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            border: "none",
            background: colors.toggleBg,
            color: colors.textSecondary,
            cursor: "pointer",
            fontSize: "1rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.toggleHover;
            e.currentTarget.style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.toggleBg;
            e.currentTarget.style.color = colors.textSecondary;
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
