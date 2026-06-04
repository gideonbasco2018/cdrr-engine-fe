import { useState, useEffect, useCallback, useRef } from "react";
import { getDashboardGlobalAllRecentApplications } from "../../../api/dashboard";

const FB = "#1877F2";
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ── Glassmorphism helpers ─────────────────────────────────────
function glassCard(darkMode) {
  return {
    background: darkMode ? "rgba(42,43,50,0.7)" : "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px) saturate(160%)",
    WebkitBackdropFilter: "blur(12px) saturate(160%)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
    boxShadow: darkMode
      ? "0 2px 10px rgba(0,0,0,0.2)"
      : "0 1px 4px rgba(0,0,0,0.05)",
  };
}

function glassInput(darkMode) {
  return {
    background: darkMode ? "rgba(50,50,58,0.6)" : "rgba(245,246,248,0.9)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}`,
    boxShadow: "none",
  };
}

// ── Keyframes injection ───────────────────────────────────────
const ANIM_ID = "activity-feed-glass-anims";
if (typeof document !== "undefined" && !document.getElementById(ANIM_ID)) {
  const style = document.createElement("style");
  style.id = ANIM_ID;
  style.textContent = `
    @keyframes af-shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes af-fade-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes af-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);
}

// ── Skeleton ─────────────────────────────────────────────────
function SkeletonBox({
  width = "100%",
  height = 14,
  radius = 6,
  darkMode,
  style: extra = {},
}) {
  const shimmer = darkMode
    ? "linear-gradient(90deg, rgba(50,50,60,0.6) 25%, rgba(70,70,80,0.6) 50%, rgba(50,50,60,0.6) 75%)"
    : "linear-gradient(90deg, rgba(220,225,235,0.6) 25%, rgba(240,243,248,0.8) 50%, rgba(220,225,235,0.6) 75%)";
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: shimmer,
        backgroundSize: "800px 100%",
        animation: "af-shimmer 1.4s infinite linear",
        flexShrink: 0,
        ...extra,
      }}
    />
  );
}

function SkeletonRow({ darkMode, index = 0 }) {
  const divider = `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`;
  return (
    <div
      style={{
        padding: "9px 14px",
        borderBottom: divider,
        display: "flex",
        gap: 10,
        alignItems: "center",
        animation: "af-pulse 2s ease-in-out infinite",
        animationDelay: `${index * 80}ms`,
      }}
    >
      <SkeletonBox
        width={32}
        height={32}
        radius={8}
        darkMode={darkMode}
        style={{ flexShrink: 0 }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}
      >
        <SkeletonBox width="50%" height={9} radius={4} darkMode={darkMode} />
        <SkeletonBox width="35%" height={7} radius={4} darkMode={darkMode} />
        <SkeletonBox
          width={100}
          height={18}
          radius={99}
          darkMode={darkMode}
          style={{ marginTop: 2 }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <SkeletonBox width={42} height={7} radius={4} darkMode={darkMode} />
        <SkeletonBox width={54} height={7} radius={4} darkMode={darkMode} />
      </div>
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return "recently";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800)
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function mapActivityItem(app, index) {
  const status = app.application_status || "";
  const appStep = app.app_step || "";
  const user = app.user_name || "Unknown";
  const drugName =
    app.brand_name && app.generic_name
      ? `${app.brand_name} (${app.generic_name})`
      : app.brand_name || app.generic_name || app.dtn || "—";
  const icon = app.icon || "📄";
  const statusColor = app.status_color || FB;
  const statusBg = app.status_bg || "#eff6ff";
  const statusLabel = app.status_label || status || "Unknown";
  const actionMap = {
    Approved: "approved application",
    Disapproved: "disapproved application",
    Completed: "completed application",
    "In Progress": "updated application",
    "For Evaluation": "started evaluation",
    "For Compliance": "flagged for compliance",
    "For Checking": "submitted for checking",
    "For QA": "submitted for QA",
    "For Releasing": "released document",
  };
  const action =
    actionMap[statusLabel] || actionMap[appStep] || "updated application";
  const rawDate = app.end_date || app.created_at || app.start_date || null;
  const createdDate =
    app.created_at || app.date_created || app.start_date || null;
  return {
    id: app.log_id || app.dtn || index,
    user,
    action,
    target: drugName,
    time: relativeTime(rawDate),
    rawDate,
    createdDate: formatDate(createdDate),
    icon,
    statusColor,
    statusBg,
    statusLabel,
    appStep,
    dtn: app.dtn,
  };
}

// ── Page Size Selector ────────────────────────────────────────
function PageSizeSelector({ value, onChange, darkMode, ui }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  useEffect(() => {
    function out(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, [open]);
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: "0.63rem",
          color: ui.textMuted,
          whiteSpace: "nowrap",
        }}
      >
        Show
      </span>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...glassInput(darkMode),
          fontSize: "0.63rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 6,
          color: open ? "#4A7FD4" : ui.textMuted,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          lineHeight: 1.6,
          transition: "all 0.15s ease",
          userSelect: "none",
          fontFamily: font,
        }}
      >
        {value}
        <span
          style={{
            fontSize: "0.45rem",
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: darkMode ? "#242526" : "#fff",
            border: `1px solid ${darkMode ? "#3a3b3c" : "#E2E8F0"}`,
            borderRadius: 8,
            overflow: "hidden",
            zIndex: 100,
            minWidth: 60,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {PAGE_SIZE_OPTIONS.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 14px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textAlign: "center",
                  border: "none",
                  background: active
                    ? darkMode
                      ? "#1a2744"
                      : "#EEF4FF"
                    : "transparent",
                  color: active ? "#4A7FD4" : darkMode ? "#b0b3b8" : "#374151",
                  cursor: "pointer",
                  transition: "background 0.1s ease",
                  fontFamily: font,
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.background = darkMode
                      ? "#3a3b3c"
                      : "#F3F6FC";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────
function Pagination({ current, total, onChange, darkMode, ui }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const btn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 26,
    height: 26,
    borderRadius: 6,
    fontSize: "0.7rem",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: font,
    padding: "0 5px",
  };

  // Build page number buttons only if total > 1
  const pageButtons = [];
  if (total > 1) {
    const delta = 2;
    const pages = [];
    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      )
        pages.push(i);
      else if (i === current - delta - 1 || i === current + delta + 1)
        pages.push("...");
    }
    const deduped = pages.filter(
      (p, i) => !(p === "..." && pages[i - 1] === "..."),
    );
    deduped.forEach((p, i) => {
      if (p === "...") {
        pageButtons.push(
          <span
            key={`e-${i}`}
            style={{
              fontSize: "0.7rem",
              color: ui.textMuted,
              padding: "0 2px",
            }}
          >
            …
          </span>,
        );
      } else {
        pageButtons.push(
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              ...btn,
              background:
                p === current
                  ? "#4A7FD4"
                  : darkMode
                    ? "rgba(60,61,68,0.7)"
                    : "rgba(240,242,245,0.9)",
              color: p === current ? "#fff" : ui.textMuted,
            }}
          >
            {p}
          </button>,
        );
      }
    });
  } else {
    // Still show current page indicator even if only 1 page
    pageButtons.push(
      <button
        key={1}
        style={{
          ...btn,
          background: "#4A7FD4",
          color: "#fff",
          cursor: "default",
        }}
      >
        1
      </button>,
    );
  }

  const prevDisabled = current <= 1;
  const nextDisabled = current >= total;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 3,
      }}
    >
      <button
        onClick={() => {
          if (!prevDisabled) onChange(current - 1);
        }}
        style={{
          ...btn,
          background: darkMode ? "rgba(60,61,68,0.7)" : "rgba(240,242,245,0.9)",
          color: prevDisabled
            ? darkMode
              ? "#4a4b55"
              : "#C0C8D4"
            : ui.textMuted,
          cursor: prevDisabled ? "not-allowed" : "pointer",
          opacity: prevDisabled ? 0.5 : 1,
        }}
      >
        ‹
      </button>

      {pageButtons}

      <button
        onClick={() => {
          if (!nextDisabled) onChange(current + 1);
        }}
        style={{
          ...btn,
          background: darkMode ? "rgba(60,61,68,0.7)" : "rgba(240,242,245,0.9)",
          color: nextDisabled
            ? darkMode
              ? "#4a4b55"
              : "#C0C8D4"
            : ui.textMuted,
          cursor: nextDisabled ? "not-allowed" : "pointer",
          opacity: nextDisabled ? 0.5 : 1,
        }}
      >
        ›
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function ActivityFeedView({
  ui,
  darkMode,
  activitySearch,
  setActivitySearch,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [localSearch, setLocalSearch] = useState(activitySearch || "");
  const debounceRef = useRef(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActivitySearch(val), 150);
  };

  const handlePageSizeChange = (s) => {
    setPageSize(s);
    setPage(1);
  };

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const data = await getDashboardGlobalAllRecentApplications();
      const raw = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
      const items = raw.map((app, i) => mapActivityItem(app, i));
      items.sort((a, b) => {
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return new Date(b.rawDate) - new Date(a.rawDate);
      });
      setFeed(items);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch activity feed:", err);
      setError("Failed to load activity feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);
  useEffect(() => {
    const id = setInterval(fetchFeed, 30000);
    return () => clearInterval(id);
  }, [fetchFeed]);

  const filteredAct = localSearch
    ? feed.filter(
        (a) =>
          a.user.toLowerCase().includes(localSearch.toLowerCase()) ||
          a.target.toLowerCase().includes(localSearch.toLowerCase()) ||
          a.action.toLowerCase().includes(localSearch.toLowerCase()),
      )
    : feed;

  const totalPages = Math.max(1, Math.ceil(filteredAct.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedAct = filteredAct.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const divider = `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: font,
      }}
    >
      {/* ── Single unified card ── */}
      <div
        style={{
          ...glassCard(darkMode),
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Card Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: divider,
            flexShrink: 0,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {/* Title + subtitle */}
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                fontWeight: 700,
                color: ui.textPrimary,
                letterSpacing: "-0.01em",
              }}
            >
              Activity Feed
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: 1,
              }}
            >
              <p
                style={{ margin: 0, fontSize: "0.65rem", color: ui.textMuted }}
              >
                Real-time log of user actions
              </p>
              {lastUpdated && (
                <span style={{ fontSize: "0.63rem", color: ui.textMuted }}>
                  · Updated{" "}
                  {lastUpdated.toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <PageSizeSelector
              value={pageSize}
              onChange={handlePageSizeChange}
              darkMode={darkMode}
              ui={ui}
            />
            <button
              onClick={() => {
                setLoading(true);
                fetchFeed();
              }}
              title="Refresh feed"
              style={{
                ...glassInput(darkMode),
                padding: "5px 9px",
                borderRadius: 7,
                color: ui.textMuted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: font,
                transition: "all 0.15s ease",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <input
              placeholder="Search activity…"
              value={localSearch}
              onChange={handleSearchChange}
              style={{
                ...glassInput(darkMode),
                borderRadius: 7,
                padding: "5px 10px",
                fontSize: "0.75rem",
                color: ui.textPrimary,
                outline: "none",
                colorScheme: darkMode ? "dark" : "light",
                fontFamily: font,
                transition: "all 0.2s ease",
                minWidth: 190,
              }}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1 }}>
          {/* Skeleton */}
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} index={i} darkMode={darkMode} />
            ))}

          {/* Error */}
          {!loading && error && (
            <div
              style={{ padding: "24px", textAlign: "center", fontFamily: font }}
            >
              <p
                style={{
                  color: "#e02020",
                  fontSize: "0.8rem",
                  margin: "0 0 8px",
                }}
              >
                {error}
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchFeed();
                }}
                style={{
                  ...glassInput(darkMode),
                  padding: "5px 14px",
                  fontSize: "0.76rem",
                  borderRadius: 7,
                  color: ui.textPrimary,
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Rows */}
          {!loading && !error && pagedAct.length === 0 && (
            <div
              style={{
                padding: "28px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.8rem",
              }}
            >
              No activity found
            </div>
          )}

          {!loading &&
            !error &&
            pagedAct.map((act, idx) => (
              <div
                key={act.id}
                style={{
                  padding: "9px 14px",
                  borderBottom: idx < pagedAct.length - 1 ? divider : "none",
                  animation: "af-fade-up 0.3s ease both",
                  animationDelay: `${idx * 35}ms`,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: darkMode
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.95rem",
                      marginTop: 1,
                    }}
                  >
                    {act.icon}
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.76rem",
                        color: ui.textPrimary,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{act.user}</span>{" "}
                      <span style={{ color: ui.textSub }}>{act.action}</span>
                    </p>
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: "0.68rem",
                        color: ui.textMuted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {act.target}
                    </p>
                    {act.dtn && (
                      <p
                        style={{
                          margin: "1px 0 0",
                          fontSize: "0.62rem",
                          color: ui.textMuted,
                          fontFamily: "monospace",
                        }}
                      >
                        {act.dtn}
                      </p>
                    )}
                    {/* Status badge */}
                    <div
                      style={{
                        marginTop: 5,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{ fontSize: "0.62rem", color: ui.textMuted }}
                      >
                        Application status:
                      </span>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          padding: "1px 8px",
                          borderRadius: 99,
                          background: `${act.statusBg}cc`,
                          color: act.statusColor,
                        }}
                      >
                        {act.statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Right column */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: ui.textMuted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {act.time}
                    </span>
                    <span
                      style={{
                        fontSize: "0.62rem",
                        color: ui.textMuted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {act.createdDate || "No date"}
                    </span>
                    {act.appStep && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: ui.textMuted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {act.appStep}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* ── Card Footer ── */}
        {!loading && !error && filteredAct.length > 0 && (
          <div
            style={{
              padding: "7px 14px",
              borderTop: divider,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "0.62rem", color: ui.textMuted }}>
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredAct.length)} of{" "}
              {filteredAct.length} activit
              {filteredAct.length !== 1 ? "ies" : "y"}
            </span>
            <Pagination
              current={safePage}
              total={totalPages}
              onChange={setPage}
              darkMode={darkMode}
              ui={ui}
            />
          </div>
        )}
      </div>
    </div>
  );
}
