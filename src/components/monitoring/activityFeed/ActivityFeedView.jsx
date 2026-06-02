import { useState, useEffect, useCallback, useRef } from "react";
import { getDashboardGlobalAllRecentApplications } from "../../../api/dashboard";

const FB = "#1877F2";

// ── Glassmorphism helpers ─────────────────────────────────────
function glassCard(darkMode) {
  return {
    background: darkMode
      ? "linear-gradient(135deg, rgba(40,40,50,0.6) 0%, rgba(30,30,40,0.4) 100%)"
      : "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 100%)",
    backdropFilter: "blur(24px) saturate(200%)",
    WebkitBackdropFilter: "blur(24px) saturate(200%)",
    border: darkMode
      ? "1.5px solid rgba(255,255,255,0.1)"
      : "1.5px solid rgba(255,255,255,0.8)",
    boxShadow: darkMode
      ? "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 8px 32px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
  };
}

function glassInput(darkMode) {
  return {
    background: darkMode ? "rgba(50,50,55,0.5)" : "rgba(255,255,255,0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
    boxShadow: darkMode
      ? "inset 0 1px 3px rgba(0,0,0,0.2)"
      : "inset 0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(255,255,255,0.6)",
  };
}

function glassPanel(darkMode) {
  return {
    background: darkMode
      ? "rgba(30,30,35,0.45)"
      : "rgba(255,255,255,0.4)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)"}`,
    boxShadow: darkMode
      ? "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"
      : "0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
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
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes af-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);
}

// ── Skeleton components ───────────────────────────────────────
function SkeletonBox({ width = "100%", height = 14, radius = 6, darkMode, style: extra = {} }) {
  const shimmer = darkMode
    ? "linear-gradient(90deg, rgba(50,50,60,0.6) 25%, rgba(70,70,80,0.6) 50%, rgba(50,50,60,0.6) 75%)"
    : "linear-gradient(90deg, rgba(220,225,235,0.6) 25%, rgba(240,243,248,0.8) 50%, rgba(220,225,235,0.6) 75%)";
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: shimmer,
      backgroundSize: "800px 100%",
      animation: "af-shimmer 1.4s infinite linear",
      flexShrink: 0,
      ...extra,
    }} />
  );
}

function SkeletonCard({ darkMode, index = 0 }) {
  return (
    <div style={{
      ...glassCard(darkMode),
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      animation: "af-fade-up 0.4s ease both",
      animationDelay: `${index * 80}ms`,
    }}>
      <SkeletonBox width={40} height={40} radius={10} darkMode={darkMode} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonBox width="65%" height={12} darkMode={darkMode} />
        <SkeletonBox width="45%" height={10} darkMode={darkMode} />
        <SkeletonBox width={90} height={8} darkMode={darkMode} style={{ marginTop: 2 }} />
        <SkeletonBox width={160} height={26} radius={8} darkMode={darkMode} style={{ marginTop: 4 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <SkeletonBox width={55} height={10} darkMode={darkMode} />
        <SkeletonBox width={70} height={9} darkMode={darkMode} />
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

// ── Glass Card wrapper ────────────────────────────────────────
function Card({ children, style = {}, darkMode, animIndex = 0 }) {
  return (
    <div
      style={{
        ...glassCard(darkMode),
        borderRadius: 16,
        overflow: "hidden",
        animation: "af-fade-up 0.4s ease both",
        animationDelay: `${animIndex * 50}ms`,
        ...style,
      }}
    >
      {children}
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

  // ── FIX: local search state so the input doesn't lose focus on parent re-renders
  const [localSearch, setLocalSearch] = useState(activitySearch || "");
  const debounceRef = useRef(null);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActivitySearch(val);
    }, 150);
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
    const interval = setInterval(fetchFeed, 30000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

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

  // ── FIX: filter uses localSearch instead of activitySearch prop
  const filteredAct = localSearch
    ? feed.filter(
        (a) =>
          a.user.toLowerCase().includes(localSearch.toLowerCase()) ||
          a.target.toLowerCase().includes(localSearch.toLowerCase()) ||
          a.action.toLowerCase().includes(localSearch.toLowerCase())
      )
    : feed;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 16, fontFamily: font,
      background: darkMode
        ? "#16171f"
        : "#f4f5f7",
      padding: 16,
      borderRadius: 18,
      minHeight: "100%",
    }}>
      {/* Header */}
      <div
        style={{
          ...glassPanel(darkMode),
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
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
            Activity Feed
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 3,
            }}
          >
            <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textMuted }}>
              Real-time log of user actions
            </p>
            {lastUpdated && (
              <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>
                · Updated{" "}
                {lastUpdated.toLocaleTimeString("en-PH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => {
              setLoading(true);
              fetchFeed();
            }}
            title="Refresh feed"
            style={{
              ...glassInput(darkMode),
              padding: "8px 12px",
              borderRadius: 10,
              color: ui.textMuted,
              cursor: "pointer",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: font,
              transition: "all 0.15s ease",
            }}
          >
            <svg
              width="16"
              height="16"
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
          {/* ── FIX: value and onChange now use local state ── */}
          <input
            placeholder="Search activity…"
            value={localSearch}
            onChange={handleSearchChange}
            style={{ ...inputSt, minWidth: 220 }}
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} darkMode={darkMode} index={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          ...glassCard(darkMode),
          borderRadius: 16,
          padding: "30px",
          textAlign: "center",
          fontFamily: font,
        }}>
          <p
            style={{
              color: "#e02020",
              fontSize: "0.84rem",
              margin: "0 0 10px",
            }}
          >
            <i className="ti ti-alert-triangle" aria-hidden="true" /> {error}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              fetchFeed();
            }}
            style={{
              ...glassInput(darkMode),
              padding: "7px 18px",
              fontSize: "0.8rem",
              borderRadius: 8,
              color: ui.textPrimary,
              cursor: "pointer",
              fontFamily: font,
              transition: "all 0.15s ease",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Activity List */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredAct.map((act, idx) => (
            <Card key={act.id} darkMode={darkMode} style={{ padding: "14px 16px" }} animIndex={idx}>
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                {/* Icon Box */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                    fontSize: "1.3rem",
                  }}
                >
                  {act.icon}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* User + Action */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.84rem",
                      color: ui.textPrimary,
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{act.user}</span>{" "}
                    <span style={{ color: ui.textSub }}>{act.action}</span>
                  </p>

                  {/* Drug Name */}
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.75rem",
                      color: ui.textMuted,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {act.target}
                  </p>

                  {/* DTN */}
                  {act.dtn && (
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: "0.67rem",
                        color: ui.textMuted,
                        fontFamily: "monospace",
                      }}
                    >
                      {act.dtn}
                    </p>
                  )}

                  {/* Application Status Row */}
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 10px",
                        background: darkMode ? "rgba(50,50,55,0.4)" : "rgba(255,255,255,0.5)",
                        backdropFilter: "blur(8px)",
                        border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}`,
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: ui.textMuted,
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Application status:
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 9px",
                          borderRadius: 99,
                          background: `${act.statusBg}cc`,
                          backdropFilter: "blur(6px)",
                          color: act.statusColor,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {act.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: ui.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {act.time}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: "0.67rem",
                      color: ui.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <i
                      className="ti ti-calendar"
                      style={{ fontSize: "0.75rem" }}
                      aria-hidden="true"
                    />
                    {act.createdDate || "No date"}
                  </span>
                  {act.appStep && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: "0.67rem",
                        color: ui.textMuted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <i
                        className="ti ti-clock"
                        style={{ fontSize: "0.75rem" }}
                        aria-hidden="true"
                      />
                      {act.appStep}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {filteredAct.length === 0 && (
            <div
              style={{
                ...glassCard(darkMode),
                borderRadius: 16,
                padding: "28px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No activity found
            </div>
          )}

          {filteredAct.length > 0 && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
                textAlign: "center",
              }}
            >
              Showing {filteredAct.length} activit
              {filteredAct.length !== 1 ? "ies" : "y"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}