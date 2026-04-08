// FILE: src/components/Sidebar.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUploadReports } from "../api/reports";
import { mapDataItem } from "./reports/utils.js";
import { getUser } from "../api/auth";
import { getMenuPermissions } from "../api/menuPermissions";
import { useSidebarColors } from "./sidebar/useSidebarColors";
import { menuDefinitions } from "./sidebar/menuDefinitions";
import MenuItem from "./sidebar/MenuItem";

// ── RESPONSIVE HOOK ───────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

function Sidebar({
  activeMenu,
  darkMode,
  userRole = "User",
  userGroup = null,
}) {
  const isMobile = useIsMobile(768);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [menuPermissions, setMenuPermissions] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const colors = useSidebarColors(darkMode);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  // Expose toggle via custom event so hamburger button (in navbar/header) can trigger it
  useEffect(() => {
    const handler = () => setMobileOpen((o) => !o);
    window.addEventListener("toggleSidebar", handler);
    return () => window.removeEventListener("toggleSidebar", handler);
  }, []);

  const getBasePath = () => {
    if (location.pathname.startsWith("/superadmin")) return "/superadmin";
    if (location.pathname.startsWith("/admin")) return "/admin";
    return "/dashboard";
  };

  // ===== LOAD MENU PERMISSIONS — API ONLY, NO localStorage =====
  useEffect(() => {
    const loadMenuPermissions = async () => {
      try {
        const rawPermissions = await getMenuPermissions();
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

  // ===== FILTER MENUS BY ROLE + GROUP PERMISSIONS =====
  const filterByRoleAndGroup = (items) => {
    if (!permissionsLoaded) {
      return items.filter((item) => item.roles.includes(userRole));
    }
    return items.filter((item) => {
      const hasRole = item.roles.includes(userRole);
      if (["access", "users", "settings"].includes(item.id)) return hasRole;
      const allowedGroups = menuPermissions[item.id];
      if (
        !allowedGroups ||
        !Array.isArray(allowedGroups) ||
        allowedGroups.length === 0
      )
        return false;
      if (!userGroups || userGroups.length === 0) return false;
      const hasGroup = allowedGroups.some((requiredGroup) =>
        userGroups.includes(requiredGroup),
      );
      return hasRole && hasGroup;
    });
  };

  const visibleMainMenu = filterByRoleAndGroup(menuDefinitions.mainMenuItems);
  const visibleCdrReports = filterByRoleAndGroup(
    menuDefinitions.cdrReportsItems,
  );
  const visibleWorkflow = filterByRoleAndGroup(menuDefinitions.workflowItems);
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
      task: `${basePath}/task`,
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
      "doctrack-magic": `${basePath}/doctrack-magic`,
      "records-report": `${basePath}/records-report`,
      announcements: `${basePath}/announcements`,
      support: `${basePath}/support`,
      access: `${basePath}/access`,
      users: `${basePath}/users`,
      settings: `${basePath}/settings`,
    };
    // Auto-close on mobile after navigating
    if (isMobile) setMobileOpen(false);
    navigate(routeMap[itemId] || `${basePath}/dashboard`);
  };

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    const isCollapsed = isMobile ? false : collapsed; // never collapse on mobile drawer
    return (
      <div style={{ paddingBottom: "1rem" }}>
        {!isCollapsed && (
          <div
            style={{
              padding: "0 1rem",
              fontSize: "0.7rem",
              fontWeight: "700",
              color: colors.sectionLabel,
              marginBottom: "0.3rem",
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
            collapsed={isCollapsed}
            colors={colors}
            userRole={userRole}
            handleNavigation={handleNavigation}
          />
        ))}
      </div>
    );
  };

  // ── SIDEBAR WIDTH ─────────────────────────────────────────────────────────
  const sidebarWidth = isMobile ? "240px" : collapsed ? "64px" : "200px";

  // ── MOBILE: render overlay drawer ─────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <style>{`
          .sidebar-scroll::-webkit-scrollbar { width: 4px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? "#2e2e2e" : "#d4d4d4"}; border-radius: 999px; }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: ${darkMode ? "#444" : "#b0b0b0"}; }
          @keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        `}</style>

        {/* Hamburger button — visible only when drawer is closed */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              position: "fixed",
              top: 12,
              left: 12,
              zIndex: 1100,
              width: 40,
              height: 40,
              borderRadius: "10px",
              border: "none",
              background: darkMode ? "#161616" : "#ffffff",
              boxShadow: darkMode
                ? "0 2px 12px rgba(0,0,0,0.5)"
                : "0 2px 12px rgba(0,0,0,0.15)",
              color: darkMode ? "#f5f5f5" : "#1a1f36",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1050,
              animation: "fadeIn 0.2s ease",
              backdropFilter: "blur(2px)",
            }}
          />
        )}

        {/* Drawer */}
        {mobileOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: sidebarWidth,
              background: colors.sidebarBg,
              borderRight: `1px solid ${colors.sidebarBorder}`,
              display: "flex",
              flexDirection: "column",
              zIndex: 1051,
              animation: "slideInLeft 0.25s ease",
              boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
            }}
          >
            {/* Logo + Close */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: `1px solid ${colors.sidebarBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <img
                src="/images/FDALogo.png"
                alt="FDA Logo"
                style={{ height: "36px", width: "auto", objectFit: "contain" }}
              />
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: colors.textSecondary,
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Menu items */}
            <div
              className="sidebar-scroll"
              style={{ flex: 1, overflowY: "auto" }}
            >
              {renderSection("MAIN", visibleMainMenu)}
              {renderSection("CDRR REPORTS", visibleCdrReports)}
              {renderSection("WORKFLOW STATUS", visibleWorkflow)}
              {renderSection("OTHER DATABASE", visibleOtherDatabase)}
              {renderSection("PLATFORM", visiblePlatform)}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── DESKTOP: original sidebar ─────────────────────────────────────────────
  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? "#2e2e2e" : "#d4d4d4"}; border-radius: 999px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: ${darkMode ? "#444" : "#b0b0b0"}; }
      `}</style>
      <div
        style={{
          width: sidebarWidth,
          background: colors.sidebarBg,
          borderRight: `1px solid ${colors.sidebarBorder}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
        }}
      >
        <div
          style={{
            padding: ".7rem",
            borderBottom: `1px solid ${colors.sidebarBorder}`,
            textAlign: collapsed ? "center" : "left",
          }}
        >
          {!collapsed && (
            <img
              src="/images/FDALogo.png"
              alt="FDA Logo"
              style={{ height: "50px", width: "auto", objectFit: "contain" }}
            />
          )}
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {renderSection("MAIN", visibleMainMenu)}
          {renderSection("REPORTS", visibleCdrReports)}
          {renderSection("WORKFLOW", visibleWorkflow)}
          {renderSection("OTHER DATABASE", visibleOtherDatabase)}
          {renderSection("PLATFORM", visiblePlatform)}
        </div>

        <div
          style={{
            padding: "0.5rem",
            borderTop: `1px solid ${colors.sidebarBorder}`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: "30px",
              height: "30px",
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
