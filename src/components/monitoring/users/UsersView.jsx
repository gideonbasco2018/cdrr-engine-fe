// FILE: src/pages/monitoring/users/UsersView.jsx
import { useState, useEffect } from "react";
import { getAllUsers } from "../../../api/auth";

const FB = "#1877F2";

const ROLE_COLORS = {
  Evaluator: { bg: "#dbeafe", color: "#1d4ed8", darkBg: "#1e2a4a", darkColor: "#93c5fd" },
  "QA Officer": { bg: "#d1fae5", color: "#065f46", darkBg: "#0a2e1a", darkColor: "#6ee7b7" },
  Checker: { bg: "#fce7f3", color: "#be185d", darkBg: "#2e0a1f", darkColor: "#f9a8d4" },
  "Releasing Officer": { bg: "#ffedd5", color: "#c2410c", darkBg: "#2e1500", darkColor: "#fed7aa" },
  Decker: { bg: "#f3e8ff", color: "#7e22ce", darkBg: "#2a1a3e", darkColor: "#d8b4fe" },
  Supervisor: { bg: "#fef3c7", color: "#92400e", darkBg: "#2e1f00", darkColor: "#fde68a" },
  Director: { bg: "#cffafe", color: "#0e7490", darkBg: "#0c2a3a", darkColor: "#67e8f9" },
  "Compliance Officer": { bg: "#fef9c3", color: "#92400e", darkBg: "#2e1f00", darkColor: "#fde68a" },
  Admin: { bg: "#ede9fe", color: "#5b21b6", darkBg: "#2a1a3e", darkColor: "#d8b4fe" },
  SuperAdmin: { bg: "#ede9fe", color: "#5b21b6", darkBg: "#2a1a3e", darkColor: "#d8b4fe" },
  User: { bg: "#dbeafe", color: "#1d4ed8", darkBg: "#1e2a4a", darkColor: "#93c5fd" },
};

const STATUS_COLORS_MAP = {
  Active: { bg: "#dcfce7", color: "#15803d", darkBg: "#0a2e1a", darkColor: "#4ade80", dot: "#36a420" },
  Inactive: { bg: "#f3f4f6", color: "#6b7280", darkBg: "#2a2a2a", darkColor: "#9ca3af", dot: "#9ca3af" },
  Suspended: { bg: "#fee2e2", color: "#991b1b", darkBg: "#2e0a0a", darkColor: "#f87171", dot: "#e02020" },
  Pending: { bg: "#fef9c3", color: "#92400e", darkBg: "#2e1f00", darkColor: "#fde68a", dot: "#f59e0b" },
};

const avatarPalette = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fef9c3", color: "#713f12" },
];

function getInitials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}

function mapUser(u, index) {
  const fullName = `${u.first_name} ${u.surname}`.trim();
  const status = !u.is_active ? "Inactive" : "Active";
  return {
    id: u.id,
    name: fullName,
    email: u.email,
    username: u.username,
    role: u.role,
    position: u.position,
    alias: u.alias,
    status,
    avatar: index % avatarPalette.length,
    groups: u.groups || [],
    access_request: u.access_request,
  };
}

