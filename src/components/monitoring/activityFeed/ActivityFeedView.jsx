import { useState, useEffect, useCallback } from "react";
import { getDashboardRecentApplications } from "../../../api/dashboard";

const FB = "#1877F2";

function relativeTime(dateStr) {
  if (!dateStr) return "recently";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)     return `${diff}s ago`;
  if (diff < 3600)   return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function mapActivityItem(app, index) {
  const status  = app.application_status || "";
  const appStep = app.app_step || "";
  const user    = app.user_name || "Unknown";

  const drugName =
    app.brand_name && app.generic_name
      ? `${app.brand_name} (${app.generic_name})`
      : app.brand_name || app.generic_name || app.dtn || "—";

  // ── Icon & colors: use backend values directly ─────────────────────────
  const icon        = app.icon || "📄";           // emoji from backend
  const statusColor = app.status_color || FB;
  const statusBg    = app.status_bg    || "#eff6ff";
  const statusLabel = app.status_label || status || "Unknown";

  const actionMap = {
    Approved:         "approved application",
    Disapproved:      "disapproved application",
    Completed:        "completed application",
    "In Progress":    "updated application",
    "For Evaluation": "started evaluation",
    "For Compliance": "flagged for compliance",
    "For Checking":   "submitted for checking",
    "For QA":         "submitted for QA",
    "For Releasing":  "released document",
  };

  const action =
    actionMap[statusLabel] ||
    actionMap[appStep]     ||
    "updated application";

  const rawDate     = app.end_date || app.created_at || app.start_date || null;
  const createdDate = app.created_at || app.date_created || app.start_date || null;

  return {
    id: app.log_id || app.dtn || index,
    user,
    action,
    target:       drugName,
    time:         relativeTime(rawDate),
    rawDate,
    createdDate:  formatDate(createdDate),
    icon,          // ← emoji straight from backend
    statusColor,   // ← color straight from backend
    statusBg,      // ← bg straight from backend
    statusLabel,   // ← label straight from backend
    appStep,
    dtn: app.dtn,
  };
}

function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function ActivityFeedView({ ui, darkMode, activitySearch, setActivitySearch }) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [feed, setFeed]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const data = await getDashboardRecentApplications();
      // backend returns { rows: [...], total, total_pages, page }
      const raw  = Array.isArray(data?.rows) ? data.rows
                 : Array.isArray(data?.data)  ? data.data
                 : Array.isArray(data)         ? data
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

  useEffect(() => { fetchFeed(); }, [fetchFeed]);
  useEffect(() => {
    const interval = setInterval(fetchFeed, 30000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

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

  const filteredAct = activitySearch
    ? feed.filter(
        (a) =>
          a.user.toLowerCase().includes(activitySearch.toLowerCase()) ||
          a.target.toLowerCase().includes(activitySearch.toLowerCase()) ||
          a.action.toLowerCase().includes(activitySearch.toLowerCase()),
      )
    : feed;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: ui.textPrimary }}>
            Activity Feed
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textMuted }}>
              Real-time log of user actions
            </p>
            {lastUpdated && (
              <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>
                · Updated {lastUpdated.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => { setLoading(true); fetchFeed(); }}
            title="Refresh feed"
            style={{
              padding: "7px 10px", borderRadius: 7,
              border: `1px solid ${ui.cardBorder}`,
              background: ui.inputBg, color: ui.textMuted,
              cursor: "pointer", fontSize: "0.85rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font,
            }}
          >
            <i className="ti ti-refresh" aria-hidden="true" />
          </button>
          <input
            placeholder="Search activity…"
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            style={{ ...inputSt, minWidth: 220 }}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: ui.textMuted, fontSize: "0.84rem", fontFamily: font }}>
          <i className="ti ti-hourglass" style={{ fontSize: "1.4rem", display: "block", marginBottom: 8 }} aria-hidden="true" />
          Loading activity feed…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: "30px", textAlign: "center", fontFamily: font }}>
          <p style={{ color: "#e02020", fontSize: "0.84rem", margin: "0 0 10px" }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" /> {error}
          </p>
          <button
            onClick={() => { setLoading(true); fetchFeed(); }}
            style={{
              padding: "6px 16px", fontSize: "0.8rem", borderRadius: 7,
              border: `1px solid ${ui.cardBorder}`,
              background: ui.inputBg, color: ui.textPrimary,
              cursor: "pointer", fontFamily: font,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Activity List */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredAct.map((act) => (
            <Card key={act.id} ui={ui} style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

                {/* Icon Box — emoji rendered as text, no <i> tag needed */}
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${act.statusColor}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 2, fontSize: "1.3rem",
                  }}
                >
                  {act.icon}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, minWidth: 0 }}>

                  {/* User + Action */}
                  <p style={{ margin: 0, fontSize: "0.84rem", color: ui.textPrimary, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700 }}>{act.user}</span>{" "}
                    <span style={{ color: ui.textSub }}>{act.action}</span>
                  </p>

                  {/* Drug Name */}
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: ui.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {act.target}
                  </p>

                  {/* DTN */}
                  {act.dtn && (
                    <p style={{ margin: "1px 0 0", fontSize: "0.67rem", color: ui.textMuted, fontFamily: "monospace" }}>
                      {act.dtn}
                    </p>
                  )}

                  {/* Application Status Row — inline-flex shrinks to content */}
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 10px",
                        background: ui.inputBg,
                        border: `1px solid ${ui.cardBorder}`,
                        borderRadius: 8,
                      }}
                    >
                      {/* Emoji icon from backend */}
                      {/* <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>{act.icon}</span> */}

                      <span style={{ fontSize: "0.7rem", color: ui.textMuted, flexShrink: 0, whiteSpace: "nowrap" }}>
                        Application status:
                      </span>

                      {/* Status badge — color & bg from backend */}
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: "0.68rem", fontWeight: 700,
                          padding: "2px 9px", borderRadius: 99,
                          background: act.statusBg,
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: ui.textMuted, whiteSpace: "nowrap" }}>
                    {act.time}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.67rem", color: ui.textMuted, whiteSpace: "nowrap" }}>
                    <i className="ti ti-calendar" style={{ fontSize: "0.75rem" }} aria-hidden="true" />
                    {act.createdDate || "No date"}
                  </span>
                  {act.appStep && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.67rem", color: ui.textMuted, whiteSpace: "nowrap" }}>
                      <i className="ti ti-clock" style={{ fontSize: "0.75rem" }} aria-hidden="true" />
                      {act.appStep}
                    </span>
                  )}
                </div>

              </div>
            </Card>
          ))}

          {filteredAct.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: ui.textMuted, fontSize: "0.84rem" }}>
              No activity found
            </div>
          )}

          {filteredAct.length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: ui.textMuted, textAlign: "center" }}>
              Showing {filteredAct.length} activit{filteredAct.length !== 1 ? "ies" : "y"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}