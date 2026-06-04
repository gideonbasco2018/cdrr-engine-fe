// FILE: src/components/monitoring/users/UsersView.jsx
import { useState, useEffect } from "react";
import { getAllUsers } from "../../../api/auth";

const FB = "#1877F2";

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
  SuperAdmin: {
    bg: "#ede9fe",
    color: "#5b21b6",
    darkBg: "#2a1a3e",
    darkColor: "#d8b4fe",
  },
  User: {
    bg: "#dbeafe",
    color: "#1d4ed8",
    darkBg: "#1e2a4a",
    darkColor: "#93c5fd",
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
  Pending: {
    bg: "#fef9c3",
    color: "#92400e",
    darkBg: "#2e1f00",
    darkColor: "#fde68a",
    dot: "#f59e0b",
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

// ── Glassmorphism helpers (iPhone-style) ──────────────────────
function glass(darkMode, opacity = 0.55) {
  return {
    background: darkMode
      ? `rgba(30, 30, 32, ${opacity})`
      : `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)"}`,
    boxShadow: darkMode
      ? "0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"
      : "0 4px 30px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
  };
}

function glassCard(darkMode) {
  return {
    background: darkMode
      ? "linear-gradient(135deg, rgba(40,40,50,0.6) 0%, rgba(30,30,40,0.4) 100%)"
      : "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 100%)",
    backdropFilter: "blur(24px) saturate(200%)",
    WebkitBackdropFilter: "blur(24px) saturate(200%)",
    border: darkMode
      ? "1.5px solid rgba(255,255,255,0.12)"
      : "1.5px solid rgba(255,255,255,0.8)",
    boxShadow: darkMode
      ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.1)"
      : "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.02)",
  };
}

function glassInput(darkMode) {
  return {
    background: darkMode ? "rgba(50,50,55,0.5)" : "rgba(255,255,255,0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
    boxShadow: darkMode
      ? "inset 0 1px 3px rgba(0,0,0,0.2)"
      : "inset 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(255,255,255,0.6)",
  };
}

function glassSegment(darkMode) {
  return {
    background: darkMode ? "rgba(50,50,55,0.4)" : "rgba(240,242,245,0.5)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)"}`,
  };
}

function glassSegmentActive(darkMode) {
  return {
    background: darkMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.85)",
    boxShadow: darkMode
      ? "0 2px 8px rgba(0,0,0,0.3)"
      : "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  };
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// ── Keyframes injection ───────────────────────────────────────
const USERS_ANIM_ID = "users-view-animations";
if (
  typeof document !== "undefined" &&
  !document.getElementById(USERS_ANIM_ID)
) {
  const style = document.createElement("style");
  style.id = USERS_ANIM_ID;
  style.textContent = `
    @keyframes uv-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    @keyframes uv-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes uv-pulse-glow { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
  `;
  document.head.appendChild(style);
}

// ── Glass Skeleton Primitives ─────────────────────────────────
function GlassShimmerBox({
  width = "100%",
  height = 14,
  radius = 6,
  darkMode,
  style: extra = {},
}) {
  const shimmerBg = darkMode
    ? "linear-gradient(90deg, rgba(50,50,55,0.5) 25%, rgba(70,70,75,0.5) 50%, rgba(50,50,55,0.5) 75%)"
    : "linear-gradient(90deg, rgba(215,225,240,0.5) 25%, rgba(240,243,250,0.7) 50%, rgba(215,225,240,0.5) 75%)";
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: shimmerBg,
        backgroundSize: "800px 100%",
        animation: "uv-shimmer 1.4s infinite linear",
        flexShrink: 0,
        ...extra,
      }}
    />
  );
}

function UsersViewSkeleton({ ui, darkMode }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const kpiColors = [
    { color: "#1877F2", bg: darkMode ? "#1a2744" : "#EEF4FF" },
    { color: "#36a420", bg: darkMode ? "#0f2e1a" : "#EDFBF3" },
    { color: "#9ca3af", bg: darkMode ? "#2a2a2a" : "#f3f4f6" },
    { color: "#e02020", bg: darkMode ? "#2e0f0f" : "#fff1f2" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: font,
        background: darkMode ? "#16171f" : "#f4f5f7",
        padding: 16,
        borderRadius: 18,
        minHeight: "100%",
      }}
    >
      {/* Title skeleton */}
      <div>
        <GlassShimmerBox
          width={180}
          height={16}
          radius={5}
          darkMode={darkMode}
        />
        <GlassShimmerBox
          width={320}
          height={11}
          radius={4}
          darkMode={darkMode}
          style={{ marginTop: 6 }}
        />
      </div>

      {/* KPI Cards skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
        }}
      >
        {kpiColors.map((kpi, i) => (
          <div
            key={i}
            style={{
              background: `${kpi.bg}cc`,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: `1px solid ${kpi.color}30`,
              borderRadius: 14,
              padding: "14px 16px",
              boxShadow: `0 4px 20px ${kpi.color}10, inset 0 1px 0 rgba(255,255,255,0.3)`,
              animation: "uv-pulse-glow 2s ease-in-out infinite",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <GlassShimmerBox
              width={36}
              height={36}
              radius={10}
              darkMode={darkMode}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <GlassShimmerBox
                width={70}
                height={9}
                radius={4}
                darkMode={darkMode}
              />
              <GlassShimmerBox
                width={45}
                height={22}
                radius={5}
                darkMode={darkMode}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Filter panel skeleton */}
      <div
        style={{
          ...glass(darkMode, 0.45),
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            flex: "1 1 200px",
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <GlassShimmerBox
            width={50}
            height={8}
            radius={3}
            darkMode={darkMode}
          />
          <GlassShimmerBox
            width="100%"
            height={34}
            radius={10}
            darkMode={darkMode}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <GlassShimmerBox
            width={30}
            height={8}
            radius={3}
            darkMode={darkMode}
          />
          <GlassShimmerBox
            width={200}
            height={32}
            radius={10}
            darkMode={darkMode}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <GlassShimmerBox
            width={40}
            height={8}
            radius={3}
            darkMode={darkMode}
          />
          <GlassShimmerBox
            width={150}
            height={32}
            radius={10}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* User cards grid skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              ...glassCard(darkMode),
              borderRadius: 16,
              padding: "14px 16px",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              animation: "uv-pulse-glow 2.2s ease-in-out infinite",
            }}
          >
            {/* Avatar */}
            <GlassShimmerBox
              width={46}
              height={46}
              radius={999}
              darkMode={darkMode}
            />
            {/* Info */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <GlassShimmerBox
                  width="55%"
                  height={12}
                  radius={4}
                  darkMode={darkMode}
                />
                <GlassShimmerBox
                  width={65}
                  height={22}
                  radius={8}
                  darkMode={darkMode}
                />
              </div>
              <GlassShimmerBox
                width="70%"
                height={9}
                radius={4}
                darkMode={darkMode}
              />
              <GlassShimmerBox
                width="45%"
                height={8}
                radius={4}
                darkMode={darkMode}
              />
              <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                <GlassShimmerBox
                  width={60}
                  height={18}
                  radius={99}
                  darkMode={darkMode}
                />
                <GlassShimmerBox
                  width={50}
                  height={18}
                  radius={99}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  const font =
    "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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
        const mapped = Array.isArray(data)
          ? data.map((u, i) => mapUser(u, i))
          : [];
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
    const matchStatus =
      userStatusFilter === "All" || u.status === userStatusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = users.filter((u) => u.status === "Active").length;
  const inactiveCount = users.filter((u) => u.status === "Inactive").length;
  const suspendedCount = users.filter((u) => u.status === "Suspended").length;

  const inputSt = {
    ...glassInput(darkMode),
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: "0.82rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
    transition: "all 0.2s ease",
  };

  const labelSt = {
    fontSize: "0.68rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginBottom: 4,
    display: "block",
  };

  if (loading) {
    return <UsersViewSkeleton ui={ui} darkMode={darkMode} />;
  }

  if (error) {
    return (
      <div
        style={{
          padding: "60px 40px",
          textAlign: "center",
          color: "#e02020",
          fontSize: "0.84rem",
          fontFamily: font,
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: font,
        background: darkMode ? "#16171f" : "#f4f5f7",
        padding: 16,
        borderRadius: 18,
        minHeight: "100%",
      }}
    >
      {/* Title */}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: ui.textPrimary,
            letterSpacing: "-0.01em",
          }}
        >
          User Management
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: "0.75rem",
            color: ui.textMuted,
          }}
        >
          View and impersonate user accounts to inspect their dashboard
          perspective
        </p>
      </div>

      {/* KPI Cards — colored glass */}
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
            value: users.length,
            color: FB,
            bg: darkMode ? "#1a2744" : "#EEF4FF",
            icon: "👥",
          },
          {
            label: "Active",
            value: activeCount,
            color: "#36a420",
            bg: darkMode ? "#0f2e1a" : "#EDFBF3",
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
              background: `${s.bg}cc`,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: `1px solid ${s.color}30`,
              borderRadius: 14,
              padding: "14px 16px",
              boxShadow: `0 4px 20px ${s.color}12, inset 0 1px 0 rgba(255,255,255,0.3)`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${s.color}18`,
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
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
                    opacity: 0.85,
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters — glass panel */}
      <div
        style={{
          ...glass(darkMode, 0.45),
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          gap: 12,
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
              ...glassSegment(darkMode),
              borderRadius: 10,
              padding: 3,
              display: "flex",
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
                    padding: "5px 11px",
                    fontSize: "0.72rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 7,
                    border: "none",
                    ...(isAct
                      ? glassSegmentActive(darkMode)
                      : { background: "transparent" }),
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
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
              ...glassSegment(darkMode),
              borderRadius: 10,
              padding: 3,
              display: "flex",
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
                    padding: "5px 11px",
                    fontSize: "0.72rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 7,
                    border: "none",
                    ...(isAct
                      ? glassSegmentActive(darkMode)
                      : { background: "transparent" }),
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Cards — glass cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {filteredUsers.map((user) => {
          const av = avatarPalette[user.avatar % avatarPalette.length];
          const rc = ROLE_COLORS[user.role] || ROLE_COLORS["User"];
          const sc =
            STATUS_COLORS_MAP[user.status] || STATUS_COLORS_MAP["Inactive"];
          const isCurrentlyImpersonating = impersonating?.id === user.id;

          return (
            <div
              key={user.id}
              style={{
                ...glassCard(darkMode),
                borderRadius: 16,
                overflow: "hidden",
                border: isCurrentlyImpersonating
                  ? `2px solid ${FB}`
                  : darkMode
                    ? "1.5px solid rgba(255,255,255,0.12)"
                    : "1.5px solid rgba(255,255,255,0.8)",
                boxShadow: isCurrentlyImpersonating
                  ? `0 0 0 3px ${FB}28, 0 8px 32px rgba(0,0,0,0.12)`
                  : darkMode
                    ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
                transition: "border 0.2s, box-shadow 0.2s, transform 0.2s",
              }}
            >
              {/* Top section */}
              <div
                style={{
                  padding: "14px 16px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      background: `${av.bg}cc`,
                      backdropFilter: "blur(8px)",
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      fontWeight: 700,
                      border: `2px solid ${av.color}40`,
                      boxShadow: `0 2px 8px ${av.color}20`,
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
                      border: `2px solid ${darkMode ? "rgba(30,30,32,0.8)" : "rgba(255,255,255,0.9)"}`,
                      boxShadow: `0 0 4px ${sc.dot}60`,
                    }}
                  />
                </div>

                {/* Info + Button */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name row with View As button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 0,
                        flexWrap: "wrap",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user.name}
                      </p>
                      {isCurrentlyImpersonating && (
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: FB,
                            color: "#fff",
                            letterSpacing: "0.04em",
                            flexShrink: 0,
                          }}
                        >
                          VIEWING
                        </span>
                      )}
                    </div>

                    {/* View As / Stop button */}
                    {isCurrentlyImpersonating ? (
                      <button
                        onClick={() => setImpersonating(null)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          borderRadius: 8,
                          border: `1.5px solid #e02020`,
                          background: darkMode
                            ? "rgba(46,15,15,0.6)"
                            : "rgba(255,241,242,0.7)",
                          backdropFilter: "blur(8px)",
                          color: "#e02020",
                          cursor: "pointer",
                          fontFamily: font,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          transition: "all 0.15s ease",
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
                          padding: "4px 10px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          borderRadius: 8,
                          border: `1.5px solid ${user.status === "Suspended" ? (darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)") : FB}`,
                          background:
                            user.status === "Suspended" ? "transparent" : FB,
                          backdropFilter: "blur(8px)",
                          color:
                            user.status === "Suspended" ? ui.textMuted : "#fff",
                          cursor:
                            user.status === "Suspended"
                              ? "not-allowed"
                              : "pointer",
                          fontFamily: font,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          opacity: user.status === "Suspended" ? 0.5 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        👁 View As
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.72rem",
                      color: ui.textMuted,
                    }}
                  >
                    {user.email}
                  </p>

                  {/* Position */}
                  {user.position && (
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: "0.70rem",
                        color: ui.textMuted,
                        fontStyle: "italic",
                      }}
                    >
                      {user.position}
                    </p>
                  )}

                  {/* Role + Status badges */}
                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.67rem",
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 99,
                        background: darkMode
                          ? `${rc?.darkBg || "#1e2a4a"}cc`
                          : `${rc?.bg || "#dbeafe"}cc`,
                        backdropFilter: "blur(6px)",
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
                        padding: "2px 9px",
                        borderRadius: 99,
                        background: darkMode ? `${sc.darkBg}cc` : `${sc.bg}cc`,
                        backdropFilter: "blur(6px)",
                        color: darkMode ? sc.darkColor : sc.color,
                      }}
                    >
                      {user.status}
                    </span>
                  </div>

                  {/* Group badges */}
                  {user.groups && user.groups.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: 5,
                        flexWrap: "wrap",
                      }}
                    >
                      {user.groups.map((g) => (
                        <span
                          key={g.id}
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            padding: "1px 7px",
                            borderRadius: 99,
                            background: darkMode
                              ? "rgba(30,39,68,0.7)"
                              : "rgba(224,242,254,0.7)",
                            backdropFilter: "blur(6px)",
                            color: darkMode ? "#93c5fd" : "#0369a1",
                          }}
                        >
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
        <div
          style={{
            ...glass(darkMode, 0.4),
            padding: "40px",
            textAlign: "center",
            color: ui.textMuted,
            fontSize: "0.84rem",
            borderRadius: 14,
          }}
        >
          No users found
        </div>
      )}
    </div>
  );
}

export default UsersView;
