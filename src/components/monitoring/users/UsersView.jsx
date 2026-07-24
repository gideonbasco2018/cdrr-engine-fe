// FILE: src/components/monitoring/users/UsersView.jsx
// FILE: src/components/monitoring/users/UsersView.jsx
import { useState, useEffect } from "react";
import { getAllUsers } from "../../../api/auth";

const FB = "#1877F2";

// ── Unified role color system — works in both light & dark ──
const ROLE_COLORS = {
  Evaluator: { bg: "#1e3a5f", color: "#60a5fa", dot: "#3b82f6" },
  "QA Officer": { bg: "#14532d", color: "#4ade80", dot: "#22c55e" },
  Checker: { bg: "#4a1942", color: "#e879f9", dot: "#d946ef" },
  "Releasing Officer": { bg: "#431407", color: "#fb923c", dot: "#f97316" },
  Decker: { bg: "#2e1065", color: "#c084fc", dot: "#a855f7" },
  Supervisor: { bg: "#422006", color: "#fbbf24", dot: "#f59e0b" },
  Director: { bg: "#083344", color: "#22d3ee", dot: "#06b6d4" },
  "Compliance Officer": { bg: "#1a2e05", color: "#a3e635", dot: "#84cc16" },
  Admin: { bg: "#1e1b4b", color: "#818cf8", dot: "#6366f1" },
  SuperAdmin: { bg: "#1e1b4b", color: "#818cf8", dot: "#6366f1" },
  IT: { bg: "#0c2340", color: "#38bdf8", dot: "#0ea5e9" },
  Inspector: { bg: "#2d1a06", color: "#f59e0b", dot: "#d97706" },
  User: { bg: "#1e3a5f", color: "#60a5fa", dot: "#3b82f6" },
};

