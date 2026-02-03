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

function GroupManagementPage({ darkMode, userRole }) {
  // ===== STATE =====
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null); // full group object
  const [groupUsers, setGroupUsers] = useState([]); // users in selected group
  const [loading, setLoading] = useState(true);
  const [groupUsersLoading, setGroupUsersLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Modals
  const [groupModal, setGroupModal] = useState(null);
  // groupModal: { mode: "create" | "edit", data: { name, description } | null }
  const [confirmModal, setConfirmModal] = useState(null);
  // confirmModal: { type: "delete-group" | "remove-user", groupId, userId?, title, message, onConfirm }

  // Assign user dropdown
  const [assignSearch, setAssignSearch] = useState("");
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // ===== COLORS =====
  const colors = darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#161616",
        cardBorder: "#252525",
        textPrimary: "#fff",
        textSecondary: "#999",
        textTertiary: "#555",
        inputBg: "#1a1a1a",
        inputBorder: "#2a2a2a",
        rowHover: "#1e1e1e",
        rowBorder: "#222",
        selectedBg: "#1f1f1f",
        selectedBorder: "#3a3a3a",
        btnPrimary: "#6366f1",
        btnPrimaryHover: "#5558e3",
        btnDanger: "#ef4444",
        btnDangerHover: "#dc2626",
        btnGhost: "transparent",
        btnGhostBorder: "#333",
        btnGhostText: "#999",
        modalOverlay: "rgba(0,0,0,0.6)",
        modalBg: "#1e1e1e",
        modalBorder: "#333",
        toastSuccess: { bg: "#16a34a", text: "#fff" },
        toastError: { bg: "#dc2626", text: "#fff" },
        dropdownBg: "#1e1e1e",
        dropdownBorder: "#2a2a2a",
        dropdownHover: "#2a2a2a",
        badgeActive: { bg: "#0a2a0a", text: "#22c55e" },
        badgeInactive: { bg: "#1a1a1a", text: "#666" },
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        textPrimary: "#111",
        textSecondary: "#555",
        textTertiary: "#999",
        inputBg: "#fff",
        inputBorder: "#ddd",
        rowHover: "#fafafa",
        rowBorder: "#eee",
        selectedBg: "#f0f4ff",
        selectedBorder: "#6366f1",
        btnPrimary: "#6366f1",
        btnPrimaryHover: "#5558e3",
        btnDanger: "#ef4444",
        btnDangerHover: "#dc2626",
        btnGhost: "transparent",
        btnGhostBorder: "#ddd",
        btnGhostText: "#666",
        modalOverlay: "rgba(0,0,0,0.4)",
        modalBg: "#fff",
        modalBorder: "#e5e5e5",
        toastSuccess: { bg: "#16a34a", text: "#fff" },
        toastError: { bg: "#dc2626", text: "#fff" },
        dropdownBg: "#fff",
        dropdownBorder: "#e5e5e5",
        dropdownHover: "#f5f5f5",
        badgeActive: { bg: "#dcfce7", text: "#16a34a" },
        badgeInactive: { bg: "#f3f4f6", text: "#6b7280" },
      };

  // ===== FETCH =====
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

  // Fetch users of selected group
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

  // When selectedGroup changes, fetch its users
  useEffect(() => {
    if (selectedGroup) fetchGroupUsers(selectedGroup.id);
  }, [selectedGroup, fetchGroupUsers]);

  // ===== TOAST =====
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ===== GROUP CRUD HANDLERS =====
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
      // If editing, update selectedGroup too
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
      const detail = err?.response?.data?.detail || "Failed to save group.";
      showToast("error", detail);
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
      const detail = err?.response?.data?.detail || "Failed to delete group.";
      showToast("error", detail);
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
      const detail = err?.response?.data?.detail || "Failed to assign user.";
      showToast("error", detail);
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
          const detail =
            err?.response?.data?.detail || "Failed to remove user.";
          showToast("error", detail);
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // ===== COMPUTED: users NOT in selected group (for assign dropdown) =====
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
    return (
      <div
        style={{
          padding: "2rem",
          color: colors.textPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <h2 style={{ margin: "0 0 0.5rem", color: colors.textPrimary }}>
            Access Denied
          </h2>
          <p style={{ color: colors.textSecondary, margin: 0 }}>
            Only Admins can manage groups.
          </p>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
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
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 1000,
            padding: "0.85rem 1.4rem",
            borderRadius: "10px",
            background:
              toast.type === "success"
                ? colors.toastSuccess.bg
                : colors.toastError.bg,
            color: "#fff",
            fontSize: "0.85rem",
            fontWeight: "500",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            animation: "slideIn 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: colors.modalOverlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{
              background: colors.modalBg,
              border: `1px solid ${colors.modalBorder}`,
              borderRadius: "14px",
              padding: "2rem",
              width: "380px",
              maxWidth: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
              {confirmModal.type === "delete-group" ? "🗑️" : "👤"}
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.1rem",
              }}
            >
              {confirmModal.title}
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              {confirmModal.message}
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.modalBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: colors.btnDanger,
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GROUP FORM MODAL (Create / Edit) */}
      {groupModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: colors.modalOverlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setGroupModal(null)}
        >
          <div
            style={{
              background: colors.modalBg,
              border: `1px solid ${colors.modalBorder}`,
              borderRadius: "14px",
              padding: "2rem",
              width: "420px",
              maxWidth: "92%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 1.25rem",
                color: colors.textPrimary,
                fontSize: "1.15rem",
              }}
            >
              {groupModal.mode === "create"
                ? "➕ Create New Group"
                : "✏️ Edit Group"}
            </h3>

            {/* Name */}
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: "600",
                color: colors.textTertiary,
                marginBottom: "0.35rem",
                letterSpacing: "0.04em",
              }}
            >
              GROUP NAME
            </label>
            <input
              autoFocus
              type="text"
              value={groupModal.data?.name || ""}
              onChange={(e) =>
                setGroupModal((prev) => ({
                  ...prev,
                  data: { ...prev.data, name: e.target.value },
                }))
              }
              placeholder="e.g. For Decking"
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: `1px solid ${colors.inputBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: "0.88rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* Description */}
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: "600",
                color: colors.textTertiary,
                marginBottom: "0.35rem",
                marginTop: "1rem",
                letterSpacing: "0.04em",
              }}
            >
              DESCRIPTION
            </label>
            <textarea
              value={groupModal.data?.description || ""}
              onChange={(e) =>
                setGroupModal((prev) => ({
                  ...prev,
                  data: { ...prev.data, description: e.target.value },
                }))
              }
              placeholder="Optional description..."
              rows={3}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: `1px solid ${colors.inputBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: "0.88rem",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1.5rem",
              }}
            >
              <button
                onClick={() => setGroupModal(null)}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.modalBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                disabled={actionLoading === "group-form"}
                onClick={handleGroupSubmit}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: colors.btnPrimary,
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor:
                    actionLoading === "group-form" ? "not-allowed" : "pointer",
                  opacity: actionLoading === "group-form" ? 0.7 : 1,
                }}
              >
                {actionLoading === "group-form"
                  ? "Saving..."
                  : groupModal.mode === "create"
                    ? "Create"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: "2rem 2rem 1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
              Manage groups at i-assign ang mga users sa workflow groups.
            </p>
          </div>
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
        </div>
      </div>

      {/* STATS */}
      <div
        style={{
          padding: "0 2rem 1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
      >
        {[
          {
            label: "Total Groups",
            value: groups.length,
            icon: "📂",
            color: "#6366f1",
          },
          {
            label: "Total Users",
            value: allUsers.length,
            icon: "👥",
            color: "#22c55e",
          },
          {
            label: "Active Users",
            value: allUsers.filter((u) => u.is_active).length,
            icon: "✓",
            color: "#f59e0b",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              padding: "1.1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: darkMode ? `${stat.color}18` : `${stat.color}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                  fontWeight: "600",
                  letterSpacing: "0.04em",
                }}
              >
                {stat.label.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN BODY: LEFT (Groups list) + RIGHT (Group detail) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "1.25rem",
          padding: "0 2rem 2rem",
          overflow: "auto",
        }}
      >
        {/* LEFT PANEL — Group List */}
        <div
          style={{
            width: "300px",
            minWidth: "300px",
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "14px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: "0.9rem",
              borderBottom: `1px solid ${colors.cardBorder}`,
            }}
          >
            <input
              type="text"
              placeholder="Search groups..."
              id="group-search"
              style={{
                width: "100%",
                padding: "0.5rem 0.85rem",
                borderRadius: "8px",
                border: `1px solid ${colors.inputBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Group Items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: colors.textTertiary,
                  fontSize: "0.85rem",
                }}
              >
                Loading...
              </div>
            ) : groups.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  📂
                </div>
                <div
                  style={{ color: colors.textSecondary, fontSize: "0.85rem" }}
                >
                  No groups yet.
                </div>
              </div>
            ) : (
              groups.map((group) => {
                const isSelected = selectedGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    style={{
                      padding: "0.85rem 1rem",
                      cursor: "pointer",
                      background: isSelected
                        ? colors.selectedBg
                        : "transparent",
                      borderLeft: isSelected
                        ? `3px solid ${colors.btnPrimary}`
                        : "3px solid transparent",
                      borderBottom: `1px solid ${colors.rowBorder}`,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      !isSelected &&
                      (e.currentTarget.style.background = colors.rowHover)
                    }
                    onMouseLeave={(e) =>
                      !isSelected &&
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          color: isSelected
                            ? colors.btnPrimary
                            : colors.textPrimary,
                        }}
                      >
                        {group.name}
                      </div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          background: darkMode ? "#2a2a2a" : "#f0f0f0",
                          color: colors.textTertiary,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "10px",
                        }}
                      >
                        {group.user_count ?? "—"}
                      </span>
                    </div>
                    {group.description && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: colors.textTertiary,
                          marginTop: "0.2rem",
                        }}
                      >
                        {group.description}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Group Detail */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!selectedGroup ? (
            <div
              style={{
                flex: 1,
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
                  👈
                </div>
                <div
                  style={{ color: colors.textSecondary, fontSize: "0.9rem" }}
                >
                  Select a group to view details
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Group Header */}
              <div
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "14px 14px 0 0",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.2rem",
                      fontWeight: "700",
                      color: colors.textPrimary,
                    }}
                  >
                    {selectedGroup.name}
                  </h2>
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      color: colors.textTertiary,
                      fontSize: "0.82rem",
                    }}
                  >
                    {selectedGroup.description || "No description"}
                    <span
                      style={{ margin: "0 0.5rem", color: colors.cardBorder }}
                    >
                      •
                    </span>
                    {groupUsers.length} user{groupUsers.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {/* Edit */}
                  <button
                    onClick={() =>
                      setGroupModal({
                        mode: "edit",
                        data: {
                          name: selectedGroup.name,
                          description: selectedGroup.description || "",
                        },
                      })
                    }
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "7px",
                      border: `1px solid ${colors.btnGhostBorder}`,
                      background: colors.btnGhost,
                      color: colors.btnGhostText,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit
                  </button>

                  {/* Delete — SuperAdmin only */}
                  {userRole === "SuperAdmin" && (
                    <button
                      onClick={() =>
                        setConfirmModal({
                          type: "delete-group",
                          title: "Delete Group?",
                          message: `Ang group na "${selectedGroup.name}" at lahat ng user assignments nito ay ire-remove.`,
                          onConfirm: handleDeleteGroup,
                        })
                      }
                      style={{
                        padding: "0.45rem 0.9rem",
                        borderRadius: "7px",
                        border: "none",
                        background: darkMode ? "#2a1a1a" : "#fef2f2",
                        color: colors.btnDanger,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Assign User Bar */}
              <div
                style={{
                  background: colors.cardBg,
                  borderLeft: `1px solid ${colors.cardBorder}`,
                  borderRight: `1px solid ${colors.cardBorder}`,
                  padding: "1rem 1.5rem",
                  borderBottom: `1px solid ${colors.rowBorder}`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    letterSpacing: "0.04em",
                    marginBottom: "0.5rem",
                  }}
                >
                  ASSIGN USER TO GROUP
                </div>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search user to assign..."
                      value={assignSearch}
                      onFocus={() => setShowAssignDropdown(true)}
                      onChange={(e) => {
                        setAssignSearch(e.target.value);
                        setShowAssignDropdown(true);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.85rem",
                        borderRadius: "8px",
                        border: `1px solid ${colors.inputBorder}`,
                        background: colors.inputBg,
                        color: colors.textPrimary,
                        fontSize: "0.85rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />

                    {/* Dropdown */}
                    {showAssignDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: colors.dropdownBg,
                          border: `1px solid ${colors.dropdownBorder}`,
                          borderRadius: "8px",
                          marginTop: "4px",
                          maxHeight: "200px",
                          overflowY: "auto",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        }}
                      >
                        {availableUsers.length === 0 ? (
                          <div
                            style={{
                              padding: "0.85rem",
                              color: colors.textTertiary,
                              fontSize: "0.82rem",
                              textAlign: "center",
                            }}
                          >
                            {allUsers.length === 0
                              ? "No users available"
                              : "No matching users"}
                          </div>
                        ) : (
                          availableUsers.slice(0, 15).map((u) => (
                            <div
                              key={u.id}
                              onClick={() => handleAssignUser(u.id)}
                              style={{
                                padding: "0.6rem 0.85rem",
                                cursor: "pointer",
                                borderBottom: `1px solid ${colors.rowBorder}`,
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  colors.dropdownHover)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <div
                                style={{
                                  fontWeight: "600",
                                  fontSize: "0.85rem",
                                  color: colors.textPrimary,
                                }}
                              >
                                {u.first_name || u.username}
                                <span
                                  style={{
                                    fontWeight: "400",
                                    color: colors.textTertiary,
                                    marginLeft: "0.4rem",
                                  }}
                                >
                                  @{u.username}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: colors.textTertiary,
                                }}
                              >
                                {u.email}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div
                style={{
                  flex: 1,
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "0 0 14px 14px",
                  overflow: "auto",
                }}
                onClick={() => setShowAssignDropdown(false)}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr 140px 100px 110px",
                    gap: "1rem",
                    padding: "0.7rem 1.5rem",
                    background: darkMode ? "#1a1a1a" : "#f9f9f9",
                    borderBottom: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  {["", "Name / Email", "Username", "Status", "Action"].map(
                    (h) => (
                      <div
                        key={h}
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          color: colors.textTertiary,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          textAlign: h === "Action" ? "right" : "left",
                        }}
                      >
                        {h}
                      </div>
                    ),
                  )}
                </div>

                {/* Rows */}
                {groupUsersLoading ? (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: colors.textTertiary,
                      fontSize: "0.85rem",
                    }}
                  >
                    Loading users...
                  </div>
                ) : groupUsers.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>
                      👤
                    </div>
                    <div
                      style={{
                        color: colors.textSecondary,
                        fontSize: "0.85rem",
                      }}
                    >
                      No users in this group yet.
                    </div>
                  </div>
                ) : (
                  groupUsers.map((user, i) => {
                    const isRemoving = actionLoading === `remove-${user.id}`;
                    return (
                      <div
                        key={user.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "36px 1fr 140px 100px 110px",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "0.75rem 1.5rem",
                          background:
                            i % 2 === 0
                              ? "transparent"
                              : darkMode
                                ? "#1a1a1a"
                                : "#fafafa",
                          borderBottom: `1px solid ${colors.rowBorder}`,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = colors.rowHover)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            i % 2 === 0
                              ? "transparent"
                              : darkMode
                                ? "#1a1a1a"
                                : "#fafafa")
                        }
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: darkMode ? "#2a2a2a" : "#e5e5e5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            color: colors.textSecondary,
                          }}
                        >
                          {(user.first_name ||
                            user.username ||
                            "?")[0].toUpperCase()}
                        </div>

                        {/* Name + Email */}
                        <div>
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "0.88rem",
                              color: colors.textPrimary,
                            }}
                          >
                            {user.first_name && user.surname
                              ? `${user.first_name} ${user.surname}`
                              : user.username}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: colors.textTertiary,
                            }}
                          >
                            {user.email || "—"}
                          </div>
                        </div>

                        {/* Username */}
                        <div
                          style={{
                            fontSize: "0.83rem",
                            color: colors.textSecondary,
                            fontFamily: "monospace",
                          }}
                        >
                          {user.username}
                        </div>

                        {/* Status */}
                        <div>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.18rem 0.6rem",
                              borderRadius: "20px",
                              fontSize: "0.72rem",
                              fontWeight: "600",
                              background: user.is_active
                                ? colors.badgeActive.bg
                                : colors.badgeInactive.bg,
                              color: user.is_active
                                ? colors.badgeActive.text
                                : colors.badgeInactive.text,
                            }}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {/* Remove button */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            disabled={isRemoving}
                            onClick={() =>
                              handleRemoveUser(user.id, user.username)
                            }
                            style={{
                              padding: "0.38rem 0.85rem",
                              borderRadius: "6px",
                              border: `1px solid ${colors.btnDanger}`,
                              background: "transparent",
                              color: colors.btnDanger,
                              fontSize: "0.78rem",
                              fontWeight: "600",
                              cursor: isRemoving ? "not-allowed" : "pointer",
                              opacity: isRemoving ? 0.5 : 1,
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isRemoving) {
                                e.target.style.background = colors.btnDanger;
                                e.target.style.color = "#fff";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isRemoving) {
                                e.target.style.background = "transparent";
                                e.target.style.color = colors.btnDanger;
                              }
                            }}
                          >
                            {isRemoving ? "..." : "✕ Remove"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

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
