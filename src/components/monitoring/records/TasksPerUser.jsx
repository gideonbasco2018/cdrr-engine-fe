// src/components/monitoring/records/TasksPerUser.jsx
import { useState, useEffect } from "react";
import { getUsersTaskSummary } from "../../../api/monitoring";

const FB = "#1877F2";

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

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function getAvatarColor(index) {
  return avatarPalette[index % avatarPalette.length];
}

export default function TasksPerUser({ ui, darkMode, onUserClick }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUsersTaskSummary();
        if (!cancelled) setUsers(data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxTasks = Math.max(...users.map((u) => u.tasks?.total || 0), 1);
  const totalTasks = users.reduce((s, u) => s + (u.tasks?.total || 0), 0);

  return (
    <div
      style={{
        flex: "0 0 300px",
        minWidth: 260,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p
        style={{
          fontSize: "0.9rem",
          fontWeight: 700,
          color: ui.textPrimary,
          margin: "0 0 8px",
          fontFamily: font,
        }}
      >
        Tasks per User
      </p>

      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Column Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 44px 44px 44px",
            background: colHdr,
            borderBottom: `1px solid ${ui.divider}`,
            padding: "7px 12px",
            gap: 4,
          }}
        >
          {[
            { label: "User", align: "left" },
            { label: "All", align: "center" },
            { label: "✅", align: "center" },
            { label: "⏳", align: "center" },
          ].map(({ label, align }) => (
            <span
              key={label}
              style={{
                fontSize: "0.63rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: ui.textMuted,
                textAlign: align,
                fontFamily: font,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                fontFamily: font,
              }}
            >
              Loading...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "#e02020",
                fontSize: "0.8rem",
                fontFamily: font,
              }}
            >
              {error}
            </div>
          ) : users.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                fontFamily: font,
              }}
            >
              No users found
            </div>
          ) : (
            users.map((user, i) => {
              const av = getAvatarColor(i);
              const total = user.tasks?.total || 0;
              const completed = user.tasks?.completed || 0;
              const inProgress = user.tasks?.in_progress || 0;
              const displayName = user.full_name || user.username || "—";
              const displayRole = user.position || user.role || "User";
              const barPct = maxTasks > 0 ? (total / maxTasks) * 100 : 0;

              return (
                <div
                  key={user.user_id}
                  onClick={() => onUserClick && onUserClick(user)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 44px 44px 44px",
                    padding: "9px 12px",
                    gap: 4,
                    borderBottom:
                      i < users.length - 1 ? `1px solid ${ui.divider}` : "none",
                    cursor: "pointer",
                    transition: "background 0.12s",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = ui.hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* User info — no truncation, wrap instead */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: av.bg,
                        color: av.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        border: `1.5px solid ${av.color}33`,
                        fontFamily: font,
                        marginTop: 1,
                      }}
                    >
                      {getInitials(displayName)}
                    </div>

                    {/* Name + role + progress */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: ui.textPrimary,
                          lineHeight: 1.3,
                          wordBreak: "break-word",
                          fontFamily: font,
                        }}
                      >
                        {displayName}
                      </p>
                      <p
                        style={{
                          margin: "1px 0 4px",
                          fontSize: "0.64rem",
                          color: ui.textMuted,
                          lineHeight: 1.3,
                          wordBreak: "break-word",
                          fontFamily: font,
                        }}
                      >
                        {displayRole}
                      </p>
                      {/* Progress bar */}
                      <div
                        style={{
                          height: 3,
                          borderRadius: 99,
                          background: ui.progressBg,
                        }}
                      >
                        <div
                          style={{
                            height: 3,
                            borderRadius: 99,
                            background: av.color,
                            width: `${barPct}%`,
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <span
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      color: FB,
                      textAlign: "center",
                      fontFamily: font,
                    }}
                  >
                    {total}
                  </span>

                  {/* Completed */}
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#36a420",
                      textAlign: "center",
                      fontFamily: font,
                    }}
                  >
                    {completed}
                  </span>

                  {/* In Progress */}
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#f59e0b",
                      textAlign: "center",
                      fontFamily: font,
                    }}
                  >
                    {inProgress}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "7px 12px",
            borderTop: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              color: ui.textMuted,
              fontFamily: font,
            }}
          >
            {users.length} user{users.length !== 1 ? "s" : ""}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: ui.textMuted,
              fontFamily: font,
            }}
          >
            {totalTasks} total logs
          </span>
        </div>
      </div>
    </div>
  );
}
