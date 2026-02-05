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
  console.log("🔍 DEBUG - Sidebar Props:", {
    userRole,
    userGroup,
    userGroupType: typeof userGroup,
    activeMenu,
  });

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

  // ===== LOAD MENU PERMISSIONS FROM API =====
  useEffect(() => {
    const loadMenuPermissions = async () => {
      try {
        console.log("📋 Sidebar - Loading menu permissions from API...");
        const backendPermissions = await getMenuPermissions();

        if (
          backendPermissions &&
          Array.isArray(backendPermissions) &&
          backendPermissions.length > 0
        ) {
          console.log("✅ Sidebar - Loaded from API:", backendPermissions);

          const permissionsMap = {};
          backendPermissions.forEach((item) => {
            permissionsMap[item.menu_id] = item.group_ids || [];
          });

          setMenuPermissions(permissionsMap);
          localStorage.setItem(
            "menuPermissions",
            JSON.stringify(permissionsMap),
          );

          setPermissionsLoaded(true);
        } else {
          console.log(
            "⚠️ Sidebar - No permissions from API, loading from localStorage",
          );
          loadFromLocalStorage();
        }
      } catch (err) {
        console.error("❌ Sidebar - Failed to load from API:", err);
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      const saved = localStorage.getItem("menuPermissions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMenuPermissions(parsed);
          console.log("📋 Sidebar - Loaded from localStorage:", parsed);
        } catch (parseErr) {
          console.error("Failed to parse localStorage permissions:", parseErr);
          setDefaultPermissions();
        }
      } else {
        setDefaultPermissions();
      }
      setPermissionsLoaded(true);
    };

    const setDefaultPermissions = () => {
      const defaultPerms = {
        dashboard: [1, 2, 3, 4, 5, 6, 7, 8],
        reports: [1, 2, 3, 4, 5, 6, 7, 8],
        "for-decking": [2],
        "for-evaluation": [3],
        "for-compliance": [3],
        "for-checking": [4],
        supervisor: [5],
        "for-qa": [6],
        "for-director-signature": [7],
        "for-releasing": [8],
        "fda-verification": [1, 2, 3, 4, 5, 6, 7, 8],
        announcements: [1, 2, 3, 4, 5, 6, 7, 8],
        support: [1, 2, 3, 4, 5, 6, 7, 8],
      };
      setMenuPermissions(defaultPerms);
      localStorage.setItem("menuPermissions", JSON.stringify(defaultPerms));
    };

    loadMenuPermissions();

    const handlePermissionsUpdate = () => {
      console.log("🔄 Sidebar - Permissions updated event received");
      loadMenuPermissions();
    };
    window.addEventListener("menuPermissionsUpdated", handlePermissionsUpdate);

    const handleStorageChange = (e) => {
      if (e.key === "menuPermissions") {
        console.log("🔄 Sidebar - Storage change detected");
        loadMenuPermissions();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "menuPermissionsUpdated",
        handlePermissionsUpdate,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

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
      console.log("👤 Sidebar - User:", username, "All Groups:", groupIds);
    } else if (user?.group_id) {
      setUserGroups([user.group_id]);
      console.log("👤 Sidebar - User:", username, "Single Group:", [
        user.group_id,
      ]);
    } else {
      setUserGroups([]);
      console.log("👤 Sidebar - User:", username, "No Groups Found");
    }
  }, [userGroup]);

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
        console.log("📊 Sidebar - Pending Evaluation Count:", pendingCount);
      } catch (err) {
        console.error("Failed to fetch pending count:", err);
        setPendingEvalCount(0);
      }
    };

    fetchPendingCount();
  }, [currentUser]);

  // ===== FILTER FUNCTION =====
  const filterByRoleAndGroup = (items) => {
    if (!permissionsLoaded) {
      return items.filter((item) => item.roles.includes(userRole));
    }

    return items.filter((item) => {
      const hasRole = item.roles.includes(userRole);

      if (["access", "users", "settings"].includes(item.id)) {
        return hasRole;
      }

      const allowedGroups = menuPermissions[item.id];

      if (!allowedGroups || !Array.isArray(allowedGroups)) {
        console.log(
          `⚠️ No permissions for ${item.id} - showing based on role only`,
        );
        return hasRole;
      }

      if (!userGroups || userGroups.length === 0) {
        console.log(
          `⚠️ No user groups - showing item ${item.id} based on role only`,
        );
        return hasRole;
      }

      const hasGroup = allowedGroups.some((requiredGroup) =>
        userGroups.includes(requiredGroup),
      );

      console.log(`🔍 Filter check for ${item.id}:`, {
        hasRole,
        hasGroup,
        userGroups,
        allowedGroups,
        willShow: hasRole && hasGroup,
      });

      return hasRole && hasGroup;
    });
  };

  // Add pending count to evaluation item
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

  console.log("🔍 DEBUG - Visible Menus:", {
    permissionsLoaded,
    userGroups,
    menuPermissions,
    mainMenu: visibleMainMenu.length,
    cdrReports: visibleCdrReports.length,
    workflow: visibleWorkflow.length,
    workflowItems: visibleWorkflow.map((i) => i.id),
    otherDatabase: visibleOtherDatabase.length,
    platform: visiblePlatform.length,
  });

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

      <div style={{ flex: 1, overflowY: "auto" }}>
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
  );
}

export default Sidebar;
