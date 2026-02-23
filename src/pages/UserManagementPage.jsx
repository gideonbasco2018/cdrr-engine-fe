// FILE: src/pages/UserManagementPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllUsers,
  getPendingUsers,
  activateUser,
  deactivateUser,
  resetPassword,
  updateUser,
  getAllGroups,
} from "../api/auth";

function UserManagementPage({ darkMode, userRole }) {
  // ===== STATE =====
  const [allUsers, setAllUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [roleFilter, setRoleFilter] = useState(null);
  const [groupFilter, setGroupFilter] = useState([]);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role: "",
  });

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
        inputPlaceholder: "#555",
        tabActive: "#fff",
        tabActiveBg: "#222",
        tabInactive: "#666",
        tabInactiveBg: "transparent",
        tabHover: "#1a1a1a",
        rowBg: "transparent",
        rowHover: "#1a1a1a",
        rowBorder: "#222",
        btnActivate: "#22c55e",
        btnActivateHover: "#16a34a",
        btnDeactivate: "#ef4444",
        btnDeactivateHover: "#dc2626",
        btnDisabled: "#333",
        badgePending: { bg: "#2a1a00", text: "#f59e0b" },
        badgeActive: { bg: "#0a2a0a", text: "#22c55e" },
        badgeInactive: { bg: "#1a1a1a", text: "#666" },
        modalOverlay: "rgba(0,0,0,0.6)",
        modalBg: "#1e1e1e",
        modalBorder: "#333",
        toastSuccess: { bg: "#16a34a", text: "#fff" },
        toastError: { bg: "#dc2626", text: "#fff" },
        menuBg: "#1e1e1e",
        menuBorder: "#333",
        menuItemHover: "#2a2a2a",
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
        inputPlaceholder: "#999",
        tabActive: "#111",
        tabActiveBg: "#fff",
        tabInactive: "#888",
        tabInactiveBg: "transparent",
        tabHover: "#f0f0f0",
        rowBg: "transparent",
        rowHover: "#fafafa",
        rowBorder: "#eee",
        btnActivate: "#22c55e",
        btnActivateHover: "#16a34a",
        btnDeactivate: "#ef4444",
        btnDeactivateHover: "#dc2626",
        btnDisabled: "#ccc",
        badgePending: { bg: "#fef3c7", text: "#d97706" },
        badgeActive: { bg: "#dcfce7", text: "#16a34a" },
        badgeInactive: { bg: "#f3f4f6", text: "#6b7280" },
        modalOverlay: "rgba(0,0,0,0.4)",
        modalBg: "#fff",
        modalBorder: "#e5e5e5",
        toastSuccess: { bg: "#16a34a", text: "#fff" },
        toastError: { bg: "#dc2626", text: "#fff" },
        menuBg: "#fff",
        menuBorder: "#e5e5e5",
        menuItemHover: "#f5f5f5",
      };

  // ===== FETCH DATA =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        getAllUsers(),
        getPendingUsers(),
        getAllGroups(),
      ]);
      setAllUsers(Array.isArray(results[0]) ? results[0] : []);
      setPendingUsers(Array.isArray(results[1]) ? results[1] : []);
      setGroups(Array.isArray(results[2]) ? results[2] : []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showToast("error", "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  // Close group dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(e.target)
      ) {
        setGroupDropdownOpen(false);
      }
    };
    if (groupDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [groupDropdownOpen]);

  // ===== TOAST =====
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ===== ACTIVATE / DEACTIVATE =====
  const handleAction = async () => {
    if (!confirmModal) return;
    const { userId, action } = confirmModal;

    setActionLoading(userId);
    setConfirmModal(null);

    try {
      if (action === "activate") {
        await activateUser(userId);
        showToast("success", "User activated successfully.");
      } else {
        await deactivateUser(userId);
        showToast("success", "User deactivated successfully.");
      }
      await fetchData();
    } catch (err) {
      console.error("Action failed:", err);
      const detail =
        err?.response?.data?.detail || "Action failed. Please try again.";
      showToast("error", detail);
    } finally {
      setActionLoading(null);
    }
  };

  // ===== RESET PASSWORD =====
  const handleResetPassword = async () => {
    if (!passwordModal || !newPassword.trim()) {
      showToast("error", "Please enter a new password.");
      return;
    }

    const { userId, username } = passwordModal;
    setActionLoading(userId);
    setPasswordModal(null);
    setNewPassword("");
    setShowPassword(false);

    try {
      await resetPassword(userId, newPassword);
      showToast(
        "success",
        `Password for ${username} has been reset successfully.`,
      );
      await fetchData();
    } catch (err) {
      console.error("Password reset failed:", err);
      const detail =
        err?.response?.data?.detail ||
        "Password reset failed. Please try again.";
      showToast("error", detail);
    } finally {
      setActionLoading(null);
    }
  };

  // ===== EDIT USER =====
  const handleEditUser = async () => {
    if (!editModal) return;

    const { userId } = editModal;
    const updates = {};

    if (editForm.username && editForm.username !== editModal.originalUsername) {
      updates.username = editForm.username;
    }
    if (editForm.email && editForm.email !== editModal.originalEmail) {
      updates.email = editForm.email;
    }
    if (editForm.role && editForm.role !== editModal.originalRole) {
      updates.role = editForm.role;
    }

    if (Object.keys(updates).length === 0) {
      showToast("error", "No changes detected.");
      return;
    }

    setActionLoading(userId);
    setEditModal(null);

    try {
      await updateUser(userId, updates);
      showToast("success", "User updated successfully.");
      await fetchData();
    } catch (err) {
      console.error("Update failed:", err);
      const detail =
        err?.response?.data?.detail || "Update failed. Please try again.";
      showToast("error", detail);
    } finally {
      setActionLoading(null);
    }
  };

  // ===== FILTER =====
  const filteredUsers = (() => {
    let source;

    if (activeTab === "pending") {
      source = pendingUsers;
    } else if (activeTab === "active") {
      source = allUsers.filter((u) => u.is_active);
    } else {
      source = allUsers;
    }

    // Role filtering
    if (roleFilter) {
      source = source.filter((u) => (u.role || "User") === roleFilter);
    }

    // Group filtering (multi-select)
    if (groupFilter.length > 0) {
      source = source.filter((u) =>
        (u.groups || []).some((g) => groupFilter.includes(g.id)),
      );
    }

    // Search filtering
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.surname || "").toLowerCase().includes(q) ||
        (u.access_request || "").toLowerCase().includes(q) ||
        (u.groups?.[0]?.name || "").toLowerCase().includes(q),
    );
  })();

  // ===== GUARD: Admin / SuperAdmin only =====
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
            Only Admins can manage users.
          </p>
        </div>
      </div>
    );
  }

  // ===== STATUS BADGE =====
  const StatusBadge = ({ isActive }) => {
    const badge = isActive ? colors.badgeActive : colors.badgeInactive;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.2rem 0.65rem",
          borderRadius: "20px",
          fontSize: "0.72rem",
          fontWeight: "600",
          background: badge.bg,
          color: badge.text,
          letterSpacing: "0.03em",
        }}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  // ===== ROLE BADGE =====
  const roleBadgeColor = {
    User: {
      bg: darkMode ? "#0a2a3a" : "#dbeafe",
      text: darkMode ? "#38bdf8" : "#2563eb",
    },
    Admin: {
      bg: darkMode ? "#1a1a3a" : "#ede9fe",
      text: darkMode ? "#a78bfa" : "#7c3aed",
    },
    SuperAdmin: {
      bg: darkMode ? "#2a1a00" : "#fff7ed",
      text: darkMode ? "#fb923c" : "#ea580c",
    },
  };

  const RoleBadge = ({ role, clickable = false }) => {
    const c = roleBadgeColor[role] || roleBadgeColor.User;
    const isFiltered = roleFilter === role;

    return (
      <span
        onClick={
          clickable ? () => setRoleFilter(isFiltered ? null : role) : undefined
        }
        style={{
          display: "inline-block",
          padding: "0.2rem 0.65rem",
          borderRadius: "20px",
          fontSize: "0.72rem",
          fontWeight: "600",
          background: isFiltered ? c.text : c.bg,
          color: isFiltered ? "#fff" : c.text,
          cursor: clickable ? "pointer" : "default",
          transition: "all 0.15s ease",
          border: isFiltered ? "none" : `1px solid ${c.text}40`,
        }}
        onMouseEnter={
          clickable
            ? (e) => {
                if (!isFiltered) {
                  e.currentTarget.style.background = c.text + "20";
                }
              }
            : undefined
        }
        onMouseLeave={
          clickable
            ? (e) => {
                if (!isFiltered) {
                  e.currentTarget.style.background = c.bg;
                }
              }
            : undefined
        }
      >
        {role}
      </span>
    );
  };

  // ===== GROUP BADGE =====
  const GroupBadges = ({ groups = [] }) => {
    if (!groups.length) {
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.8rem" }}>
          —
        </span>
      );
    }

    return (
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {groups.map((g) => (
          <span
            key={g.id}
            style={{
              display: "inline-block",
              padding: "0.2rem 0.65rem",
              borderRadius: "20px",
              fontSize: "0.72rem",
              fontWeight: "600",
              background: darkMode ? "#1a2a1a" : "#f0fdf4",
              color: darkMode ? "#86efac" : "#15803d",
              whiteSpace: "nowrap",
            }}
          >
            {g.name}
          </span>
        ))}
      </div>
    );
  };

  // ===== GROUP FILTER DROPDOWN =====
  const GroupFilterDropdown = () => {
    const hasFilter = groupFilter.length > 0;

    const toggleGroup = (groupId) => {
      setGroupFilter((prev) =>
        prev.includes(groupId)
          ? prev.filter((id) => id !== groupId)
          : [...prev, groupId],
      );
    };

    return (
      <div style={{ position: "relative" }} ref={groupDropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={() => setGroupDropdownOpen((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.9rem",
            borderRadius: "8px",
            border: `1px solid ${hasFilter ? "#6366f1" : colors.inputBorder}`,
            background: hasFilter
              ? darkMode
                ? "#1a1a3a"
                : "#ede9fe"
              : colors.inputBg,
            color: hasFilter
              ? darkMode
                ? "#a78bfa"
                : "#7c3aed"
              : colors.textSecondary,
            fontSize: "0.83rem",
            fontWeight: hasFilter ? "600" : "400",
            cursor: "pointer",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
            height: "34px",
            boxSizing: "border-box",
          }}
        >
          <span>🏷️</span>
          <span>
            {hasFilter ? `Group (${groupFilter.length})` : "Filter by Group"}
          </span>
          <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>
            {groupDropdownOpen ? "▲" : "▼"}
          </span>
        </button>

        {/* Dropdown Panel */}
        {groupDropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: colors.menuBg,
              border: `1px solid ${colors.menuBorder}`,
              borderRadius: "10px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              minWidth: "220px",
              zIndex: 200,
              overflow: "hidden",
            }}
          >
            {/* Dropdown Header */}
            <div
              style={{
                padding: "0.6rem 1rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  color: colors.textTertiary,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Filter by Group
              </span>
              {hasFilter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupFilter([]);
                  }}
                  style={{
                    fontSize: "0.72rem",
                    color: "#6366f1",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "600",
                    padding: 0,
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Group Items */}
            <div style={{ maxHeight: "240px", overflowY: "auto" }}>
              {groups.length === 0 ? (
                <div
                  style={{
                    padding: "1rem",
                    fontSize: "0.82rem",
                    color: colors.textTertiary,
                    textAlign: "center",
                  }}
                >
                  No groups found
                </div>
              ) : (
                groups.map((group) => {
                  const isChecked = groupFilter.includes(group.id);
                  const userCount = allUsers.filter((u) =>
                    (u.groups || []).some((g) => g.id === group.id),
                  ).length;

                  return (
                    <div
                      key={group.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroup(group.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.65rem 1rem",
                        cursor: "pointer",
                        background: isChecked
                          ? darkMode
                            ? "#1a1a3a"
                            : "#f5f3ff"
                          : "transparent",
                        transition: "background 0.15s ease",
                        borderBottom: `1px solid ${colors.cardBorder}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked)
                          e.currentTarget.style.background =
                            colors.menuItemHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Custom Checkbox */}
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "4px",
                          border: `2px solid ${
                            isChecked ? "#6366f1" : colors.textTertiary
                          }`,
                          background: isChecked ? "#6366f1" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isChecked && (
                          <span
                            style={{
                              color: "#fff",
                              fontSize: "0.6rem",
                              fontWeight: "700",
                              lineHeight: 1,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      {/* Group Name */}
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: colors.textPrimary,
                          fontWeight: isChecked ? "600" : "400",
                          flex: 1,
                        }}
                      >
                        {group.name}
                      </span>

                      {/* User Count Badge */}
                      <span
                        style={{
                          fontSize: "0.7rem",
                          background: darkMode ? "#222" : "#f0f0f0",
                          color: colors.textTertiary,
                          padding: "0.1rem 0.45rem",
                          borderRadius: "10px",
                          fontWeight: "600",
                          flexShrink: 0,
                        }}
                      >
                        {userCount}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== ACTION MENU =====
  const ActionMenu = ({ user }) => {
    const menuRef = useRef(null);
    const isOpen = openMenuId === user.id;
    const isPending = !user.is_active;
    const isProcessing = actionLoading === user.id;

    const toggleMenu = (e) => {
      e.stopPropagation();
      setOpenMenuId(isOpen ? null : user.id);
    };

    const menuItems = [];

    menuItems.push({
      label: "Edit User",
      action: "edit",
      icon: "✏️",
    });

    if (isPending) {
      menuItems.push({
        label: "Activate",
        action: "activate",
        icon: "✓",
      });
    } else {
      menuItems.push({
        label: "Deactivate",
        action: "deactivate",
        icon: "✕",
      });
    }

    menuItems.push({
      label: "Reset Password",
      action: "reset_password",
      icon: "🔑",
    });

    return (
      <div style={{ position: "relative" }} ref={menuRef}>
        <button
          onClick={toggleMenu}
          disabled={isProcessing}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            border: `1px solid ${colors.cardBorder}`,
            background: isOpen ? colors.menuItemHover : "transparent",
            color: colors.textSecondary,
            fontSize: "1.1rem",
            cursor: isProcessing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) =>
            !isProcessing &&
            !isOpen &&
            (e.target.style.background = colors.menuItemHover)
          }
          onMouseLeave={(e) =>
            !isProcessing &&
            !isOpen &&
            (e.target.style.background = "transparent")
          }
        >
          {isProcessing ? "..." : "⋯"}
        </button>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              background: colors.menuBg,
              border: `1px solid ${colors.menuBorder}`,
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: "160px",
              zIndex: 100,
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);

                  if (item.action === "reset_password") {
                    setPasswordModal({
                      userId: user.id,
                      username: user.username,
                    });
                  } else if (item.action === "edit") {
                    setEditModal({
                      userId: user.id,
                      username: user.username,
                      originalUsername: user.username,
                      originalEmail: user.email,
                      originalRole: user.role || "User",
                    });
                    setEditForm({
                      username: user.username,
                      email: user.email,
                      role: user.role || "User",
                    });
                  } else {
                    setConfirmModal({
                      userId: user.id,
                      username: user.username,
                      action: item.action,
                    });
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem",
                  border: "none",
                  background: "transparent",
                  color: colors.textPrimary,
                  fontSize: "0.82rem",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  transition: "background 0.15s ease",
                  borderBottom:
                    idx < menuItems.length - 1
                      ? `1px solid ${colors.cardBorder}`
                      : "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = colors.menuItemHover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span style={{ fontSize: "0.9rem" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ===== USER ROW =====
  // gridTemplateColumns: avatar | name+email | username | role | group | status | access_request | actions
  const UserRow = ({ user, index }) => {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 180px 90px 120px 90px 1fr 60px",
          alignItems: "center",
          gap: "1rem",
          padding: "0.9rem 1.25rem",
          background:
            index % 2 === 0 ? colors.rowBg : darkMode ? "#1a1a1a" : "#fafafa",
          borderBottom: `1px solid ${colors.rowBorder}`,
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = colors.rowHover)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background =
            index % 2 === 0 ? colors.rowBg : darkMode ? "#1a1a1a" : "#fafafa")
        }
      >
        {/* Avatar */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: darkMode ? "#2a2a2a" : "#e5e5e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: "700",
            color: colors.textSecondary,
          }}
        >
          {(user.first_name || user.username || "?")[0].toUpperCase()}
        </div>

        {/* Name + Email */}
        <div>
          <div
            style={{
              fontWeight: "600",
              color: colors.textPrimary,
              fontSize: "0.9rem",
            }}
          >
            {user.first_name && user.surname
              ? `${user.first_name} ${user.surname}`
              : user.username}
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: colors.textTertiary,
              marginTop: "1px",
            }}
          >
            {user.email || user.username}
          </div>
        </div>

        {/* Username */}
        <div
          style={{
            color: colors.textSecondary,
            fontSize: "0.85rem",
            fontFamily: "monospace",
          }}
        >
          {user.username}
        </div>

        {/* Role */}
        <div>
          <RoleBadge role={user.role || "User"} clickable={true} />
        </div>

        {/* Group */}
        <div>
          <GroupBadges groups={user.groups || []} />
        </div>

        {/* Status */}
        <div>
          <StatusBadge isActive={user.is_active} />
        </div>

        {/* Access Request */}
        <div
          title={user.access_request || ""}
          style={{
            fontSize: "0.8rem",
            color: user.access_request
              ? colors.textSecondary
              : colors.textTertiary,
            lineHeight: "1.45",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {user.access_request ? (
            user.access_request
          ) : (
            <span style={{ fontStyle: "italic" }}>—</span>
          )}
        </div>

        {/* Action Menu */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionMenu user={user} />
        </div>
      </div>
    );
  };

  // Get active users count
  const activeUsersCount = allUsers.filter((u) => u.is_active).length;

  // ===== RENDER =====
  return (
    <div
      style={{
        flex: 1,
        background: colors.pageBg,
        color: colors.textPrimary,
        overflow: "auto",
        padding: "2rem",
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
            color:
              toast.type === "success"
                ? colors.toastSuccess.text
                : colors.toastError.text,
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

      {/* EDIT USER MODAL */}
      {editModal && (
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
          onClick={() => {
            setEditModal(null);
            setEditForm({ username: "", email: "", role: "" });
          }}
        >
          <div
            style={{
              background: colors.modalBg,
              border: `1px solid ${colors.modalBorder}`,
              borderRadius: "14px",
              padding: "2rem",
              width: "480px",
              maxWidth: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
              ✏️
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.1rem",
              }}
            >
              Edit User
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              Update details for <strong>{editModal.username}</strong>
            </p>

            {/* Username Input */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "0.5rem",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
                placeholder="Enter username"
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.inputBorder}`,
                  background: colors.inputBg,
                  color: colors.textPrimary,
                  fontSize: "0.88rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Email Input */}
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "0.5rem",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="Enter email"
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.inputBorder}`,
                  background: colors.inputBg,
                  color: colors.textPrimary,
                  fontSize: "0.88rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Role Dropdown */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "0.5rem",
                }}
              >
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.inputBorder}`,
                  background: colors.inputBg,
                  color: colors.textPrimary,
                  fontSize: "0.88rem",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setEditModal(null);
                  setEditForm({ username: "", email: "", role: "" });
                }}
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
                onClick={handleEditUser}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#3b82f6",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordModal && (
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
          onClick={() => {
            setPasswordModal(null);
            setNewPassword("");
            setShowPassword(false);
          }}
        >
          <div
            style={{
              background: colors.modalBg,
              border: `1px solid ${colors.modalBorder}`,
              borderRadius: "14px",
              padding: "2rem",
              width: "420px",
              maxWidth: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
              🔑
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.1rem",
              }}
            >
              Reset Password
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              Enter new password for <strong>{passwordModal.username}</strong>
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: "0.5rem",
                }}
              >
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "0.65rem 2.5rem 0.65rem 0.85rem",
                    borderRadius: "8px",
                    border: `1px solid ${colors.inputBorder}`,
                    background: colors.inputBg,
                    color: colors.textPrimary,
                    fontSize: "0.88rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleResetPassword();
                  }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    padding: "0.25rem",
                    color: colors.textSecondary,
                  }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setPasswordModal(null);
                  setNewPassword("");
                  setShowPassword(false);
                }}
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
                onClick={handleResetPassword}
                disabled={!newPassword.trim()}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: newPassword.trim()
                    ? "#3b82f6"
                    : colors.btnDisabled,
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: newPassword.trim() ? "pointer" : "not-allowed",
                }}
              >
                Reset Password
              </button>
            </div>
          </div>
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
              {confirmModal.action === "activate" ? "✅" : "⚠️"}
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.1rem",
              }}
            >
              {confirmModal.action === "activate"
                ? "Activate User?"
                : "Deactivate User?"}
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              {confirmModal.action === "activate"
                ? `Ang user na "${confirmModal.username}" ay ma-a-activate at makapag-login na.`
                : `Ang user na "${confirmModal.username}" ay ma-de-deactivate at hindi na makapag-login.`}
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
                onClick={handleAction}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    confirmModal.action === "activate"
                      ? colors.btnActivate
                      : colors.btnDeactivate,
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {confirmModal.action === "activate" ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.6rem",
            fontWeight: "700",
            color: colors.textPrimary,
          }}
        >
          👥 User Management
        </h1>
        <p
          style={{
            margin: "0.35rem 0 0",
            color: colors.textSecondary,
            fontSize: "0.88rem",
          }}
        >
          Manage user accounts — approve, activate, or deactivate registrations.
        </p>
      </div>

      {/* STATS CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            label: "Total Users",
            value: allUsers.length,
            icon: "👥",
            color: "#6366f1",
          },
          {
            label: "Active",
            value: activeUsersCount,
            icon: "✓",
            color: "#22c55e",
          },
          {
            label: "Pending Approval",
            value: pendingUsers.length,
            icon: "⏳",
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

      {/* CARD: TABS + SEARCH + TABLE */}
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "14px",
          overflow: "visible",
        }}
      >
        {/* Tabs + Filters + Search Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {/* Left: Tabs + Role Filter Indicator */}
          <div
            style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}
          >
            {[
              { id: "all", label: "All Users", count: allUsers.length },
              { id: "pending", label: "Pending", count: pendingUsers.length },
              { id: "active", label: "Active Users", count: activeUsersCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    activeTab === tab.id
                      ? colors.tabActiveBg
                      : colors.tabInactiveBg,
                  color:
                    activeTab === tab.id
                      ? colors.tabActive
                      : colors.tabInactive,
                  fontSize: "0.83rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  activeTab !== tab.id &&
                  (e.currentTarget.style.background = colors.tabHover)
                }
                onMouseLeave={(e) =>
                  activeTab !== tab.id &&
                  (e.currentTarget.style.background = colors.tabInactiveBg)
                }
              >
                {tab.label}
                <span
                  style={{
                    fontSize: "0.7rem",
                    background:
                      activeTab === tab.id
                        ? darkMode
                          ? "#333"
                          : "#e5e5e5"
                        : darkMode
                          ? "#222"
                          : "#f0f0f0",
                    color: colors.textSecondary,
                    padding: "0.1rem 0.45rem",
                    borderRadius: "10px",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}

            {/* Role Filter Indicator */}
            {roleFilter && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginLeft: "0.5rem",
                  padding: "0.4rem 0.8rem",
                  background: darkMode ? "#1a1a1a" : "#f5f5f5",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  color: colors.textSecondary,
                }}
              >
                <span>Role:</span>
                <RoleBadge role={roleFilter} clickable={true} />
              </div>
            )}
          </div>

          {/* Right: Group Filter Dropdown + Search */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <GroupFilterDropdown />

            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: `1px solid ${colors.inputBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: "0.85rem",
                width: "220px",
                outline: "none",
                height: "34px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* TABLE HEADER */}
        {/* Must match UserRow gridTemplateColumns exactly */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 180px 90px 120px 90px 1fr 60px",
            gap: "1rem",
            padding: "0.7rem 1.25rem",
            background: darkMode ? "#1a1a1a" : "#f9f9f9",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          {[
            "",
            "Name / Email",
            "Username",
            "Role",
            "Group",
            "Status",
            "Access Request",
            "",
          ].map((h, index) => (
            <div
              key={`header-${index}`}
              style={{
                fontSize: "0.7rem",
                fontWeight: "700",
                color: colors.textTertiary,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* TABLE BODY */}
        {loading ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: colors.textTertiary,
            }}
          >
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
              {groupFilter.length > 0 || roleFilter
                ? "🔍"
                : activeTab === "pending"
                  ? "🎉"
                  : "🔍"}
            </div>
            <div style={{ color: colors.textSecondary, fontSize: "0.9rem" }}>
              {groupFilter.length > 0
                ? "No users found in the selected group(s)."
                : roleFilter
                  ? `No ${roleFilter} users found.`
                  : activeTab === "pending" && !search
                    ? "No pending users — all caught up!"
                    : "No users match your search."}
            </div>
          </div>
        ) : (
          filteredUsers.map((user, i) => (
            <UserRow key={user.id} user={user} index={i} />
          ))
        )}
      </div>

      {/* Toast animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default UserManagementPage;
