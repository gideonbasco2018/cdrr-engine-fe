// FILE: src/pages/UserManagementPage.jsx
import { useState, useEffect, useCallback } from "react";
import {
  getAllUsers,
  getPendingUsers,
  activateUser,
  deactivateUser,
} from "../api/auth";

function UserManagementPage({ darkMode, userRole }) {
  // ===== STATE =====
  const [allUsers, setAllUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "all"
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // user_id currently being toggled
  const [toast, setToast] = useState(null); // { type: "success" | "error", message }
  const [confirmModal, setConfirmModal] = useState(null);
  // confirmModal: { userId, username, action: "activate" | "deactivate" }

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
      };

  // ===== FETCH DATA =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, pending] = await Promise.all([
        getAllUsers(),
        getPendingUsers(),
      ]);
      setAllUsers(Array.isArray(all) ? all : []);
      setPendingUsers(Array.isArray(pending) ? pending : []);
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
      await fetchData(); // refresh
    } catch (err) {
      console.error("Action failed:", err);
      const detail =
        err?.response?.data?.detail || "Action failed. Please try again.";
      showToast("error", detail);
    } finally {
      setActionLoading(null);
    }
  };

  // ===== FILTER =====
  const filteredUsers = (() => {
    const source = activeTab === "pending" ? pendingUsers : allUsers;
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.last_name || "").toLowerCase().includes(q),
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

  const RoleBadge = ({ role }) => {
    const c = roleBadgeColor[role] || roleBadgeColor.User;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.2rem 0.65rem",
          borderRadius: "20px",
          fontSize: "0.72rem",
          fontWeight: "600",
          background: c.bg,
          color: c.text,
        }}
      >
        {role}
      </span>
    );
  };

  // ===== USER ROW =====
  const UserRow = ({ user, index }) => {
    const isPending = !user.is_active;
    const isProcessing = actionLoading === user.id;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 200px 90px 100px 130px",
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
            {user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
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
          <RoleBadge role={user.role || "User"} />
        </div>

        {/* Status */}
        <div>
          <StatusBadge isActive={user.is_active} />
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {isPending ? (
            <button
              disabled={isProcessing}
              onClick={() =>
                setConfirmModal({
                  userId: user.id,
                  username: user.username,
                  action: "activate",
                })
              }
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                border: "none",
                background: isProcessing
                  ? colors.btnDisabled
                  : colors.btnActivate,
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: isProcessing ? "not-allowed" : "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) =>
                !isProcessing &&
                (e.target.style.background = colors.btnActivateHover)
              }
              onMouseLeave={(e) =>
                !isProcessing &&
                (e.target.style.background = colors.btnActivate)
              }
            >
              {isProcessing ? "..." : "✓ Activate"}
            </button>
          ) : (
            <button
              disabled={isProcessing}
              onClick={() =>
                setConfirmModal({
                  userId: user.id,
                  username: user.username,
                  action: "deactivate",
                })
              }
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                border: `1px solid ${colors.btnDeactivate}`,
                background: "transparent",
                color: colors.btnDeactivate,
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: isProcessing ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.target.style.background = colors.btnDeactivate;
                  e.target.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  e.target.style.background = "transparent";
                  e.target.style.color = colors.btnDeactivate;
                }
              }}
            >
              {isProcessing ? "..." : "Deactivate"}
            </button>
          )}
        </div>
      </div>
    );
  };

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
            value: allUsers.filter((u) => u.is_active).length,
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
          overflow: "hidden",
        }}
      >
        {/* Tabs + Search Row */}
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
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {[
              { id: "pending", label: "Pending", count: pendingUsers.length },
              { id: "all", label: "All Users", count: allUsers.length },
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
          </div>

          {/* Search */}
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
            }}
          />
        </div>

        {/* TABLE HEADER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 200px 90px 100px 130px",
            gap: "1rem",
            padding: "0.7rem 1.25rem",
            background: darkMode ? "#1a1a1a" : "#f9f9f9",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          {["", "Name / Email", "Username", "Role", "Status", "Action"].map(
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
              {activeTab === "pending" ? "🎉" : "🔍"}
            </div>
            <div style={{ color: colors.textSecondary, fontSize: "0.9rem" }}>
              {activeTab === "pending" && !search
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
