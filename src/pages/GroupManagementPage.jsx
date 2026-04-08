// FILE: src/pages/GroupManagementPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
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
import { useIsMobile } from "../hooks/useIsMobile";

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
  const isMobile = useIsMobile();
  const [memberSearch, setMemberSearch] = useState("");
  // ── DnD state ──────────────────────────────────────────────────
  // dragging: { userId, fromGroupId: number|null }
  // fromGroupId === null means user came from the "pool" (not yet in selectedGroup)
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // "pool" | "members" | groupId(number)
  const dragCounters = useRef({}); // per-zone enter/leave counters

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
      monitoring: "Main",
      reports: "CDR Reports",
      "otc-database": "CDR Reports",
      "for-decking": "Workflow",
      task: "Workflow",
      "for-evaluation": "Workflow",
      "for-compliance": "Workflow",
      "for-checking": "Workflow",
      supervisor: "Workflow",
      "for-qa": "Workflow",
      "for-director-signature": "Workflow",
      "for-releasing": "Workflow",
      "fda-verification": "Other Database",
      "cdrr-inspector-reports": "Other Database",
      "doctrack-magic": "Other Database",
      "records-report": "Other Database",
      announcements: "Platform",
      support: "Platform",
    };
    return categoryMap[menuId] || "Other";
  };

  // ===== LOAD MENU PERMISSIONS =====
  const fetchMenuPermissions = useCallback(async () => {
    try {
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

  // ===== SAVE MENU PERMISSIONS =====
  const handleMenuPermissionsSave = async () => {
    if (!menuPermissionsModal) return;
    const { menuId, selectedGroups } = menuPermissionsModal;
    try {
      await updateMenuPermissions(menuId, selectedGroups);
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === menuId
            ? { ...item, allowedGroups: selectedGroups }
            : item,
        ),
      );
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
    if (!selectedGroup) return;
    setActionLoading(`assign-${userId}`);
    setShowAssignDropdown(false);
    setAssignSearch("");
    try {
      const result = await assignUserToGroup(selectedGroup.id, userId);
      if (result.success) {
        showToast("success", result.message);
        await fetchGroupUsers(selectedGroup.id);
        // Refresh group list to update user_count badge
        await fetchGroups();
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
            await fetchGroups();
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

  // ===== BULK ACTIONS =====
  const handleBulkRemove = async (userIds) => {
    if (!selectedGroup || userIds.length === 0) return;
    setActionLoading("bulk-remove");
    let successCount = 0;
    for (const userId of userIds) {
      try {
        const result = await removeUserFromGroup(selectedGroup.id, userId);
        if (result.success) successCount++;
      } catch {}
    }
    showToast(
      "success",
      `Removed ${successCount} user(s) from ${selectedGroup.name}.`,
    );
    await fetchGroupUsers(selectedGroup.id);
    await fetchGroups();
    setActionLoading(null);
  };

  const handleBulkAssign = async (userIds) => {
    if (!selectedGroup || userIds.length === 0) return;
    setActionLoading("bulk-assign");
    let successCount = 0;
    for (const userId of userIds) {
      try {
        const result = await assignUserToGroup(selectedGroup.id, userId);
        if (result.success) successCount++;
      } catch {}
    }
    showToast(
      "success",
      `Added ${successCount} user(s) to ${selectedGroup.name}.`,
    );
    await fetchGroupUsers(selectedGroup.id);
    await fetchGroups();
    setActionLoading(null);
  };
  // ===== DnD HANDLERS =====
  // Called by UsersTable (dragging a member) or UserPool (dragging an unassigned user)
  const handleDragStart = useCallback((userId, fromGroupId) => {
    setDragging({ userId, fromGroupId });
    dragCounters.current = {};
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDropTarget(null);
    dragCounters.current = {};
  }, []);

  // Generic enter/leave helpers (uses counter to ignore child re-fires)
  const handleDragEnter = useCallback((zone) => {
    dragCounters.current[zone] = (dragCounters.current[zone] || 0) + 1;
    setDropTarget(zone);
  }, []);

  const handleDragLeave = useCallback((zone) => {
    dragCounters.current[zone] = (dragCounters.current[zone] || 0) - 1;
    if (dragCounters.current[zone] <= 0) {
      setDropTarget((prev) => (prev === zone ? null : prev));
    }
  }, []);

  // Drop onto a group row in GroupsList → assign user to THAT group
  const handleDropOnGroup = useCallback(
    async (targetGroupId) => {
      setDropTarget(null);
      dragCounters.current = {};
      if (!dragging) return;
      const { userId, fromGroupId } = dragging;
      setDragging(null);

      // Already in this group → no-op
      if (fromGroupId === targetGroupId) return;

      const user = allUsers.find((u) => u.id === userId);
      const targetGroup = groups.find((g) => g.id === targetGroupId);

      setActionLoading(`assign-${userId}`);
      try {
        const result = await assignUserToGroup(targetGroupId, userId);
        if (result.success) {
          showToast(
            "success",
            `${user?.first_name || user?.username} added to ${targetGroup?.name}.`,
          );
          // Refresh currently viewed group & counts
          if (selectedGroup) await fetchGroupUsers(selectedGroup.id);
          await fetchGroups();
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
    },
    [dragging, allUsers, groups, selectedGroup, fetchGroupUsers, fetchGroups],
  );

  // Drop onto the members panel → assign to selectedGroup
  const handleDropOnMembers = useCallback(async () => {
    setDropTarget(null);
    dragCounters.current = {};
    if (!dragging || !selectedGroup) return;
    const { userId, fromGroupId } = dragging;
    setDragging(null);

    if (fromGroupId === selectedGroup.id) return; // already a member

    const user = allUsers.find((u) => u.id === userId);
    setActionLoading(`assign-${userId}`);
    try {
      const result = await assignUserToGroup(selectedGroup.id, userId);
      if (result.success) {
        showToast(
          "success",
          `${user?.first_name || user?.username} added to ${selectedGroup.name}.`,
        );
        await fetchGroupUsers(selectedGroup.id);
        await fetchGroups();
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
  }, [dragging, selectedGroup, allUsers, fetchGroupUsers, fetchGroups]);

  // Drop onto the pool panel → remove from selectedGroup
  const handleDropOnPool = useCallback(async () => {
    setDropTarget(null);
    dragCounters.current = {};
    if (!dragging) return;
    const { userId, fromGroupId } = dragging;
    setDragging(null);

    if (!fromGroupId) return; // not in any group, nothing to remove

    const user = allUsers.find((u) => u.id === userId);
    const group = groups.find((g) => g.id === fromGroupId);

    setActionLoading(`remove-${userId}`);
    try {
      const result = await removeUserFromGroup(fromGroupId, userId);
      if (result.success) {
        showToast(
          "success",
          `${user?.first_name || user?.username} removed from ${group?.name}.`,
        );
        await fetchGroupUsers(fromGroupId);
        await fetchGroups();
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
  }, [dragging, allUsers, groups, fetchGroupUsers, fetchGroups]);

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
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
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
      <div style={{ padding: isMobile ? "0.75rem 0.75rem 0" : "1rem 1rem 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? "1rem" : "1.1rem",
                fontWeight: "700",
              }}
            >
              🔐 Access Management
            </h1>
            <p
              style={{
                margin: "0.25rem 0 0",
                color: colors.textSecondary,
                fontSize: "0.8rem",
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
                padding: "0.4rem 0.75rem",
                borderRadius: "8px",
                border: "none",
                background: colors.btnPrimary,
                color: "#fff",
                fontSize: "0.78rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              <span>+</span> New Group
            </button>
          )}
        </div>

        {/* STATS ROW */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
            marginBottom: "0.75rem",
          }}
        >
          {[
            { label: "Total Groups", value: groups.length },
            { label: "Total Users", value: allUsers.length },
            {
              label: "Active Users",
              value: allUsers.filter((u) => u.is_active).length,
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: colors.cardBg,
                border: `0.5px solid ${colors.cardBorder}`,
                borderRadius: "8px",
                padding: isMobile ? "8px" : "10px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  color: colors.textTertiary,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: isMobile ? "18px" : "22px",
                  fontWeight: "500",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${colors.cardBorder}`,
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
                flex: isMobile ? 1 : "unset",
                padding: isMobile ? "0.65rem 0.5rem" : "0.75rem 1.5rem",
                border: "none",
                background: "transparent",
                color:
                  activeTab === tab.id
                    ? colors.btnPrimary
                    : colors.textSecondary,
                fontSize: isMobile ? "0.75rem" : "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                borderBottom: `2px solid ${activeTab === tab.id ? colors.tabActive : "transparent"}`,
                marginBottom: "-2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "14px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "groups" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <GroupsTab
            groups={groups}
            allUsers={allUsers}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            groupUsers={groupUsers}
            loading={loading}
            groupUsersLoading={groupUsersLoading}
            actionLoading={actionLoading}
            handleAssignUser={handleAssignUser}
            handleRemoveUser={handleRemoveUser}
            setGroupModal={setGroupModal}
            setConfirmModal={setConfirmModal}
            handleDeleteGroup={handleDeleteGroup}
            colors={colors}
            darkMode={darkMode}
            userRole={userRole}
            // DnD props
            dragging={dragging}
            dropTarget={dropTarget}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDragEnter={handleDragEnter}
            handleDragLeave={handleDragLeave}
            handleDropOnGroup={handleDropOnGroup}
            handleDropOnMembers={handleDropOnMembers}
            handleDropOnPool={handleDropOnPool}
            handleBulkRemove={handleBulkRemove}
            handleBulkAssign={handleBulkAssign}
          />
        </div>
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
