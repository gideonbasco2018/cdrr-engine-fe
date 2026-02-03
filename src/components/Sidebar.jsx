// FILE: src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUploadReports } from "../api/reports";
import { mapDataItem } from "./reports/utils.js";
import { getUser } from "../api/auth"; // ✅ Import getUser to get all groups

function Sidebar({
  activeMenu,
  darkMode,
  userRole = "User",
  userGroup = null,
}) {
  console.log("🔍 DEBUG - Sidebar Props:", {
    userRole,
    userGroup,
    userGroupType: typeof userGroup,
    activeMenu,
  });

  const [collapsed, setCollapsed] = useState(false);
  const [pendingEvalCount, setPendingEvalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]); // ✅ Store ALL user groups
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path from current location
  const getBasePath = () => {
    if (location.pathname.startsWith("/superadmin")) return "/superadmin";
    if (location.pathname.startsWith("/admin")) return "/admin";
    return "/dashboard";
  };

  // ✅ Get current user and ALL groups
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

    // ✅ Get ALL user groups from getUser()
    const user = getUser();
    if (user?.groups && Array.isArray(user.groups)) {
      // Extract group IDs from groups array
      const groupIds = user.groups
        .map((g) => (typeof g === "object" ? g.id || g.group_id : g))
        .filter((id) => id !== null && id !== undefined);

      setUserGroups(groupIds);
      console.log("👤 Sidebar - User:", username, "All Groups:", groupIds);
    } else if (user?.group_id) {
      // Fallback to single group_id
      setUserGroups([user.group_id]);
      console.log("👤 Sidebar - User:", username, "Single Group:", [
        user.group_id,
      ]);
    } else {
      setUserGroups([]);
      console.log("👤 Sidebar - User:", username, "No Groups Found");
    }
  }, [userGroup]);

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
          pageSize: 10000,
          search: "",
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
  }, [currentUser]);

  // ===== MENU DEFINITIONS =====

  const mainMenuItems = [
    {
      id: "dashboard",
      icon: "📊",
      label: "Dashboard",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [1, 2, 3, 4, 5, 6, 7, 8],
    },
  ];

  const cdrReportsItems = [
    {
      id: "reports",
      icon: "📄",
      label: "Reports",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [1, 2, 3, 4, 5, 6, 7, 8],
      comingSoon: false,
    },
  ];

  const workflowItems = [
    {
      id: "for-decking",
      icon: "📥",
      label: "For Decking",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [2],
    },
    {
      id: "for-evaluation",
      icon: "📋",
      label: "For Evaluation",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [3],
      badge: pendingEvalCount,
    },
    {
      id: "for-compliance",
      icon: "✓",
      label: "For Compliance",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [3],
    },
    {
      id: "for-checking",
      icon: "🔍",
      label: "For Checking",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [4],
    },
    {
      id: "supervisor",
      icon: "👔",
      label: "Supervisor",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [5],
    },
    {
      id: "for-qa",
      icon: "✔️",
      label: "For QA",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [6],
    },
    {
      id: "for-director-signature",
      icon: "✍️",
      label: "For Director Signature",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [7],
    },
    {
      id: "for-releasing",
      icon: "📤",
      label: "For Releasing",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [8],
    },
  ];

  const otherDatabaseItems = [
    {
      id: "fda-verification",
      icon: "🔍",
      label: "FDA Verification Portal",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [1, 2, 3, 4, 5, 6, 7, 8],
    },
  ];

  const platformItems = [
    {
      id: "announcements",
      icon: "📢",
      label: "Announcements",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [1, 2, 3, 4, 5, 6, 7, 8],
    },
    {
      id: "support",
      icon: "🎧",
      label: "Support",
      roles: ["User", "Admin", "SuperAdmin"],
      groups: [1, 2, 3, 4, 5, 6, 7, 8],
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
    {
      id: "settings",
      icon: "⚙️",
      label: "Settings",
      roles: ["SuperAdmin"],
    },
  ];

  // ✅ FIXED FILTER - Check if user has ANY of the required groups
  const filterByRoleAndGroup = (items) => {
    return items.filter((item) => {
      const hasRole = item.roles.includes(userRole);

      // If item has no groups specified, show it (backward compatibility)
      if (!item.groups || item.groups.length === 0) {
        return hasRole;
      }

      // If user has no groups, show all items for this role
      if (!userGroups || userGroups.length === 0) {
        console.log(
          `⚠️ No user groups - showing item ${item.id} based on role only`,
        );
        return hasRole;
      }

      // ✅ Check if user has ANY of the required groups
      const hasGroup = item.groups.some((requiredGroup) =>
        userGroups.includes(requiredGroup),
      );

      console.log(`🔍 Filter check for ${item.id}:`, {
        hasRole,
        hasGroup,
        userGroups,
        itemGroups: item.groups,
        willShow: hasRole && hasGroup,
      });

      return hasRole && hasGroup;
    });
  };

  const visibleMainMenu = filterByRoleAndGroup(mainMenuItems);
  const visibleCdrReports = filterByRoleAndGroup(cdrReportsItems);
  const visibleWorkflow = filterByRoleAndGroup(workflowItems);
  const visibleOtherDatabase = filterByRoleAndGroup(otherDatabaseItems);
  const visiblePlatform = filterByRoleAndGroup(platformItems);

  console.log("🔍 DEBUG - Visible Menus:", {
    userGroups,
    mainMenu: visibleMainMenu.length,
    cdrReports: visibleCdrReports.length,
    workflow: visibleWorkflow.length,
    workflowItems: visibleWorkflow.map((i) => i.id),
    otherDatabase: visibleOtherDatabase.length,
    platform: visiblePlatform.length,
  });

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
        comingSoonBg: "#2a2a2a",
        comingSoonText: "#555",
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
        comingSoonBg: "#f0f0f0",
        comingSoonText: "#999",
      };

  const roleBadgeColors = {
    User: "#4CAF50",
    Admin: "#2196F3",
    SuperAdmin: "#ff9800",
  };

  // ===== NAVIGATION HANDLER =====
  const handleNavigation = (itemId) => {
    const basePath = getBasePath();

    const routeMap = {
      dashboard: `${basePath}/dashboard`,
      reports: `${basePath}/reports`,
      "for-decking": `${basePath}/for-decking`,
      "for-evaluation": `${basePath}/for-evaluation`,
      "for-compliance": `${basePath}/for-compliance`,
      "for-checking": `${basePath}/for-checking`,
      supervisor: `${basePath}/supervisor`,
      "for-qa": `${basePath}/for-qa`,
      "for-director-signature": `${basePath}/for-director-signature`,
      "for-releasing": `${basePath}/for-releasing`,
      "fda-verification": `${basePath}/fda-verification`,
      announcements: `${basePath}/announcements`,
      support: `${basePath}/support`,
      access: `${basePath}/access`,
      users: `${basePath}/users`,
      settings: `${basePath}/settings`,
    };

    navigate(routeMap[itemId] || `${basePath}/dashboard`);
  };

  // ===== MENU ITEM =====
  const MenuItem = ({ item }) => {
    const isDisabled = item.comingSoon === true;

    return (
      <div
        onClick={() => !isDisabled && handleNavigation(item.id)}
        title={collapsed ? item.label : ""}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: collapsed ? 0 : "0.75rem",
          padding: collapsed ? "0.75rem" : "0.75rem 1.25rem",
          cursor: isDisabled ? "not-allowed" : "pointer",
          background:
            activeMenu === item.id ? colors.activeItemBg : "transparent",
          color: isDisabled
            ? colors.comingSoonText
            : activeMenu === item.id
              ? colors.textPrimary
              : colors.textSecondary,
          transition: "all 0.2s ease",
          borderLeft:
            activeMenu === item.id && !collapsed
              ? `3px solid ${roleBadgeColors[userRole]}`
              : "3px solid transparent",
          position: "relative",
          opacity: isDisabled ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (activeMenu !== item.id && !isDisabled) {
            e.currentTarget.style.background = colors.hoverBg;
            e.currentTarget.style.color = colors.textPrimary;
          }
        }}
        onMouseLeave={(e) => {
          if (activeMenu !== item.id && !isDisabled) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = isDisabled
              ? colors.comingSoonText
              : colors.textSecondary;
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

        {!collapsed && isDisabled && (
          <span
            style={{
              padding: "0.15rem 0.5rem",
              background: colors.comingSoonBg,
              color: colors.comingSoonText,
              borderRadius: "10px",
              fontSize: "0.65rem",
              fontWeight: "600",
              letterSpacing: "0.02em",
            }}
          >
            Soon
          </span>
        )}

        {!collapsed &&
          !isDisabled &&
          item.badge !== undefined &&
          item.badge > 0 && (
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

        {collapsed &&
          !isDisabled &&
          item.badge !== undefined &&
          item.badge > 0 && (
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
  };

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

        {visibleCdrReports.length > 0 && (
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
            {visibleCdrReports.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        )}

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

        {visibleOtherDatabase.length > 0 && (
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
                OTHER DATABASE
              </div>
            )}
            {visibleOtherDatabase.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        )}

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

      {/* COLLAPSE BUTTON */}
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
