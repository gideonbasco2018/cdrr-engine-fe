// FILE: src/pages/monitoring/users/UsersView.jsx
import { useState } from "react";

// ── Static Data ───────────────────────────────────────────────────────────────
const FB = "#1877F2";

const USER_DATABASE = [
  {
    id: 1,
    name: "Juan dela Cruz",
    email: "jdelacruz@pba.gov.ph",
    role: "Evaluator",
    status: "Active",
    lastLogin: "Today, 9:14 AM",
    avatar: 0,
    tasks: 72,
    approved: 45,
    specialization: "Prescription Drug (RX)",
  },
  {
    id: 2,
    name: "Maria Santos",
    email: "msantos@pba.gov.ph",
    role: "QA Officer",
    status: "Active",
    lastLogin: "Today, 8:50 AM",
    avatar: 1,
    tasks: 68,
    approved: 50,
    specialization: "Prescription Drug (RX)",
  },
  {
    id: 3,
    name: "Pedro Reyes",
    email: "preyes@pba.gov.ph",
    role: "Checker",
    status: "Active",
    lastLogin: "Yesterday, 4:22 PM",
    avatar: 2,
    tasks: 54,
    approved: 38,
    specialization: "Vaccine",
  },
  {
    id: 4,
    name: "Ana Gonzales",
    email: "agonzales@pba.gov.ph",
    role: "Releasing Officer",
    status: "Active",
    lastLogin: "Today, 10:05 AM",
    avatar: 3,
    tasks: 60,
    approved: 42,
    specialization: "Over-the-Counter (OTC)",
  },
  {
    id: 5,
    name: "Jose Bautista",
    email: "jbautista@pba.gov.ph",
    role: "Decker",
    status: "Inactive",
    lastLogin: "Mar 8, 2026",
    avatar: 4,
    tasks: 48,
    approved: 30,
    specialization: "Prescription Drug (RX)",
  },
  {
    id: 6,
    name: "Liza Reyes",
    email: "lreyes@pba.gov.ph",
    role: "Supervisor",
    status: "Active",
    lastLogin: "Today, 11:30 AM",
    avatar: 5,
    tasks: 55,
    approved: 40,
    specialization: "Over-the-Counter (OTC)",
  },
  {
    id: 7,
    name: "Carlo Mendoza",
    email: "cmendoza@pba.gov.ph",
    role: "Director",
    status: "Active",
    lastLogin: "Today, 7:45 AM",
    avatar: 6,
    tasks: 0,
    approved: 0,
    specialization: "All Types",
  },
  {
    id: 8,
    name: "Rosa Villanueva",
    email: "rvillanueva@pba.gov.ph",
    role: "Compliance Officer",
    status: "Active",
    lastLogin: "Today, 9:00 AM",
    avatar: 7,
    tasks: 0,
    approved: 0,
    specialization: "Compliance",
  },
  {
    id: 9,
    name: "Dante Flores",
    email: "dflores@pba.gov.ph",
    role: "Admin",
    status: "Active",
    lastLogin: "Today, 8:00 AM",
    avatar: 0,
    tasks: 0,
    approved: 0,
    specialization: "System Admin",
  },
  {
    id: 10,
    name: "Nena Cruz",
    email: "ncruz@pba.gov.ph",
    role: "Checker",
    status: "Suspended",
    lastLogin: "Feb 28, 2026",
    avatar: 1,
    tasks: 20,
    approved: 10,
    specialization: "Vaccine",
  },
];

const ROLE_COLORS = {
  Evaluator: {
    bg: "#dbeafe",
    color: "#1d4ed8",
    darkBg: "#1e2a4a",
    darkColor: "#93c5fd",
  },
  "QA Officer": {
    bg: "#d1fae5",
    color: "#065f46",
    darkBg: "#0a2e1a",
    darkColor: "#6ee7b7",
  },
  Checker: {
    bg: "#fce7f3",
    color: "#be185d",
    darkBg: "#2e0a1f",
    darkColor: "#f9a8d4",
  },
  "Releasing Officer": {
    bg: "#ffedd5",
    color: "#c2410c",
    darkBg: "#2e1500",
    darkColor: "#fed7aa",
  },
  Decker: {
    bg: "#f3e8ff",
    color: "#7e22ce",
    darkBg: "#2a1a3e",
    darkColor: "#d8b4fe",
  },
  Supervisor: {
    bg: "#fef3c7",
    color: "#92400e",
    darkBg: "#2e1f00",
    darkColor: "#fde68a",
  },
  Director: {
    bg: "#cffafe",
    color: "#0e7490",
    darkBg: "#0c2a3a",
    darkColor: "#67e8f9",
  },
  "Compliance Officer": {
    bg: "#fef9c3",
    color: "#92400e",
    darkBg: "#2e1f00",
    darkColor: "#fde68a",
  },
  Admin: {
    bg: "#ede9fe",
    color: "#5b21b6",
    darkBg: "#2a1a3e",
    darkColor: "#d8b4fe",
  },
};

