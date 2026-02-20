// FILE: src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUploadReports } from "../api/reports";
import { mapDataItem } from "./reports/utils.js";
import { getUser } from "../api/auth";
import { getMenuPermissions } from "../api/menuPermissions";
import { useSidebarColors } from "./sidebar/useSidebarColors";
import { menuDefinitions } from "./sidebar/menuDefinitions";
import MenuItem from "./sidebar/MenuItem";

function Sidebar({
  activeMenu,
  darkMode,
  userRole = "User",
  userGroup = null,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingEvalCount, setPendingEvalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [menuPermissions, setMenuPermissions] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const colors = useSidebarColors(darkMode);

  const getBasePath = () => {
    if (location.pathname.startsWith("/superadmin")) return "/superadmin";
    if (location.pathname.startsWith("/admin")) return "/admin";
    return "/dashboard";
  };

  // ===== LOAD MENU PERMISSIONS — API ONLY, NO localStorage =====
  useEffect(() => {
    const loadMenuPermissions = async () => {
      try {
        // getMenuPermissions() returns raw array:
        // [{ menu_id: "dashboard", group_ids: [1, 2] }, ...]
        const rawPermissions = await getMenuPermissions();

        // Transform array → map: { "dashboard": [1, 2], "reports": [1], ... }
        const permissionsMap = {};
        if (Array.isArray(rawPermissions)) {
          rawPermissions.forEach((item) => {
            permissionsMap[item.menu_id] = Array.isArray(item.group_ids)
              ? item.group_ids.filter((id) => id !== null && id !== undefined)
              : [];
          });
        }

        setMenuPermissions(permissionsMap);
        setPermissionsLoaded(true);
      } catch (err) {
        console.error("Sidebar - Failed to load permissions from API:", err);
        setMenuPermissions({});
        setPermissionsLoaded(true);
      }
    };

    loadMenuPermissions();

    // Re-fetch when admin saves new permissions
    window.addEventListener("menuPermissionsUpdated", loadMenuPermissions);
    return () => {
      window.removeEventListener("menuPermissionsUpdated", loadMenuPermissions);
    };
  }, []);

  // ===== LOAD CURRENT USER & GROUPS =====
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

    const user = getUser();
    if (user?.groups && Array.isArray(user.groups)) {
      const groupIds = user.groups
        .map((g) => (typeof g === "object" ? g.id || g.group_id : g))
        .filter((id) => id !== null && id !== undefined);
      setUserGroups(groupIds);
    } else if (user?.group_id) {
      setUserGroups([user.group_id]);
    } else {
      setUserGroups([]);
    }
  }, [userGroup]);

  // ===== FETCH PENDING EVAL COUNT =====
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
        const userRecords = mappedData.filter((item) => {
          const evaluator = item.evaluator || "";
          return (
            evaluator.toLowerCase().trim() ===
            (currentUser || "").toLowerCase().trim()
          );
        });
        const pendingCount = userRecords.filter(
          (item) =>
            !item.dateEvalEnd ||
            item.dateEvalEnd === "" ||
            item.dateEvalEnd === "N/A" ||
            item.dateEvalEnd === null,
        ).length;
        setPendingEvalCount(pendingCount);
      } catch (err) {
        console.error("Failed to fetch pending count:", err);
        setPendingEvalCount(0);
      }
    };
    fetchPendingCount();
  }, [currentUser]);

  // ===== FILTER MENUS BY ROLE + GROUP PERMISSIONS =====
  const filterByRoleAndGroup = (items) => {
    if (!permissionsLoaded) {
      return items.filter((item) => item.roles.includes(userRole));
    }

    return items.filter((item) => {
      const hasRole = item.roles.includes(userRole);

      // Admin-only menus — no group restriction needed
      if (["access", "users", "settings"].includes(item.id)) {
        return hasRole;
      }

      const allowedGroups = menuPermissions[item.id];

      // No permissions defined — hide menu
      if (
        !allowedGroups ||
        !Array.isArray(allowedGroups) ||
        allowedGroups.length === 0
      ) {
        return false;
      }

      // User has no groups — hide menu
      if (!userGroups || userGroups.length === 0) {
        return false;
      }

      const hasGroup = allowedGroups.some((requiredGroup) =>
        userGroups.includes(requiredGroup),
      );

      return hasRole && hasGroup;
    });
  };

  const workflowItemsWithBadge = menuDefinitions.workflowItems.map((item) =>
    item.id === "for-evaluation" ? { ...item, badge: pendingEvalCount } : item,
  );

  const visibleMainMenu = filterByRoleAndGroup(menuDefinitions.mainMenuItems);
  const visibleCdrReports = filterByRoleAndGroup(
    menuDefinitions.cdrReportsItems,
  );
  const visibleWorkflow = filterByRoleAndGroup(workflowItemsWithBadge);
  const visibleOtherDatabase = filterByRoleAndGroup(
    menuDefinitions.otherDatabaseItems,
  );
  const visiblePlatform = filterByRoleAndGroup(menuDefinitions.platformItems);

  const handleNavigation = (itemId) => {
    const basePath = getBasePath();
    const routeMap = {
      dashboard: `${basePath}/dashboard`,
      monitoring: `${basePath}/monitoring`,
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
      "otc-database": `${basePath}/otc-database`,
      "cdrr-inspector-reports": `${basePath}/cdrr-inspector-reports`,
      announcements: `${basePath}/announcements`,
      support: `${basePath}/support`,
      access: `${basePath}/access`,
      users: `${basePath}/users`,
      settings: `${basePath}/settings`,
    };
    navigate(routeMap[itemId] || `${basePath}/dashboard`);
  };

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
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
            {title}
          </div>
        )}
        {items.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            activeMenu={activeMenu}
            collapsed={collapsed}
            colors={colors}
            userRole={userRole}
            handleNavigation={handleNavigation}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <style>{`
      .sidebar-scroll::-webkit-scrollbar {
        width: 4px;
      }
      .sidebar-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb {
        background: ${darkMode ? "#2e2e2e" : "#d4d4d4"};
        border-radius: 999px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: ${darkMode ? "#444" : "#b0b0b0"};
      }
    `}</style>
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
        <div
          style={{
            padding: "1rem",
            borderBottom: `1px solid ${colors.sidebarBorder}`,
            textAlign: collapsed ? "center" : "left",
          }}
        >
          {!collapsed && (
            <img
              src="/images/FDALogo.png"
              alt="FDA Logo"
              style={{
                height: "40px",
                width: "auto",
                objectFit: "contain",
              }}
            />
          )}
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {renderSection("MAIN", visibleMainMenu)}
          {renderSection("CDRR REPORTS", visibleCdrReports)}
          {renderSection("WORKFLOW STATUS", visibleWorkflow)}
          {renderSection("OTHER DATABASE", visibleOtherDatabase)}
          {renderSection("PLATFORM", visiblePlatform)}
        </div>

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
    </>
  );
}

export default Sidebar;
