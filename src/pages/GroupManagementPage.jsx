// FILE: src/pages/GroupManagementPage.jsx
import { useState, useEffect, useCallback } from "react";
import {
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupUsers,
  assignUserToGroup,
  removeUserFromGroup,
  getAllUsers,
} from "../api/auth";
import {
  getMenuPermissions,
  updateMenuPermissions,
} from "../api/menuPermissions";
import Toast from "../components/groupManagement/Toast";
import ConfirmModal from "../components/groupManagement/ConfirmModal";
import GroupFormModal from "../components/groupManagement/GroupFormModal";
import MenuPermissionsModal from "../components/groupManagement/MenuPermissionsModal";
import AccessDenied from "../components/groupManagement/AccessDenied";
import GroupsTab from "../components/groupManagement/GroupsTab";
import MenuPermissionsTab from "../components/groupManagement/MenuPermissionsTab";
import { useColors } from "../components/groupManagement/useColors";
import { allMenuItems } from "../components/groupManagement/menuDefinitions";

function GroupManagementPage({ darkMode, userRole }) {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupUsers, setGroupUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupUsersLoading, setGroupUsersLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState("groups");
  const [menuItems, setMenuItems] = useState([]);
  const [menuPermissionsModal, setMenuPermissionsModal] = useState(null);
  const [groupModal, setGroupModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  const colors = useColors(darkMode);

  // ===== FETCH GROUPS =====
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const [grps, users] = await Promise.all([getAllGroups(), getAllUsers()]);
      setGroups(Array.isArray(grps) ? grps : []);
      setAllUsers(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      showToast("error", "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // ===== FETCH GROUP USERS =====
  const fetchGroupUsers = useCallback(async (groupId) => {
    if (!groupId) return;
    setGroupUsersLoading(true);
    try {
      const users = await getGroupUsers(groupId);
      setGroupUsers(Array.isArray(users) ? users : []);
    } catch (err) {
      console.error("Failed to fetch group users:", err);
      setGroupUsers([]);
    } finally {
      setGroupUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroup) fetchGroupUsers(selectedGroup.id);
  }, [selectedGroup, fetchGroupUsers]);

  // ===== HELPER: CATEGORIZE MENU ITEMS =====
  const getCategoryForMenu = (menuId) => {
    const categoryMap = {
      dashboard: "Main",
      reports: "CDR Reports",
      "otc-database": "CDR Reports",
      "for-decking": "Workflow",
      "for-evaluation": "Workflow",
      "for-compliance": "Workflow",
      "for-checking": "Workflow",
      supervisor: "Workflow",
      "for-qa": "Workflow",
      "for-director-signature": "Workflow",
      "for-releasing": "Workflow",
      "fda-verification": "Other Database",
      announcements: "Platform",
      support: "Platform",
    };
    return categoryMap[menuId] || "Other";
  };

  // ===== LOAD MENU PERMISSIONS — API ONLY, NO localStorage =====
  const fetchMenuPermissions = useCallback(async () => {
    try {
      // getMenuPermissions() returns raw array:
      // [{ id: 1, menu_id: "dashboard", name: "Dashboard", group_ids: [1, 2], ... }]
      const rawPermissions = await getMenuPermissions();

      if (Array.isArray(rawPermissions) && rawPermissions.length > 0) {
        const menuItemsFromBackend = rawPermissions.map((item) => ({
          id: item.menu_id,
          label: item.name,
          icon: item.icon || "📄",
          category: getCategoryForMenu(item.menu_id),
          allowedGroups: Array.isArray(item.group_ids)
            ? item.group_ids.filter((id) => id !== null && id !== undefined)
            : [],
        }));
        setMenuItems(menuItemsFromBackend);
      } else {
        // API returned empty — fallback with empty groups
        setMenuItems(
          allMenuItems.map((item) => ({ ...item, allowedGroups: [] })),
        );
      }
    } catch (err) {
      console.error("Failed to load menu permissions from API:", err);
      showToast("error", "Failed to load menu permissions from server.");
      setMenuItems(
        allMenuItems.map((item) => ({ ...item, allowedGroups: [] })),
      );
    }
  }, []);

  useEffect(() => {
    fetchMenuPermissions();
  }, [fetchMenuPermissions]);

  // ===== SAVE MENU PERMISSIONS — API ONLY, NO localStorage =====
  const handleMenuPermissionsSave = async () => {
    if (!menuPermissionsModal) return;
    const { menuId, selectedGroups } = menuPermissionsModal;

    try {
      await updateMenuPermissions(menuId, selectedGroups);

      // Update local state directly
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === menuId
            ? { ...item, allowedGroups: selectedGroups }
            : item,
        ),
      );

      // Notify Sidebar to re-fetch from API
      window.dispatchEvent(new Event("menuPermissionsUpdated"));

      showToast("success", "Menu permissions updated successfully!");
      setMenuPermissionsModal(null);
    } catch (err) {
      console.error("Failed to update menu permissions:", err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to update menu permissions.";
      showToast("error", detail);
    }
  };

  // ===== TOAST =====
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ===== GROUP CRUD =====
  const handleGroupSubmit = async () => {
    if (!groupModal) return;
    const { mode, data } = groupModal;
    if (!data?.name?.trim()) {
      showToast("error", "Group name is required.");
      return;
    }

    setActionLoading("group-form");
    try {
      if (mode === "create") {
        await createGroup({
          name: data.name.trim(),
          description: data.description?.trim() || null,
        });
        showToast("success", `Group "${data.name}" created successfully.`);
      } else {
        await updateGroup(selectedGroup.id, {
          name: data.name.trim(),
          description: data.description?.trim() || null,
        });
        showToast("success", `Group "${data.name}" updated successfully.`);
      }
      setGroupModal(null);
      await fetchGroups();
      if (mode === "edit") {
        setSelectedGroup((prev) =>
          prev
            ? {
                ...prev,
                name: data.name.trim(),
                description: data.description?.trim() || null,
              }
            : prev,
        );
      }
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.detail || "Failed to save group.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    setActionLoading("delete-group");
    try {
      await deleteGroup(selectedGroup.id);
      showToast("success", `Group "${selectedGroup.name}" deleted.`);
      setSelectedGroup(null);
      setGroupUsers([]);
      setConfirmModal(null);
      await fetchGroups();
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.detail || "Failed to delete group.",
      );
      setConfirmModal(null);
    } finally {
      setActionLoading(null);
    }
  };

  // ===== ASSIGN / REMOVE USER =====
  const handleAssignUser = async (userId) => {
    setActionLoading(`assign-${userId}`);
    setShowAssignDropdown(false);
    setAssignSearch("");
    try {
      const result = await assignUserToGroup(selectedGroup.id, userId);
      if (result.success) {
        showToast("success", result.message);
        await fetchGroupUsers(selectedGroup.id);
      } else {
        showToast("error", result.message);
      }
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.detail || "Failed to assign user.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveUser = async (userId, username) => {
    setConfirmModal({
      type: "remove-user",
      title: "Remove User from Group?",
      message: `"${username}" ay aalisin sa group na "${selectedGroup?.name}".`,
      onConfirm: async () => {
        setActionLoading(`remove-${userId}`);
        setConfirmModal(null);
        try {
          const result = await removeUserFromGroup(selectedGroup.id, userId);
          if (result.success) {
            showToast("success", result.message);
            await fetchGroupUsers(selectedGroup.id);
          } else {
            showToast("error", result.message);
          }
        } catch (err) {
          showToast(
            "error",
            err?.response?.data?.detail || "Failed to remove user.",
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const toggleGroupPermission = (groupId) => {
    if (!menuPermissionsModal) return;
    setMenuPermissionsModal((prev) => {
      const currentGroups = prev.selectedGroups || [];
      const newGroups = currentGroups.includes(groupId)
        ? currentGroups.filter((id) => id !== groupId)
        : [...currentGroups, groupId];
      return { ...prev, selectedGroups: newGroups };
    });
  };

  // ===== COMPUTED =====
  const groupUserIds = new Set(groupUsers.map((u) => u.id));
  const availableUsers = allUsers
    .filter((u) => !groupUserIds.has(u.id) && u.is_active)
    .filter((u) => {
      if (!assignSearch.trim()) return true;
      const q = assignSearch.toLowerCase();
      return (
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q)
      );
    });

  // ===== GUARD =====
  if (userRole !== "Admin" && userRole !== "SuperAdmin") {
    return <AccessDenied colors={colors} />;
  }

  // ===== GROUP BY CATEGORY =====
  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div
      style={{
        flex: 1,
        background: colors.pageBg,
        color: colors.textPrimary,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {toast && <Toast toast={toast} colors={colors} />}
      {confirmModal && (
        <ConfirmModal
          confirmModal={confirmModal}
          setConfirmModal={setConfirmModal}
          colors={colors}
        />
      )}
      {groupModal && (
        <GroupFormModal
          groupModal={groupModal}
          setGroupModal={setGroupModal}
          handleGroupSubmit={handleGroupSubmit}
          actionLoading={actionLoading}
          colors={colors}
        />
      )}
      {menuPermissionsModal && (
        <MenuPermissionsModal
          menuPermissionsModal={menuPermissionsModal}
          setMenuPermissionsModal={setMenuPermissionsModal}
          groups={groups}
          toggleGroupPermission={toggleGroupPermission}
          handleMenuPermissionsSave={handleMenuPermissionsSave}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {/* HEADER WITH TABS */}
      <div style={{ padding: "2rem 2rem 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: "700" }}>
              🔐 Access Management
            </h1>
            <p
              style={{
                margin: "0.35rem 0 0",
                color: colors.textSecondary,
                fontSize: "0.88rem",
              }}
            >
              Manage groups, users, and menu permissions
            </p>
          </div>
          {activeTab === "groups" && (
            <button
              onClick={() =>
                setGroupModal({
                  mode: "create",
                  data: { name: "", description: "" },
                })
              }
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "8px",
                border: "none",
                background: colors.btnPrimary,
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span style={{ fontSize: "1rem" }}>+</span> New Group
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: `2px solid ${colors.cardBorder}`,
          }}
        >
          {[
            { id: "groups", label: "Groups & Users", icon: "👥" },
            { id: "menu-permissions", label: "Menu Permissions", icon: "🔐" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: "transparent",
                color:
                  activeTab === tab.id
                    ? colors.btnPrimary
                    : colors.textSecondary,
                fontSize: "0.88rem",
                fontWeight: "600",
                cursor: "pointer",
                borderBottom: `2px solid ${activeTab === tab.id ? colors.tabActive : "transparent"}`,
                marginBottom: "-2px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = colors.textPrimary;
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = colors.textSecondary;
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "groups" && (
        <GroupsTab
          groups={groups}
          allUsers={allUsers}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          groupUsers={groupUsers}
          loading={loading}
          groupUsersLoading={groupUsersLoading}
          actionLoading={actionLoading}
          assignSearch={assignSearch}
          setAssignSearch={setAssignSearch}
          showAssignDropdown={showAssignDropdown}
          setShowAssignDropdown={setShowAssignDropdown}
          availableUsers={availableUsers}
          handleAssignUser={handleAssignUser}
          handleRemoveUser={handleRemoveUser}
          setGroupModal={setGroupModal}
          setConfirmModal={setConfirmModal}
          handleDeleteGroup={handleDeleteGroup}
          colors={colors}
          darkMode={darkMode}
          userRole={userRole}
        />
      )}

      {activeTab === "menu-permissions" && (
        <MenuPermissionsTab
          menuByCategory={menuByCategory}
          groups={groups}
          setMenuPermissionsModal={setMenuPermissionsModal}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default GroupManagementPage;