const STATUS_COLORS_MAP = {
  Active: {
    bg: "#dcfce7",
    color: "#15803d",
    darkBg: "#0a2e1a",
    darkColor: "#4ade80",
    dot: "#36a420",
  },
  Inactive: {
    bg: "#f3f4f6",
    color: "#6b7280",
    darkBg: "#2a2a2a",
    darkColor: "#9ca3af",
    dot: "#9ca3af",
  },
  Suspended: {
    bg: "#fee2e2",
    color: "#991b1b",
    darkBg: "#2e0a0a",
    darkColor: "#f87171",
    dot: "#e02020",
  },
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

// ── Utils ─────────────────────────────────────────────────────────────────────
function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// ── Component ─────────────────────────────────────────────────────────────────
function UsersView({
  ui,
  darkMode,
  impersonating,
  setImpersonating,
  setShowImpersonateConfirm,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userStatusFilter, setUserStatusFilter] = useState("All");

  const allRoles = [
    "All",
    ...Array.from(new Set(USER_DATABASE.map((u) => u.role))),
  ];
  const statuses = ["All", "Active", "Inactive", "Suspended"];

  const filteredUsers = USER_DATABASE.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    const matchRole = userRoleFilter === "All" || u.role === userRoleFilter;
    const matchStatus =
      userStatusFilter === "All" || u.status === userStatusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = USER_DATABASE.filter((u) => u.status === "Active").length;
  const inactiveCount = USER_DATABASE.filter(
    (u) => u.status === "Inactive",
  ).length;
  const suspendedCount = USER_DATABASE.filter(
    (u) => u.status === "Suspended",
  ).length;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Title */}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          User Management
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.75rem",
            color: ui.textMuted,
          }}
        >
          View and impersonate user accounts to inspect their dashboard
          perspective
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
        }}
      >
        {[
          {
            label: "Total Users",
            value: USER_DATABASE.length,
            color: FB,
            bg: darkMode ? "#1a2744" : `${FB}10`,
            icon: "👥",
          },
          {
            label: "Active",
            value: activeCount,
            color: "#36a420",
            bg: darkMode ? "#0f2e1a" : "#f0fdf4",
            icon: "🟢",
          },
          {
            label: "Inactive",
            value: inactiveCount,
            color: "#9ca3af",
            bg: darkMode ? "#2a2a2a" : "#f3f4f6",
            icon: "⚫",
          },
          {
            label: "Suspended",
            value: suspendedCount,
            color: "#e02020",
            bg: darkMode ? "#2e0f0f" : "#fff1f2",
            icon: "🔴",
          },
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
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: `${s.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                }}
              >
                {s.icon}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: s.color,
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.3rem",
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
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
          <div
            style={{
              display: "flex",
              background: darkMode ? ui.inputBg : "#e4e6eb",
              borderRadius: 9,
              padding: 3,
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {allRoles.map((r) => {
              const isAct = userRoleFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.72rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 6,
                    border: "none",
                    background: isAct ? ui.cardBg : "transparent",
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    whiteSpace: "nowrap",
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
          <div
            style={{
              display: "flex",
              background: darkMode ? ui.inputBg : "#e4e6eb",
              borderRadius: 9,
              padding: 3,
              gap: 2,
            }}
          >
            {statuses.map((s) => {
              const isAct = userStatusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setUserStatusFilter(s)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.72rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 6,
                    border: "none",
                    background: isAct ? ui.cardBg : "transparent",
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    whiteSpace: "nowrap",
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 10,
        }}
      >
        {filteredUsers.map((user) => {
          const av = avatarPalette[user.avatar % avatarPalette.length];
          const rc = ROLE_COLORS[user.role] || ROLE_COLORS["Evaluator"];
          const sc = STATUS_COLORS_MAP[user.status];
          const isImpersonating = impersonating?.id === user.id;
          const approvalRate =
            user.tasks > 0
              ? ((user.approved / user.tasks) * 100).toFixed(0)
              : null;

          return (
            <div
              key={user.id}
              style={{
                background: ui.cardBg,
                border: `1.5px solid ${isImpersonating ? FB : ui.cardBorder}`,
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: isImpersonating
                  ? `0 0 0 3px ${FB}28`
                  : "0 1px 2px rgba(0,0,0,0.06)",
                transition: "border 0.15s, box-shadow 0.15s",
              }}
            >
              {/* Top section */}
              <div
                style={{
                  padding: "14px 16px 10px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      fontWeight: 700,
                      border: `2px solid ${av.color}40`,
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: sc.dot,
                      border: `2px solid ${ui.cardBg}`,
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: ui.textPrimary,
                      }}
                    >
                      {user.name}
                    </p>
                    {isImpersonating && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 99,
                          background: FB,
                          color: "#fff",
                          letterSpacing: "0.04em",
                        }}
                      >
                        VIEWING
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "1px 0 0",
                      fontSize: "0.72rem",
                      color: ui.textMuted,
                    }}
                  >
                    {user.email}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      marginTop: 5,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.67rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: darkMode
                          ? rc?.darkBg || "#1e2a4a"
                          : rc?.bg || "#dbeafe",
                        color: darkMode
                          ? rc?.darkColor || "#93c5fd"
                          : rc?.color || "#1d4ed8",
                      }}
                    >
                      {user.role}
                    </span>
                    <span
                      style={{
                        fontSize: "0.67rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: darkMode ? sc.darkBg : sc.bg,
                        color: darkMode ? sc.darkColor : sc.color,
                      }}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div
                style={{
                  borderTop: `1px solid ${ui.divider}`,
                  borderBottom: `1px solid ${ui.divider}`,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  background: darkMode ? ui.inputBg + "88" : "#f8f9fd",
                }}
              >
                {[
                  { label: "Tasks", value: user.tasks > 0 ? user.tasks : "—" },
                  {
                    label: "Approved",
                    value: user.approved > 0 ? user.approved : "—",
                  },
                  {
                    label: "Rate",
                    value: approvalRate ? `${approvalRate}%` : "—",
                  },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      padding: "8px 10px",
                      textAlign: "center",
                      borderRight: i < 2 ? `1px solid ${ui.divider}` : "none",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: ui.textPrimary,
                      }}
                    >
                      {stat.value}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.62rem",
                        color: ui.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.67rem",
                      color: ui.textMuted,
                    }}
                  >
                    Last login
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.73rem",
                      fontWeight: 500,
                      color: ui.textSub,
                    }}
                  >
                    {user.lastLogin}
                  </p>
                </div>

                {isImpersonating ? (
                  <button
                    onClick={() => setImpersonating(null)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: 7,
                      border: `1.5px solid #e02020`,
                      background: darkMode ? "#2e0f0f" : "#fff1f2",
                      color: "#e02020",
                      cursor: "pointer",
                      fontFamily: font,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✕ Stop
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      user.status !== "Suspended" &&
                      setShowImpersonateConfirm(user)
                    }
                    disabled={user.status === "Suspended"}
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: 7,
                      border: `1.5px solid ${user.status === "Suspended" ? ui.cardBorder : FB}`,
                      background:
                        user.status === "Suspended" ? "transparent" : `${FB}12`,
                      color: user.status === "Suspended" ? ui.textMuted : FB,
                      cursor:
                        user.status === "Suspended" ? "not-allowed" : "pointer",
                      fontFamily: font,
                      whiteSpace: "nowrap",
                      opacity: user.status === "Suspended" ? 0.5 : 1,
                    }}
                  >
                    👁 View As
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: ui.textMuted,
            fontSize: "0.84rem",
          }}
        >
          No users found
        </div>
      )}
    </div>
  );
}

export default UsersView;