function UsersView({
  ui,
  darkMode,
  impersonating,
  setImpersonating,
  setShowImpersonateConfirm,
}) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userStatusFilter, setUserStatusFilter] = useState("All");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await getAllUsers();
        const mapped = Array.isArray(data) ? data.map((u, i) => mapUser(u, i)) : [];
        setUsers(mapped);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const allRoles = ["All", ...Array.from(new Set(users.map((u) => u.role)))];
  const statuses = ["All", "Active", "Inactive"];

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q));
    const matchRole = userRoleFilter === "All" || u.role === userRoleFilter;
    const matchStatus = userStatusFilter === "All" || u.status === userStatusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = users.filter((u) => u.status === "Active").length;
  const inactiveCount = users.filter((u) => u.status === "Inactive").length;
  const suspendedCount = users.filter((u) => u.status === "Suspended").length;

  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "7px 10px",
    fontSize: "0.82rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };

  const labelSt = {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginBottom: 4,
    display: "block",
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 40px", textAlign: "center", color: ui.textMuted, fontSize: "0.84rem", fontFamily: font }}>
        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⏳</div>
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "60px 40px", textAlign: "center", color: "#e02020", fontSize: "0.84rem", fontFamily: font }}>
        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Title */}
      <div>
        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: ui.textPrimary }}>
          User Management
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: ui.textMuted }}>
          View and impersonate user accounts to inspect their dashboard perspective
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Total Users", value: users.length, color: FB, bg: darkMode ? "#1a2744" : `${FB}10`, icon: "👥" },
          { label: "Active", value: activeCount, color: "#36a420", bg: darkMode ? "#0f2e1a" : "#f0fdf4", icon: "🟢" },
          { label: "Inactive", value: inactiveCount, color: "#9ca3af", bg: darkMode ? "#2a2a2a" : "#f3f4f6", icon: "⚫" },
          { label: "Suspended", value: suspendedCount, color: "#e02020", bg: darkMode ? "#2e0f0f" : "#fff1f2", icon: "🔴" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: s.bg,
              border: `1px solid ${s.color}28`,
              borderRadius: 8,
              padding: "12px 14px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" }}>
                {s.icon}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: s.color }}>
                  {s.label}
                </p>
                <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: s.color, lineHeight: 1.2 }}>
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelSt}>Search</label>
          <input
            type="text"
            placeholder="Name, email, role…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{ ...inputSt, width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={labelSt}>Role</label>
          <div style={{ display: "flex", background: darkMode ? ui.inputBg : "#e4e6eb", borderRadius: 9, padding: 3, gap: 2, flexWrap: "wrap" }}>
            {allRoles.map((r) => {
              const isAct = userRoleFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  style={{
                    padding: "4px 10px", fontSize: "0.72rem",
                    fontWeight: isAct ? 700 : 500, borderRadius: 6, border: "none",
                    background: isAct ? ui.cardBg : "transparent",
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer", fontFamily: font, whiteSpace: "nowrap",
                    boxShadow: isAct ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={labelSt}>Status</label>
          <div style={{ display: "flex", background: darkMode ? ui.inputBg : "#e4e6eb", borderRadius: 9, padding: 3, gap: 2 }}>
            {statuses.map((s) => {
              const isAct = userStatusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setUserStatusFilter(s)}
                  style={{
                    padding: "4px 10px", fontSize: "0.72rem",
                    fontWeight: isAct ? 700 : 500, borderRadius: 6, border: "none",
                    background: isAct ? ui.cardBg : "transparent",
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer", fontFamily: font, whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
        {filteredUsers.map((user) => {
          const av = avatarPalette[user.avatar % avatarPalette.length];
          const rc = ROLE_COLORS[user.role] || ROLE_COLORS["User"];
          const sc = STATUS_COLORS_MAP[user.status] || STATUS_COLORS_MAP["Inactive"];
          const isCurrentlyImpersonating = impersonating?.id === user.id;

          return (
            <div
              key={user.id}
              style={{
                background: ui.cardBg,
                border: `1.5px solid ${isCurrentlyImpersonating ? FB : ui.cardBorder}`,
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: isCurrentlyImpersonating ? `0 0 0 3px ${FB}28` : "0 1px 2px rgba(0,0,0,0.06)",
                transition: "border 0.15s, box-shadow 0.15s",
              }}
            >
              {/* Top section */}
              <div style={{ padding: "14px 16px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 46, height: 46, borderRadius: "50%",
                      background: av.bg, color: av.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1rem", fontWeight: 700,
                      border: `2px solid ${av.color}40`,
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div
                    style={{
                      position: "absolute", bottom: 1, right: 1,
                      width: 11, height: 11, borderRadius: "50%",
                      background: sc.dot, border: `2px solid ${ui.cardBg}`,
                    }}
                  />
                </div>

                {/* Info + Button */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name row with View As button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: ui.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.name}
                      </p>
                      {isCurrentlyImpersonating && (
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: FB, color: "#fff", letterSpacing: "0.04em", flexShrink: 0 }}>
                          VIEWING
                        </span>
                      )}
                    </div>

                    {/* View As / Stop button */}
                    {isCurrentlyImpersonating ? (
                      <button
                        onClick={() => setImpersonating(null)}
                        style={{
                          padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700,
                          borderRadius: 7, border: `1.5px solid #e02020`,
                          background: darkMode ? "#2e0f0f" : "#fff1f2",
                          color: "#e02020", cursor: "pointer", fontFamily: font,
                          whiteSpace: "nowrap", flexShrink: 0,
                        }}
                      >
                        ✕ Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => user.status !== "Suspended" && setShowImpersonateConfirm(user)}
                        disabled={user.status === "Suspended"}
                        style={{
                          padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700,
                          borderRadius: 7,
                          border: `1.5px solid ${user.status === "Suspended" ? ui.cardBorder : FB}`,
                          background: user.status === "Suspended" ? "transparent" : `${FB}12`,
                          color: user.status === "Suspended" ? ui.textMuted : FB,
                          cursor: user.status === "Suspended" ? "not-allowed" : "pointer",
                          fontFamily: font, whiteSpace: "nowrap", flexShrink: 0,
                          opacity: user.status === "Suspended" ? 0.5 : 1,
                        }}
                      >
                        👁 View As
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: ui.textMuted }}>
                    {user.email}
                  </p>

                  {/* Position */}
                  {user.position && (
                    <p style={{ margin: "1px 0 0", fontSize: "0.70rem", color: ui.textMuted, fontStyle: "italic" }}>
                      {user.position}
                    </p>
                  )}

                  {/* Role + Status badges */}
                  <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.67rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: darkMode ? rc?.darkBg || "#1e2a4a" : rc?.bg || "#dbeafe", color: darkMode ? rc?.darkColor || "#93c5fd" : rc?.color || "#1d4ed8" }}>
                      {user.role}
                    </span>
                    <span style={{ fontSize: "0.67rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: darkMode ? sc.darkBg : sc.bg, color: darkMode ? sc.darkColor : sc.color }}>
                      {user.status}
                    </span>
                  </div>

                  {/* Group badges */}
                  {user.groups && user.groups.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {user.groups.map((g) => (
                        <span key={g.id} style={{ fontSize: "0.62rem", fontWeight: 600, padding: "1px 6px", borderRadius: 99, background: darkMode ? "#1e2a4a" : "#e0f2fe", color: darkMode ? "#93c5fd" : "#0369a1" }}>
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div style={{ padding: "40px", textAlign: "center", color: ui.textMuted, fontSize: "0.84rem" }}>
          No users found
        </div>
      )}
    </div>
  );
}

export default UsersView;