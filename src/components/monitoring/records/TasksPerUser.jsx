// src/components/monitoring/records/TasksPerUser.jsx
import { useState, useEffect, useMemo } from "react";
import { getUsersTaskSummary, getGroups } from "../../../api/monitoring";

const FB = "#1877F2";
const PAGE_SIZE = 8;

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

export default function TasksPerUser({
  ui,
  darkMode,
  onUserClick,
  selectedUserId,
  selectedStatus = "all",
}) {
  const [allUsers, setAllUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState(""); // "" = all groups

  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";

  // Fetch groups once for the dropdown
  useEffect(() => {
    getGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  // Fetch users — re-fetch whenever groupFilter changes (server-side filtering)
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = groupFilter ? { group_id: groupFilter } : {};
        const data = await getUsersTaskSummary(params);
        if (!cancelled) {
          setAllUsers(data.data || []);
          setPage(1);
        }
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
  }, [groupFilter]);

  // Client-side search only (group filtering is server-side)
  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      const name = (u.full_name || u.username || "").toLowerCase();
      return search.trim() === "" || name.includes(search.trim().toLowerCase());
    });
  }, [allUsers, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const maxTasks = Math.max(...allUsers.map((u) => u.tasks?.total || 0), 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const btnStyle = (disabled) => ({
    background: "transparent",
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 5,
    color: disabled ? ui.textMuted : ui.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "2px 8px",
    fontSize: "0.78rem",
    fontFamily: font,
  });

  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: "0.76rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    width: "100%",
    boxSizing: "border-box",
    colorScheme: darkMode ? "dark" : "light",
  };

  const countCols = [
    { key: "all", label: "ALL", color: FB, getValue: (t) => t.total || 0 },
    {
      key: "completed",
      label: "✅",
      color: "#36a420",
      getValue: (t) => t.completed || 0,
    },
    {
      key: "in_progress",
      label: "⏳",
      color: "#f59e0b",
      getValue: (t) => t.in_progress || 0,
    },
  ];

  return (
    <div
      style={{
        flex: "0 0 300px",
        minWidth: 260,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 160px)",
        maxHeight: "calc(100vh - 160px)",
      }}
    >
      <p
        style={{
          fontSize: "0.9rem",
          fontWeight: 700,
          color: ui.textPrimary,
          margin: "0 0 8px",
          fontFamily: font,
          flexShrink: 0,
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
          minHeight: 0,
        }}
      >
        {/* Filter Bar */}
        <div
          style={{
            padding: "8px 10px",
            borderBottom: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder="Search user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputSt}
          />
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            style={{ ...inputSt, cursor: "pointer" }}
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Column Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 44px 44px 44px",
            background: colHdr,
            borderBottom: `1px solid ${ui.divider}`,
            padding: "6px 12px",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.63rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: ui.textMuted,
              fontFamily: font,
            }}
          >
            User
          </span>
          {countCols.map(({ key, label, color }) => (
            <span
              key={key}
              style={{
                fontSize: "0.63rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: selectedStatus === key ? color : ui.textMuted,
                textAlign: "center",
                fontFamily: font,
                transition: "color 0.15s",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
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
          ) : filtered.length === 0 ? (
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
            pagedUsers.map((user, i) => {
              const globalIndex = allUsers.indexOf(user);
              const av = getAvatarColor(globalIndex >= 0 ? globalIndex : i);
              const tasks = user.tasks || {};
              const displayName = user.full_name || user.username || "—";
              const displayGroup = user.group_name || "—"; // ← group_name from backend
              const total = tasks.total || 0;

              const isSelected =
                selectedUserId && selectedUserId === user.user_id;

              return (
                <div
                  key={user.user_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 44px 44px 44px",
                    padding: "9px 12px",
                    gap: 4,
                    borderBottom:
                      i < pagedUsers.length - 1
                        ? `1px solid ${ui.divider}`
                        : "none",
                    alignItems: "center",
                    background: isSelected
                      ? darkMode
                        ? "#1a2744"
                        : "#e7f0fd"
                      : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    !isSelected &&
                    (e.currentTarget.style.background = ui.hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isSelected
                      ? darkMode
                        ? "#1a2744"
                        : "#e7f0fd"
                      : "transparent")
                  }
                >
                  {/* User info */}
                  <div
                    onClick={() => onUserClick && onUserClick(user, "all")}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      minWidth: 0,
                      cursor: "pointer",
                    }}
                  >
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
                      {/* ← group_name instead of position */}
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
                        {displayGroup}
                      </p>

                      <div
                        style={{
                          height: 3,
                          borderRadius: 99,
                          background: ui.progressBg,
                          overflow: "hidden",
                          display: "flex",
                        }}
                      >
                        {/* Completed — green */}
                        <div
                          style={{
                            height: 3,
                            background: "#36a420",
                            width: `${total > 0 ? ((tasks.completed || 0) / total) * 100 : 0}%`,
                            transition: "width 0.4s",
                            flexShrink: 0,
                          }}
                        />
                        {/* In Progress — yellow */}
                        <div
                          style={{
                            height: 3,
                            background: "#f59e0b",
                            width: `${total > 0 ? ((tasks.in_progress || 0) / total) * 100 : 0}%`,
                            transition: "width 0.4s",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clickable count cells */}
                  {countCols.map(({ key, color, getValue }) => {
                    const val = getValue(tasks);
                    const isActiveCol = isSelected && selectedStatus === key;
                    return (
                      <span
                        key={key}
                        onClick={() => onUserClick && onUserClick(user, key)}
                        title={`Show ${key === "all" ? "all" : key === "completed" ? "completed" : "in-progress"} records`}
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 800,
                          color: isActiveCol ? "#fff" : color,
                          textAlign: "center",
                          fontFamily: font,
                          cursor: "pointer",
                          borderRadius: 6,
                          padding: "2px 4px",
                          background: isActiveCol ? color : "transparent",
                          transition: "all 0.15s",
                          userSelect: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActiveCol)
                            e.currentTarget.style.background = `${color}22`;
                        }}
                        onMouseLeave={(e) => {
                          if (!isActiveCol)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {val}
                      </span>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Pagination */}
        <div
          style={{
            padding: "7px 12px",
            borderTop: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              color: ui.textMuted,
              fontFamily: font,
            }}
          >
            {filtered.length} / {allUsers.length} users
          </span>
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={btnStyle(page === 1)}
              >
                ‹
              </button>
              <span
                style={{
                  fontSize: "0.73rem",
                  color: ui.textMuted,
                  fontFamily: font,
                }}
              >
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={btnStyle(page >= totalPages)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