// Light mode overrides for role colors
const ROLE_COLORS_LIGHT = {
  Evaluator: { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  "QA Officer": { bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  Checker: { bg: "#fdf4ff", color: "#a21caf", dot: "#d946ef" },
  "Releasing Officer": { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  Decker: { bg: "#f5f3ff", color: "#7c3aed", dot: "#a855f7" },
  Supervisor: { bg: "#fefce8", color: "#a16207", dot: "#f59e0b" },
  Director: { bg: "#ecfeff", color: "#0e7490", dot: "#06b6d4" },
  "Compliance Officer": { bg: "#f7fee7", color: "#4d7c0f", dot: "#84cc16" },
  Admin: { bg: "#eef2ff", color: "#4338ca", dot: "#6366f1" },
  SuperAdmin: { bg: "#eef2ff", color: "#4338ca", dot: "#6366f1" },
  IT: { bg: "#f0f9ff", color: "#0369a1", dot: "#0ea5e9" },
  Inspector: { bg: "#fffbeb", color: "#b45309", dot: "#d97706" },
  User: { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
};

const STATUS_COLORS = {
  Active: {
    bg: "#052e16",
    color: "#4ade80",
    dot: "#22c55e",
    lightBg: "#f0fdf4",
    lightColor: "#15803d",
  },
  Inactive: {
    bg: "#1f2937",
    color: "#9ca3af",
    dot: "#6b7280",
    lightBg: "#f9fafb",
    lightColor: "#6b7280",
  },
  Suspended: {
    bg: "#2d0a0a",
    color: "#f87171",
    dot: "#ef4444",
    lightBg: "#fff1f2",
    lightColor: "#be123c",
  },
  Pending: {
    bg: "#2d1f00",
    color: "#fbbf24",
    dot: "#f59e0b",
    lightBg: "#fffbeb",
    lightColor: "#92400e",
  },
};

const avatarPalette = [
  { bg: "#1e3a5f", color: "#60a5fa" },
  { bg: "#2e1065", color: "#c084fc" },
  { bg: "#14532d", color: "#4ade80" },
  { bg: "#422006", color: "#fbbf24" },
  { bg: "#4a1942", color: "#e879f9" },
  { bg: "#2d0a0a", color: "#f87171" },
  { bg: "#083344", color: "#22d3ee" },
  { bg: "#1e1b4b", color: "#818cf8" },
];

const avatarPaletteLight = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#ede9fe", color: "#7c3aed" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#fef9c3", color: "#a16207" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#fee2e2", color: "#b91c1c" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#eef2ff", color: "#4338ca" },
];

const ANIM_ID = "users-view-v2-anim";
if (typeof document !== "undefined" && !document.getElementById(ANIM_ID)) {
  const s = document.createElement("style");
  s.id = ANIM_ID;
  s.textContent = `
    @keyframes uv2-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes uv2-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
    @keyframes uv2-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes uv2-spin { to { transform: rotate(360deg); } }
    .uv2-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
    .uv2-card:hover { transform: translateY(-2px); }
    .uv2-btn-view:hover { opacity: 0.88 !important; }
    .uv2-chip { transition: background 0.15s, color 0.15s; }
  `;
  document.head.appendChild(s);
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function getAvatarSrc(user, version) {
  if (!user?.profile_picture_url) return null;
  const sep = user.profile_picture_url.includes("?") ? "&" : "?";
  return `${user.profile_picture_url}${sep}v=${version || Date.now()}`;
}

function mapUser(u, index) {
  return {
    id: u.id,
    name: `${u.first_name || ""} ${u.surname || ""}`.trim() || u.username,
    email: u.email,
    username: u.username,
    role: u.role || "User",
    position: u.position,
    status: !u.is_active ? "Inactive" : "Active",
    avatar: index % avatarPalette.length,
    groups: u.groups || [],
    profile_picture_url: u.profile_picture_url || null,
  };
}

// ── Skeleton ──────────────────────────────────────────────────
function Shimmer({ w = "100%", h = 14, r = 6, dark }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        flexShrink: 0,
        background: dark
          ? "linear-gradient(90deg,#1e2030 25%,#252836 50%,#1e2030 75%)"
          : "linear-gradient(90deg,#e8ecf0 25%,#f4f6f8 50%,#e8ecf0 75%)",
        backgroundSize: "600px 100%",
        animation: "uv2-shimmer 1.3s infinite linear",
      }}
    />
  );
}

function SkeletonCard({ dark }) {
  const bg = dark ? "rgba(22,24,32,0.8)" : "rgba(255,255,255,0.9)";
  const border = dark
    ? "1px solid rgba(255,255,255,0.06)"
    : "1px solid rgba(0,0,0,0.06)";
  return (
    <div
      style={{
        background: bg,
        border,
        borderRadius: 16,
        padding: "16px",
        display: "flex",
        gap: 12,
        animation: "uv2-pulse 2s ease infinite",
      }}
    >
      <Shimmer w={44} h={44} r={999} dark={dark} />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Shimmer w="50%" h={11} r={4} dark={dark} />
          <Shimmer w={68} h={22} r={99} dark={dark} />
        </div>
        <Shimmer w="65%" h={9} r={4} dark={dark} />
        <Shimmer w="40%" h={8} r={4} dark={dark} />
        <div style={{ display: "flex", gap: 5 }}>
          <Shimmer w={54} h={18} r={99} dark={dark} />
          <Shimmer w={44} h={18} r={99} dark={dark} />
          <Shimmer w={60} h={18} r={99} dark={dark} />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
function UsersView({
  ui,
  darkMode,
  impersonating,
  setImpersonating,
  setShowImpersonateConfirm,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [imageVersion] = useState(Date.now());

  const dark = darkMode;

  // theme tokens
  const pageBg = "transparent";
  const cardBg = dark ? "#242526" : "rgba(255,255,255,0.95)";
  const cardBorder = dark ? "#3a3b3c" : "rgba(0,0,0,0.07)";
  const inputBg = dark ? "#3a3b3c" : "rgba(255,255,255,0.9)";
  const inputBorder = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const panelBg = dark ? "#242526" : "rgba(255,255,255,0.7)";
  const textP = dark ? "#f1f3f9" : "#0f172a";
  const textS = dark ? "#94a3b8" : "#64748b";
  const textM = dark ? "#64748b" : "#94a3b8";
  const divider = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const hoverBg = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getAllUsers();
        setUsers(Array.isArray(data) ? data.map(mapUser) : []);
      } catch (e) {
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allRoles = ["All", ...Array.from(new Set(users.map((u) => u.role)))];
  const statuses = ["All", "Active", "Inactive", "Suspended"];

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)) &&
      (roleFilter === "All" || u.role === roleFilter) &&
      (statusFilter === "All" || u.status === statusFilter)
    );
  });

  const counts = {
    total: users.length,
    active: users.filter((u) => u.status === "Active").length,
    inactive: users.filter((u) => u.status === "Inactive").length,
    suspended: users.filter((u) => u.status === "Suspended").length,
  };

  const kpis = [
    {
      label: "Total Users",
      value: counts.total,
      accent: "#3b82f6",
      icon: "👥",
      glow: "#3b82f620",
    },
    {
      label: "Active",
      value: counts.active,
      accent: "#22c55e",
      icon: "●",
      glow: "#22c55e20",
    },
    {
      label: "Inactive",
      value: counts.inactive,
      accent: "#6b7280",
      icon: "○",
      glow: "#6b728015",
    },
    {
      label: "Suspended",
      value: counts.suspended,
      accent: "#ef4444",
      icon: "⊘",
      glow: "#ef444420",
    },
  ];

  // segment button style
  const seg = (active, accent = FB) => ({
    padding: "5px 13px",
    fontSize: "0.72rem",
    fontWeight: active ? 600 : 400,
    borderRadius: 7,
    border: active ? `1px solid ${accent}50` : "1px solid transparent",
    background: active ? (dark ? `${accent}20` : `${accent}15`) : "transparent",
    color: active ? accent : textS,
    cursor: "pointer",
    fontFamily: font,
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  });

  if (loading) {
    return (
      <div
        style={{
          background: pageBg,
          padding: 16,
          borderRadius: 18,
          minHeight: "100%",
          fontFamily: font,
        }}
      >
        {/* KPI skeletons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                gap: 10,
                animation: "uv2-pulse 2s ease infinite",
              }}
            >
              <Shimmer w={36} h={36} r={10} dark={dark} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Shimmer w={60} h={8} r={3} dark={dark} />
                <Shimmer w={40} h={20} r={4} dark={dark} />
              </div>
            </div>
          ))}
        </div>
        {/* Filter skeleton */}
        <div
          style={{
            background: panelBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 14,
            display: "flex",
            gap: 12,
          }}
        >
          <Shimmer w="40%" h={34} r={10} dark={dark} />
          <Shimmer w={220} h={34} r={10} dark={dark} />
          <Shimmer w={160} h={34} r={10} dark={dark} />
        </div>
        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: 12,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} dark={dark} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "60px 40px",
          textAlign: "center",
          color: "#ef4444",
          fontSize: "0.84rem",
          fontFamily: font,
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚠️</div>
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: font,
        background: pageBg,
        padding: 16,
        borderRadius: 18,
        minHeight: "100%",
      }}
    >
      {/* ── Header ── */}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: 700,
            color: textP,
            letterSpacing: "-0.01em",
          }}
        >
          User Management
        </p>
        <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: textS }}>
          View and impersonate user accounts to inspect their dashboard
          perspective
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
        }}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              background: dark ? `${k.accent}12` : "#ffffff",
              border: `1px solid ${dark ? `${k.accent}30` : "#e4e6eb"}`,
              boxShadow: dark
                ? `0 4px 20px ${k.glow}`
                : "0 1px 4px rgba(0,0,0,0.06)",
              borderRadius: 14,
              padding: "14px 16px",
              animation: "uv2-in 0.4s ease both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: dark ? `${k.accent}18` : `${k.accent}12`,
                  border: `1px solid ${dark ? `${k.accent}30` : `${k.accent}20`}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize:
                    k.icon === "●" || k.icon === "○" || k.icon === "⊘"
                      ? "1.1rem"
                      : "1rem",
                  color: k.accent,
                  fontWeight: 700,
                }}
              >
                {k.icon}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: k.accent,
                    opacity: 0.85,
                  }}
                >
                  {k.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: k.accent,
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {k.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          background: panelBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Search */}
        <div style={{ flex: "1 1 200px" }}>
          <label
            style={{
              fontSize: "0.63rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: textM,
              display: "block",
              marginBottom: 5,
            }}
          >
            Search
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.8rem",
                color: textM,
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Name, email, role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: inputBg,
                border: `1px solid ${inputBorder}`,
                borderRadius: 10,
                padding: "7px 10px 7px 30px",
                fontSize: "0.8rem",
                color: textP,
                outline: "none",
                colorScheme: dark ? "dark" : "light",
                fontFamily: font,
              }}
            />
          </div>
        </div>

        {/* Role filter */}
        <div>
          <label
            style={{
              fontSize: "0.63rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: textM,
              display: "block",
              marginBottom: 5,
            }}
          >
            Role
          </label>
          <div
            style={{
              background: dark ? "rgba(15,17,23,0.6)" : "rgba(240,242,245,0.7)",
              border: `1px solid ${divider}`,
              borderRadius: 10,
              padding: "3px",
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {allRoles.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={seg(roleFilter === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div>
          <label
            style={{
              fontSize: "0.63rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: textM,
              display: "block",
              marginBottom: 5,
            }}
          >
            Status
          </label>
          <div
            style={{
              background: dark ? "rgba(15,17,23,0.6)" : "rgba(240,242,245,0.7)",
              border: `1px solid ${divider}`,
              borderRadius: 10,
              padding: "3px",
              display: "flex",
              gap: 2,
            }}
          >
            {statuses.map((s) => {
              const sc = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={seg(statusFilter === s, sc ? sc.accent : FB)}
                >
                  {sc && statusFilter === s && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: sc.dot,
                        marginRight: 5,
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Results count ── */}
      {search || roleFilter !== "All" || statusFilter !== "All" ? (
        <p style={{ margin: 0, fontSize: "0.72rem", color: textS }}>
          Showing <strong style={{ color: textP }}>{filtered.length}</strong> of{" "}
          {users.length} users
        </p>
      ) : null}

      {/* ── User Cards Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((user, idx) => {
          const av = dark
            ? avatarPalette[user.avatar]
            : avatarPaletteLight[user.avatar];
          const rc = dark
            ? ROLE_COLORS[user.role] || ROLE_COLORS.User
            : ROLE_COLORS_LIGHT[user.role] || ROLE_COLORS_LIGHT.User;
          const sc = STATUS_COLORS[user.status] || STATUS_COLORS.Inactive;
          const isViewing = impersonating?.id === user.id;

          return (
            <div
              key={user.id}
              className="uv2-card"
              style={{
                background: isViewing
                  ? dark
                    ? "rgba(30,58,100,0.5)"
                    : "rgba(219,234,254,0.7)"
                  : cardBg,
                border: isViewing
                  ? `1.5px solid ${FB}60`
                  : `1px solid ${cardBorder}`,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: isViewing
                  ? `0 0 0 3px ${FB}20, 0 8px 24px rgba(0,0,0,0.15)`
                  : dark
                    ? "0 4px 20px rgba(0,0,0,0.3)"
                    : "0 2px 12px rgba(0,0,0,0.06)",
                animation: `uv2-in 0.3s ease ${idx * 0.02}s both`,
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: getAvatarSrc(user, imageVersion)
                        ? `url(${getAvatarSrc(user, imageVersion)}) center/cover`
                        : av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      border: `2px solid ${av.color}40`,
                      boxShadow: `0 2px 8px ${av.color}20`,
                    }}
                  >
                    {!getAvatarSrc(user, imageVersion) &&
                      getInitials(user.name)}
                  </div>
                  {/* Status dot */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: sc.dot,
                      border: `2px solid ${dark ? "#0f1117" : "#f0f2f5"}`,
                      boxShadow: `0 0 4px ${sc.dot}80`,
                    }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        minWidth: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.86rem",
                          fontWeight: 700,
                          color: textP,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.name}
                      </p>
                      {isViewing && (
                        <span
                          style={{
                            fontSize: "0.57rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 99,
                            background: FB,
                            color: "#fff",
                            letterSpacing: "0.05em",
                            flexShrink: 0,
                          }}
                        >
                          VIEWING
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    {isViewing ? (
                      <button
                        className="uv2-btn-view"
                        onClick={() => setImpersonating(null)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          borderRadius: 8,
                          border: "1.5px solid #ef444460",
                          background: dark
                            ? "rgba(239,68,68,0.12)"
                            : "rgba(255,241,242,0.9)",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontFamily: font,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        ✕ Stop
                      </button>
                    ) : (
                      <button
                        className="uv2-btn-view"
                        onClick={() =>
                          user.status !== "Suspended" &&
                          setShowImpersonateConfirm(user)
                        }
                        disabled={user.status === "Suspended"}
                        style={{
                          padding: "4px 10px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          borderRadius: 8,
                          background: "transparent",
                          border: `1px solid #e4e6eb`,
                          color: textS,
                          cursor:
                            user.status === "Suspended"
                              ? "not-allowed"
                              : "pointer",
                          fontFamily: font,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          opacity: user.status === "Suspended" ? 0.45 : 1,
                        }}
                      >
                        👁 View As
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.71rem",
                      color: textS,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.email}
                  </p>

                  {/* Position */}
                  {user.position && (
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: "0.69rem",
                        color: textM,
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
                      marginTop: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className="uv2-chip"
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: rc.bg,
                        color: rc.color,
                        border: `1px solid ${rc.dot}30`,
                      }}
                    >
                      {user.role}
                    </span>
                    <span
                      className="uv2-chip"
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: dark ? sc.bg : sc.lightBg,
                        color: dark ? sc.color : sc.lightColor,
                        border: `1px solid ${sc.dot}30`,
                      }}
                    >
                      {user.status}
                    </span>

                    {/* Group badges */}
                    {user.groups?.map((g) => (
                      <span
                        key={g.id}
                        className="uv2-chip"
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 99,
                          background: dark
                            ? "rgba(99,102,241,0.15)"
                            : "rgba(238,242,255,0.9)",
                          color: dark ? "#818cf8" : "#4338ca",
                          border: `1px solid ${dark ? "rgba(99,102,241,0.25)" : "rgba(67,56,202,0.15)"}`,
                        }}
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div
          style={{
            background: panelBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            padding: "48px 40px",
            textAlign: "center",
            color: textS,
            fontSize: "0.84rem",
          }}
        >
          <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>🔍</div>
          No users found matching your filters.
        </div>
      )}
    </div>
  );
}

export default UsersView;
