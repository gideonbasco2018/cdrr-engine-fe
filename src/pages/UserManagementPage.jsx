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

// ── Avatar colour palette (deterministic per initials) ───────────────
const AVATAR_COLORS = [
  ["#6366f1", "#ede9fe"],
  ["#ec4899", "#fce7f3"],
  ["#f59e0b", "#fef3c7"],
  ["#10b981", "#d1fae5"],
  ["#3b82f6", "#dbeafe"],
  ["#ef4444", "#fee2e2"],
  ["#8b5cf6", "#ede9fe"],
  ["#06b6d4", "#cffafe"],
  ["#84cc16", "#ecfccb"],
  ["#f97316", "#ffedd5"],
];
const avatarColor = (name = "") => {
  const i = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
};

function UserManagementPage({ darkMode, userRole }) {
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
  const [editForm, setEditForm] = useState({
    first_name: "",
    surname: "",
    username: "",
    email: "",
    role: "",
    position: "",
    alias: "",
    access_request: "",
  });
  const [viewMode, setViewMode] = useState("card");
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 20;

  const c = darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#161616",
        cardBorder: "#252525",
        textPrimary: "#fff",
        textSecondary: "#999",
        textTertiary: "#555",
        inputBg: "#1a1a1a",
        inputBorder: "#2a2a2a",
        tabActiveBg: "#222",
        tabActive: "#fff",
        tabInactive: "#666",
        tabInactiveBg: "transparent",
        tabHover: "#1a1a1a",
        rowHover: "#1e1e1e",
        rowBorder: "#222",
        btnActivate: "#22c55e",
        btnDeactivate: "#ef4444",
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
        statCard: "#1a1a1a",
      }
    : {
        pageBg: "#f4f6f8",
        cardBg: "#ffffff",
        cardBorder: "#e8e8e8",
        textPrimary: "#111",
        textSecondary: "#555",
        textTertiary: "#999",
        inputBg: "#fff",
        inputBorder: "#ddd",
        tabActiveBg: "#fff",
        tabActive: "#111",
        tabInactive: "#888",
        tabInactiveBg: "transparent",
        tabHover: "#f0f0f0",
        rowHover: "#fafafa",
        rowBorder: "#eee",
        btnActivate: "#22c55e",
        btnDeactivate: "#ef4444",
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
        statCard: "#f9f9f9",
      };

  // ── Fetch ALL users handling pagination ──────────────────────────────
  const fetchAll = async (apiFn) => {
    const response = await apiFn();
    return Array.isArray(response) ? response : (response.results ?? []);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p, g] = await Promise.all([
        fetchAll(getAllUsers),
        fetchAll(getPendingUsers),
        getAllGroups(),
      ]);
      setAllUsers(u);
      setPendingUsers(p);
      setGroups(Array.isArray(g) ? g : []);
    } catch {
      showToast("error", "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset table page whenever filters/search/tab change
  useEffect(() => {
    setTablePage(1);
  }, [activeTab, search, roleFilter, groupFilter]);

  useEffect(() => {
    const h = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", h);
      return () => document.removeEventListener("click", h);
    }
  }, [openMenuId]);

  useEffect(() => {
    const h = (e) => {
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(e.target)
      )
        setGroupDropdownOpen(false);
    };
    if (groupDropdownOpen) {
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }
  }, [groupDropdownOpen]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async () => {
    if (!confirmModal) return;
    const { userId, action } = confirmModal;
    setActionLoading(userId);
    setConfirmModal(null);
    try {
      action === "activate"
        ? await activateUser(userId)
        : await deactivateUser(userId);
      showToast("success", `User ${action}d successfully.`);
      await fetchData();
    } catch (err) {
      showToast("error", err?.response?.data?.detail || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordModal || !newPassword.trim())
      return showToast("error", "Enter a new password.");
    const { userId, username } = passwordModal;
    setActionLoading(userId);
    setPasswordModal(null);
    setNewPassword("");
    setShowPassword(false);
    try {
      await resetPassword(userId, newPassword);
      showToast("success", `Password for ${username} reset.`);
      await fetchData();
    } catch (err) {
      showToast("error", err?.response?.data?.detail || "Reset failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUser = async () => {
    if (!editModal) return;
    const updates = {};
    if (editForm.first_name !== editModal.originalFirstName)
      updates.first_name = editForm.first_name;
    if (editForm.surname !== editModal.originalSurname)
      updates.surname = editForm.surname;
    if (editForm.username !== editModal.originalUsername)
      updates.username = editForm.username;
    if (editForm.email !== editModal.originalEmail)
      updates.email = editForm.email;
    if (editForm.role !== editModal.originalRole) updates.role = editForm.role;
    if (editForm.position !== editModal.originalPosition)
      updates.position = editForm.position;
    if (editForm.alias !== editModal.originalAlias)
      updates.alias = editForm.alias;
    if (editForm.access_request !== editModal.originalAccessRequest)
      updates.access_request = editForm.access_request;
    if (!Object.keys(updates).length)
      return showToast("error", "No changes detected.");
    setActionLoading(editModal.userId);
    setEditModal(null);
    try {
      await updateUser(editModal.userId, updates);
      showToast("success", "User updated.");
      await fetchData();
    } catch (err) {
      showToast("error", err?.response?.data?.detail || "Update failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (user) => {
    setEditModal({
      userId: user.id,
      username: user.username,
      originalFirstName: user.first_name || "",
      originalSurname: user.surname || "",
      originalUsername: user.username,
      originalEmail: user.email || "",
      originalRole: user.role || "User",
      originalPosition: user.position || "",
      originalAlias: user.alias || "",
      originalAccessRequest: user.access_request || "",
    });
    setEditForm({
      first_name: user.first_name || "",
      surname: user.surname || "",
      username: user.username,
      email: user.email || "",
      role: user.role || "User",
      position: user.position || "",
      alias: user.alias || "",
      access_request: user.access_request || "",
    });
  };

  const filteredUsers = (() => {
    let src =
      activeTab === "pending"
        ? pendingUsers
        : activeTab === "active"
          ? allUsers.filter((u) => u.is_active)
          : allUsers;
    if (roleFilter) src = src.filter((u) => (u.role || "User") === roleFilter);
    if (groupFilter.length)
      src = src.filter((u) =>
        (u.groups || []).some((g) => groupFilter.includes(g.id)),
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      src = src.filter((u) =>
        [
          u.username,
          u.email,
          u.first_name,
          u.surname,
          u.alias,
          u.position,
          u.access_request,
          u.groups?.[0]?.name,
        ].some((v) => (v || "").toLowerCase().includes(q)),
      );
    }
    return src;
  })();

  const activeUsersCount = allUsers.filter((u) => u.is_active).length;

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

  if (userRole !== "Admin" && userRole !== "SuperAdmin") {
    return (
      <div
        style={{
          padding: "2rem",
          color: c.textPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <h2 style={{ margin: "0 0 0.5rem", color: c.textPrimary }}>
            Access Denied
          </h2>
          <p style={{ color: c.textSecondary, margin: 0 }}>
            Only Admins can manage users.
          </p>
        </div>
      </div>
    );
  }

  // ── User Card ─────────────────────────────────────────────────────────
  const UserCard = ({ user }) => {
    const name =
      user.first_name && user.surname
        ? `${user.first_name} ${user.surname}`
        : user.username;
    const initial = (user.first_name || user.username || "?")[0].toUpperCase();
    const initial2 =
      (user.surname || user.username || "?")[1]?.toUpperCase() || "";
    const [fg, bg] = avatarColor(name);
    const isPending = !user.is_active;
    const isSuspended = user.is_active === false && user.access_request;
    const isProcessing = actionLoading === user.id;
    const menuOpen = openMenuId === user.id;
    const roleC = roleBadgeColor[user.role || "User"] || roleBadgeColor.User;
    const group = user.groups?.[0]?.name;

    const tasks = user.task_count ?? "—";
    const approved = user.approved_count ?? "—";
    const rate = user.approval_rate != null ? `${user.approval_rate}%` : "—";
    const lastLogin = user.last_login
      ? new Date(user.last_login).toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Never";

    const statusDot = user.is_active
      ? "#22c55e"
      : isSuspended
        ? "#ef4444"
        : "#f59e0b";
    const statusLabel = user.is_active
      ? "Active"
      : isSuspended
        ? "Suspended"
        : "Inactive";

    return (
      <div
        style={{
          background: c.cardBg,
          border: `1px solid ${c.cardBorder}`,
          borderRadius: 16,
          padding: "1.1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          transition: "box-shadow 0.2s, transform 0.15s",
          position: "relative",
          overflow: "visible",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = darkMode
            ? "0 4px 20px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.08)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* ── Top row: avatar + info + menu ── */}
        <div
          style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: bg,
                color: fg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                border: `2px solid ${fg}30`,
              }}
            >
              {initial}
              {initial2}
            </div>
            <span
              style={{
                position: "absolute",
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: statusDot,
                border: `2px solid ${c.cardBg}`,
              }}
            />
          </div>

          {/* Name + email + username + alias */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                color: c.textPrimary,
                fontSize: "0.9rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: "0.73rem",
                color: c.textTertiary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email || user.username}
            </div>

            {/* Username row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginTop: "0.25rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  color: c.textSecondary,
                  fontFamily: "monospace",
                }}
              >
                @{user.username}
              </span>
              {user.alias && (
                <>
                  <span style={{ fontSize: "0.65rem", color: c.textTertiary }}>
                    ·
                  </span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      padding: "0.1rem 0.45rem",
                      borderRadius: 4,
                      background: darkMode
                        ? "rgba(99,102,241,0.15)"
                        : "#eef2ff",
                      color: darkMode ? "#a5b4fc" : "#4338ca",
                      fontFamily: "monospace",
                    }}
                  >
                    {user.alias}
                  </span>
                </>
              )}
            </div>

            {/* Position row */}
            {user.position && (
              <div
                style={{
                  fontSize: "0.72rem",
                  color: c.textTertiary,
                  marginTop: "0.15rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.position}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.3rem",
                flexWrap: "wrap",
                marginTop: "0.35rem",
              }}
            >
              {group && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    padding: "0.15rem 0.5rem",
                    borderRadius: 20,
                    background: darkMode ? "#1a2a1a" : "#f0fdf4",
                    color: darkMode ? "#86efac" : "#15803d",
                  }}
                >
                  {group}
                </span>
              )}
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  padding: "0.15rem 0.5rem",
                  borderRadius: 20,
                  background: statusDot + "22",
                  color: statusDot,
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Action Menu */}
          <div
            style={{ position: "relative", flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(menuOpen ? null : user.id);
              }}
              disabled={isProcessing}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${c.cardBorder}`,
                background: "transparent",
                color: c.textSecondary,
                cursor: isProcessing ? "not-allowed" : "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isProcessing ? "…" : "⋯"}
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  background: c.menuBg,
                  border: `1px solid ${c.menuBorder}`,
                  borderRadius: 10,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                  minWidth: 160,
                  zIndex: 200,
                  overflow: "hidden",
                }}
              >
                {[
                  { label: "Edit User", icon: "✏️", action: "edit" },
                  {
                    label: isPending ? "Activate" : "Deactivate",
                    icon: isPending ? "✓" : "✕",
                    action: isPending ? "activate" : "deactivate",
                  },
                  {
                    label: "Reset Password",
                    icon: "🔑",
                    action: "reset_password",
                  },
                ].map((item, idx, arr) => (
                  <button
                    key={item.action}
                    onClick={() => {
                      setOpenMenuId(null);
                      if (item.action === "reset_password")
                        setPasswordModal({
                          userId: user.id,
                          username: user.username,
                        });
                      else if (item.action === "edit") openEditModal(user);
                      else
                        setConfirmModal({
                          userId: user.id,
                          username: user.username,
                          action: item.action,
                        });
                    }}
                    style={{
                      width: "100%",
                      padding: "0.6rem 1rem",
                      border: "none",
                      borderBottom:
                        idx < arr.length - 1
                          ? `1px solid ${c.cardBorder}`
                          : "none",
                      background: "transparent",
                      color: c.textPrimary,
                      fontSize: "0.82rem",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = c.menuItemHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0.25rem",
            borderTop: `1px solid ${c.cardBorder}`,
            paddingTop: "0.6rem",
          }}
        >
          {[
            ["TASKS", tasks],
            ["APPROVED", approved],
            ["RATE", rate],
          ].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: c.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: c.textTertiary,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer: last login + View As ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${c.cardBorder}`,
            paddingTop: "0.55rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.65rem", color: c.textTertiary }}>
              Last login
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: c.textSecondary,
                fontWeight: 500,
              }}
            >
              {lastLogin}
            </div>
          </div>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.3rem 0.8rem",
              borderRadius: 20,
              border: `1px solid ${user.is_active ? "#3b82f6" : c.cardBorder}`,
              background: user.is_active
                ? darkMode
                  ? "#0a1a3a"
                  : "#eff6ff"
                : "transparent",
              color: user.is_active ? "#3b82f6" : c.textTertiary,
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: user.is_active ? "pointer" : "not-allowed",
              opacity: user.is_active ? 1 : 0.45,
              transition: "all 0.15s",
            }}
            disabled={!user.is_active}
          >
            👁 View As
          </button>
        </div>
      </div>
    );
  };

  // ── Modal shared styles ───────────────────────────────────────────────
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    background: c.modalOverlay,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const modalStyle = {
    background: c.modalBg,
    border: `1px solid ${c.modalBorder}`,
    borderRadius: 14,
    padding: "2rem",
    width: 480,
    maxWidth: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  };
  const inputStyle = {
    width: "100%",
    padding: "0.65rem 0.85rem",
    borderRadius: 8,
    border: `1px solid ${c.inputBorder}`,
    background: c.inputBg,
    color: c.textPrimary,
    fontSize: "0.88rem",
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: c.textSecondary,
    marginBottom: "0.45rem",
  };
  const btnSecondary = {
    padding: "0.5rem 1.1rem",
    borderRadius: 8,
    border: `1px solid ${c.modalBorder}`,
    background: "transparent",
    color: c.textSecondary,
    fontSize: "0.85rem",
    cursor: "pointer",
  };
  const btnPrimary = (bg = "#3b82f6") => ({
    padding: "0.5rem 1.1rem",
    borderRadius: 8,
    border: "none",
    background: bg,
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  });

  // ── Table column layout (added Alias after Username) ─────────────────
  const tableGrid = "40px 1fr 160px 120px 90px 120px 90px 1fr 60px";
  const tableHeaders = [
    "",
    "Name / Email",
    "Username",
    "Alias",
    "Role",
    "Group",
    "Status",
    "Access Request",
    "",
  ];

  return (
    <div
      style={{
        flex: 1,
        background: c.pageBg,
        color: c.textPrimary,
        overflow: "auto",
        padding: "2rem",
      }}
    >
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 1000,
            padding: "0.85rem 1.4rem",
            borderRadius: 10,
            background:
              toast.type === "success" ? c.toastSuccess.bg : c.toastError.bg,
            color: "#fff",
            fontSize: "0.85rem",
            fontWeight: 500,
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

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <div
          style={overlayStyle}
          onClick={() => {
            setEditModal(null);
            setEditForm({
              first_name: "",
              surname: "",
              username: "",
              email: "",
              role: "",
              position: "",
              alias: "",
              access_request: "",
            });
          }}
        >
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              ✏️
            </div>
            <h3
              style={{
                margin: "0 0 0.25rem",
                color: c.textPrimary,
                fontSize: "1.1rem",
              }}
            >
              Edit User
            </h3>
            <p
              style={{
                margin: "0 0 1.4rem",
                color: c.textSecondary,
                fontSize: "0.88rem",
              }}
            >
              Update details for <strong>{editModal.username}</strong>
            </p>

            {/* Personal Info */}
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: c.textTertiary,
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              Personal Info
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <label style={labelStyle}>First Name</label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, first_name: e.target.value })
                  }
                  placeholder="First name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Surname</label>
                <input
                  type="text"
                  value={editForm.surname}
                  onChange={(e) =>
                    setEditForm({ ...editForm, surname: e.target.value })
                  }
                  placeholder="Surname"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Account Info */}
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: c.textTertiary,
                textTransform: "uppercase",
                marginBottom: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              Account Info
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Role</label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
                style={inputStyle}
              >
                {["User", "Admin", "SuperAdmin"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Info */}
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: c.textTertiary,
                textTransform: "uppercase",
                marginBottom: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              Additional Info
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <label style={labelStyle}>Position</label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) =>
                    setEditForm({ ...editForm, position: e.target.value })
                  }
                  placeholder="e.g. Manager"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Alias</label>
                <input
                  type="text"
                  value={editForm.alias}
                  onChange={(e) =>
                    setEditForm({ ...editForm, alias: e.target.value })
                  }
                  placeholder="e.g. nickname"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Access Request</label>
              <textarea
                value={editForm.access_request}
                onChange={(e) =>
                  setEditForm({ ...editForm, access_request: e.target.value })
                }
                placeholder="Reason for access…"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: 1.5,
                  fontFamily: "inherit",
                }}
              />
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
                  setEditForm({
                    first_name: "",
                    surname: "",
                    username: "",
                    email: "",
                    role: "",
                    position: "",
                    alias: "",
                    access_request: "",
                  });
                }}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button onClick={handleEditUser} style={btnPrimary()}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {passwordModal && (
        <div
          style={overlayStyle}
          onClick={() => {
            setPasswordModal(null);
            setNewPassword("");
            setShowPassword(false);
          }}
        >
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              🔑
            </div>
            <h3 style={{ margin: "0 0 0.35rem", color: c.textPrimary }}>
              Reset Password
            </h3>
            <p
              style={{
                margin: "0 0 1.4rem",
                color: c.textSecondary,
                fontSize: "0.88rem",
              }}
            >
              New password for <strong>{passwordModal.username}</strong>
            </p>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                  autoFocus
                  style={{ ...inputStyle, paddingRight: "2.5rem" }}
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
                    fontSize: "1rem",
                    color: c.textSecondary,
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
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPassword.trim()}
                style={btnPrimary(
                  newPassword.trim() ? "#3b82f6" : c.btnDisabled,
                )}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <div style={overlayStyle} onClick={() => setConfirmModal(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              {confirmModal.action === "activate" ? "✅" : "⚠️"}
            </div>
            <h3 style={{ margin: "0 0 0.35rem", color: c.textPrimary }}>
              {confirmModal.action === "activate"
                ? "Activate User?"
                : "Deactivate User?"}
            </h3>
            <p
              style={{
                margin: "0 0 1.4rem",
                color: c.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}
            >
              {confirmModal.action === "activate"
                ? `"${confirmModal.username}" will be activated and can log in.`
                : `"${confirmModal.username}" will be deactivated and cannot log in.`}
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
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                style={btnPrimary(
                  confirmModal.action === "activate"
                    ? c.btnActivate
                    : c.btnDeactivate,
                )}
              >
                {confirmModal.action === "activate" ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.6rem",
            fontWeight: 700,
            color: c.textPrimary,
          }}
        >
          👥 User Management
        </h1>
        <p
          style={{
            margin: "0.3rem 0 0",
            color: c.textSecondary,
            fontSize: "0.88rem",
          }}
        >
          Manage user accounts — approve, activate, or deactivate registrations.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
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
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 12,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: `${stat.color}18`,
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
                  fontSize: "0.72rem",
                  color: c.textTertiary,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: c.textPrimary,
                }}
              >
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            background: c.cardBg,
            border: `1px solid ${c.cardBorder}`,
            borderRadius: 10,
            padding: "0.3rem",
          }}
        >
          {[
            { id: "all", label: "All", count: allUsers.length },
            { id: "pending", label: "Pending", count: pendingUsers.length },
            { id: "active", label: "Active", count: activeUsersCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: 8,
                border: "none",
                background:
                  activeTab === tab.id
                    ? darkMode
                      ? "#333"
                      : "#111"
                    : "transparent",
                color: activeTab === tab.id ? "#fff" : c.textSecondary,
                fontSize: "0.83rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: "0.7rem",
                  background:
                    activeTab === tab.id
                      ? "rgba(255,255,255,0.2)"
                      : darkMode
                        ? "#222"
                        : "#f0f0f0",
                  color: activeTab === tab.id ? "#fff" : c.textSecondary,
                  padding: "0.1rem 0.45rem",
                  borderRadius: 10,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + filters + view toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {/* Active filter chips */}
          {roleFilter && (
            <button
              onClick={() => setRoleFilter(null)}
              style={{
                fontSize: "0.78rem",
                padding: "0.3rem 0.7rem",
                borderRadius: 20,
                border: `1px solid ${roleBadgeColor[roleFilter]?.text || "#999"}`,
                background: "transparent",
                color: roleBadgeColor[roleFilter]?.text || "#999",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              Role: {roleFilter} ✕
            </button>
          )}
          {groupFilter.length > 0 && (
            <button
              onClick={() => setGroupFilter([])}
              style={{
                fontSize: "0.78rem",
                padding: "0.3rem 0.7rem",
                borderRadius: 20,
                border: `1px solid ${darkMode ? "#86efac" : "#15803d"}`,
                background: "transparent",
                color: darkMode ? "#86efac" : "#15803d",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              {groupFilter.length === 1
                ? `Group: ${groups.find((g) => g.id === groupFilter[0])?.name ?? "…"}`
                : `Groups: ${groupFilter.length}`}{" "}
              ✕
            </button>
          )}

          {/* Group filter dropdown */}
          <div ref={groupDropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setGroupDropdownOpen((p) => !p)}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: 8,
                cursor: "pointer",
                border: `1px solid ${groupFilter.length > 0 ? (darkMode ? "#86efac" : "#15803d") : c.inputBorder}`,
                background:
                  groupFilter.length > 0
                    ? darkMode
                      ? "rgba(134,239,172,0.1)"
                      : "#f0fdf4"
                    : c.inputBg,
                color:
                  groupFilter.length > 0
                    ? darkMode
                      ? "#86efac"
                      : "#15803d"
                    : c.textSecondary,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "0.8rem" }}>⊕</span>
              Group
              {groupFilter.length > 0 && (
                <span
                  style={{
                    background: darkMode ? "#86efac" : "#15803d",
                    color: darkMode ? "#0a2a0a" : "#fff",
                    borderRadius: 10,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "0.05rem 0.4rem",
                  }}
                >
                  {groupFilter.length}
                </span>
              )}
              <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                {groupDropdownOpen ? "▲" : "▼"}
              </span>
            </button>

            {groupDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 300,
                  background: c.menuBg,
                  border: `1px solid ${c.menuBorder}`,
                  borderRadius: 10,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
                  minWidth: 200,
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "0.6rem 1rem",
                    borderBottom: `1px solid ${c.menuBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: c.textTertiary,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Filter by Group
                  </span>
                  {groupFilter.length > 0 && (
                    <button
                      onClick={() => setGroupFilter([])}
                      style={{
                        fontSize: "0.72rem",
                        color: darkMode ? "#86efac" : "#15803d",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Group options */}
                {groups.length === 0 ? (
                  <div
                    style={{
                      padding: "1rem",
                      fontSize: "0.82rem",
                      color: c.textTertiary,
                      textAlign: "center",
                    }}
                  >
                    No groups found
                  </div>
                ) : (
                  groups.map((group) => {
                    const isSelected = groupFilter.includes(group.id);
                    const memberCount = allUsers.filter((u) =>
                      (u.groups || []).some((g) => g.id === group.id),
                    ).length;
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          setGroupFilter((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== group.id)
                              : [...prev, group.id],
                          );
                        }}
                        style={{
                          width: "100%",
                          padding: "0.6rem 1rem",
                          border: "none",
                          background: isSelected
                            ? darkMode
                              ? "rgba(134,239,172,0.1)"
                              : "#f0fdf4"
                            : "transparent",
                          color: c.textPrimary,
                          fontSize: "0.85rem",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background = c.menuItemHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSelected
                            ? darkMode
                              ? "rgba(134,239,172,0.1)"
                              : "#f0fdf4"
                            : "transparent";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                          }}
                        >
                          {/* Checkbox */}
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              flexShrink: 0,
                              border: `2px solid ${isSelected ? (darkMode ? "#86efac" : "#15803d") : c.textTertiary}`,
                              background: isSelected
                                ? darkMode
                                  ? "#86efac"
                                  : "#15803d"
                                : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isSelected && (
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  color: darkMode ? "#0a2a0a" : "#fff",
                                  fontWeight: 900,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              color: isSelected
                                ? darkMode
                                  ? "#86efac"
                                  : "#15803d"
                                : c.textPrimary,
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {group.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: c.textTertiary,
                            background: darkMode ? "#222" : "#f0f0f0",
                            padding: "0.1rem 0.45rem",
                            borderRadius: 10,
                            flexShrink: 0,
                          }}
                        >
                          {memberCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: 8,
              border: `1px solid ${c.inputBorder}`,
              background: c.inputBg,
              color: c.textPrimary,
              fontSize: "0.85rem",
              width: 220,
              outline: "none",
            }}
          />

          {/* View Mode Toggle */}
          <div
            style={{
              display: "flex",
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 8,
              padding: "0.2rem",
              gap: "0.15rem",
            }}
          >
            {[
              { mode: "card", icon: "⊞", title: "Card view" },
              { mode: "table", icon: "☰", title: "Table view" },
            ].map(({ mode, icon, title }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={title}
                style={{
                  width: 32,
                  height: 28,
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    viewMode === mode
                      ? darkMode
                        ? "#444"
                        : "#e0e0e0"
                      : "transparent",
                  color: viewMode === mode ? c.textPrimary : c.textTertiary,
                  transition: "all 0.15s",
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: c.textTertiary,
          }}
        >
          Loading users…
        </div>
      ) : filteredUsers.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            color: c.textTertiary,
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
            {activeTab === "pending" ? "🎉" : "🔍"}
          </div>
          <div style={{ fontSize: "0.95rem", color: c.textSecondary }}>
            {activeTab === "pending" && !search
              ? "No pending users — all caught up!"
              : "No users match your filters."}
          </div>
        </div>
      ) : viewMode === "card" ? (
        /* ── CARD VIEW ── */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              style={{ animation: "fadeUp 0.3s ease both" }}
              onClick={() => openMenuId && setOpenMenuId(null)}
            >
              <UserCard user={user} />
            </div>
          ))}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div
          style={{
            background: c.cardBg,
            border: `1px solid ${c.cardBorder}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: tableGrid,
              gap: "1rem",
              padding: "0.7rem 1.25rem",
              background: darkMode ? "#1a1a1a" : "#f9f9f9",
              borderBottom: `1px solid ${c.cardBorder}`,
            }}
          >
            {tableHeaders.map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: c.textTertiary,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Table Rows */}
          {filteredUsers
            .slice(
              (tablePage - 1) * TABLE_PAGE_SIZE,
              tablePage * TABLE_PAGE_SIZE,
            )
            .map((user, index) => {
              const name =
                user.first_name && user.surname
                  ? `${user.first_name} ${user.surname}`
                  : user.username;
              const initial = (user.first_name ||
                user.username ||
                "?")[0].toUpperCase();
              const [fg, bg] = avatarColor(name);
              const roleC =
                roleBadgeColor[user.role || "User"] || roleBadgeColor.User;
              const rowBg =
                index % 2 === 0
                  ? "transparent"
                  : darkMode
                    ? "#1a1a1a"
                    : "#fafafa";

              return (
                <div
                  key={user.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: tableGrid,
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.9rem 1.25rem",
                    background: rowBg,
                    borderBottom: `1px solid ${c.rowBorder}`,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = c.rowHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = rowBg)
                  }
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: bg,
                      color: fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: `2px solid ${fg}30`,
                    }}
                  >
                    {initial}
                  </div>

                  {/* Name + Email */}
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: c.textPrimary,
                        fontSize: "0.9rem",
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: c.textTertiary,
                        marginTop: 1,
                      }}
                    >
                      {user.email || user.username}
                    </div>
                  </div>

                  {/* Username */}
                  <div
                    style={{
                      color: c.textSecondary,
                      fontSize: "0.85rem",
                      fontFamily: "monospace",
                    }}
                  >
                    @{user.username}
                  </div>

                  {/* Alias ← NEW */}
                  <div>
                    {user.alias ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.2rem 0.65rem",
                          borderRadius: 6,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          background: darkMode
                            ? "rgba(99,102,241,0.15)"
                            : "#eef2ff",
                          color: darkMode ? "#a5b4fc" : "#4338ca",
                          fontFamily: "monospace",
                        }}
                      >
                        {user.alias}
                      </span>
                    ) : (
                      <span
                        style={{ color: c.textTertiary, fontSize: "0.8rem" }}
                      >
                        —
                      </span>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <span
                      onClick={() =>
                        setRoleFilter(
                          roleFilter === user.role ? null : user.role || "User",
                        )
                      }
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.65rem",
                        borderRadius: 20,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background:
                          roleFilter === (user.role || "User")
                            ? roleC.text
                            : roleC.bg,
                        color:
                          roleFilter === (user.role || "User")
                            ? "#fff"
                            : roleC.text,
                        cursor: "pointer",
                        border: `1px solid ${roleC.text}40`,
                        transition: "all 0.15s",
                      }}
                    >
                      {user.role || "User"}
                    </span>
                  </div>

                  {/* Groups */}
                  <div
                    style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}
                  >
                    {(user.groups || []).length === 0 ? (
                      <span
                        style={{ color: c.textTertiary, fontSize: "0.8rem" }}
                      >
                        —
                      </span>
                    ) : (
                      (user.groups || []).map((g) => (
                        <span
                          key={g.id}
                          style={{
                            padding: "0.2rem 0.65rem",
                            borderRadius: 20,
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            background: darkMode ? "#1a2a1a" : "#f0fdf4",
                            color: darkMode ? "#86efac" : "#15803d",
                          }}
                        >
                          {g.name}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.2rem 0.65rem",
                        borderRadius: 20,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: user.is_active
                          ? c.badgeActive.bg
                          : c.badgeInactive.bg,
                        color: user.is_active
                          ? c.badgeActive.text
                          : c.badgeInactive.text,
                      }}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Access Request */}
                  <div
                    title={user.access_request || ""}
                    style={{
                      fontSize: "0.8rem",
                      color: user.access_request
                        ? c.textSecondary
                        : c.textTertiary,
                      lineHeight: 1.45,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {user.access_request || (
                      <span style={{ fontStyle: "italic" }}>—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{ position: "relative" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === user.id ? null : user.id,
                          );
                        }}
                        disabled={actionLoading === user.id}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          border: `1px solid ${c.cardBorder}`,
                          background: "transparent",
                          color: c.textSecondary,
                          cursor:
                            actionLoading === user.id
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {actionLoading === user.id ? "…" : "⋯"}
                      </button>
                      {openMenuId === user.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            right: 0,
                            background: c.menuBg,
                            border: `1px solid ${c.menuBorder}`,
                            borderRadius: 10,
                            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                            minWidth: 160,
                            zIndex: 200,
                            overflow: "hidden",
                          }}
                        >
                          {[
                            { label: "Edit User", icon: "✏️", action: "edit" },
                            {
                              label: !user.is_active
                                ? "Activate"
                                : "Deactivate",
                              icon: !user.is_active ? "✓" : "✕",
                              action: !user.is_active
                                ? "activate"
                                : "deactivate",
                            },
                            {
                              label: "Reset Password",
                              icon: "🔑",
                              action: "reset_password",
                            },
                          ].map((item, idx, arr) => (
                            <button
                              key={item.action}
                              onClick={() => {
                                setOpenMenuId(null);
                                if (item.action === "reset_password")
                                  setPasswordModal({
                                    userId: user.id,
                                    username: user.username,
                                  });
                                else if (item.action === "edit")
                                  openEditModal(user);
                                else
                                  setConfirmModal({
                                    userId: user.id,
                                    username: user.username,
                                    action: item.action,
                                  });
                              }}
                              style={{
                                width: "100%",
                                padding: "0.6rem 1rem",
                                border: "none",
                                borderBottom:
                                  idx < arr.length - 1
                                    ? `1px solid ${c.cardBorder}`
                                    : "none",
                                background: "transparent",
                                color: c.textPrimary,
                                fontSize: "0.82rem",
                                textAlign: "left",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.55rem",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  c.menuItemHover)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* ── Table Pagination Footer ── */}
          {filteredUsers.length > TABLE_PAGE_SIZE &&
            (() => {
              const totalPages = Math.ceil(
                filteredUsers.length / TABLE_PAGE_SIZE,
              );
              const startItem = (tablePage - 1) * TABLE_PAGE_SIZE + 1;
              const endItem = Math.min(
                tablePage * TABLE_PAGE_SIZE,
                filteredUsers.length,
              );
              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.85rem 1.25rem",
                    borderTop: `1px solid ${c.cardBorder}`,
                    background: darkMode ? "#1a1a1a" : "#f9f9f9",
                  }}
                >
                  {/* Count info */}
                  <span style={{ fontSize: "0.8rem", color: c.textTertiary }}>
                    Showing{" "}
                    <strong style={{ color: c.textSecondary }}>
                      {startItem}–{endItem}
                    </strong>{" "}
                    of{" "}
                    <strong style={{ color: c.textSecondary }}>
                      {filteredUsers.length}
                    </strong>{" "}
                    users
                  </span>

                  {/* Page controls */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    {/* Prev */}
                    <button
                      onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                      disabled={tablePage === 1}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 7,
                        border: `1px solid ${c.cardBorder}`,
                        background: "transparent",
                        color:
                          tablePage === 1 ? c.textTertiary : c.textSecondary,
                        cursor: tablePage === 1 ? "not-allowed" : "pointer",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: tablePage === 1 ? 0.4 : 1,
                      }}
                    >
                      ‹
                    </button>

                    {/* Page number buttons */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - tablePage) <= 1,
                      )
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        item === "…" ? (
                          <span
                            key={`ellipsis-${i}`}
                            style={{
                              fontSize: "0.8rem",
                              color: c.textTertiary,
                              padding: "0 0.25rem",
                            }}
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setTablePage(item)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 7,
                              border: `1px solid ${item === tablePage ? (darkMode ? "#555" : "#ccc") : c.cardBorder}`,
                              background:
                                item === tablePage
                                  ? darkMode
                                    ? "#333"
                                    : "#111"
                                  : "transparent",
                              color:
                                item === tablePage ? "#fff" : c.textSecondary,
                              cursor: "pointer",
                              fontSize: "0.82rem",
                              fontWeight: item === tablePage ? 700 : 400,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                          >
                            {item}
                          </button>
                        ),
                      )}

                    {/* Next */}
                    <button
                      onClick={() =>
                        setTablePage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={tablePage === totalPages}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 7,
                        border: `1px solid ${c.cardBorder}`,
                        background: "transparent",
                        color:
                          tablePage === totalPages
                            ? c.textTertiary
                            : c.textSecondary,
                        cursor:
                          tablePage === totalPages ? "not-allowed" : "pointer",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: tablePage === totalPages ? 0.4 : 1,
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
}

export default UserManagementPage;
