// src/components/monitoring/overview/OverviewView.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { getDashboardRecentApplications } from "../../../api/dashboard";
import axios from "../../../api/axios";

// ── Pastel Palette ────────────────────────────────────────────
const P = {
  blue:   { bg: "#EEF4FF", color: "#4A7FD4", border: "#C7D9F8", dark: { bg: "#1a2744", color: "#7BAFF5", border: "#263a5e" } },
  green:  { bg: "#EDFBF3", color: "#3A9E6A", border: "#B8EDD0", dark: { bg: "#0f2e1a", color: "#6DD4A0", border: "#1a4a2e" } },
  amber:  { bg: "#FFFBEB", color: "#C98A2E", border: "#FAE1A0", dark: { bg: "#2e1f00", color: "#F5C26B", border: "#4a3300" } },
  rose:   { bg: "#FFF0F3", color: "#C95470", border: "#F8C4CF", dark: { bg: "#2e0f1a", color: "#F58FAA", border: "#4a1a28" } },
  teal:   { bg: "#EDFAFA", color: "#2A95AA", border: "#B0E5EE", dark: { bg: "#0a2530", color: "#6DD4E8", border: "#1a3a45" } },
  purple: { bg: "#F5F0FF", color: "#7356BF", border: "#D4C2F5", dark: { bg: "#1e1a2e", color: "#A98DF5", border: "#322a4a" } },
};

const avatarPalette = [
  { bg: "#EEF4FF", color: "#4A7FD4" },
  { bg: "#FFF0F3", color: "#C95470" },
  { bg: "#EDFBF3", color: "#3A9E6A" },
  { bg: "#FFFBEB", color: "#C98A2E" },
  { bg: "#F5F0FF", color: "#7356BF" },
  { bg: "#EDFAFA", color: "#2A95AA" },
  { bg: "#FFF5EB", color: "#C4622D" },
  { bg: "#F0FFF4", color: "#276749" },
];

function getInitials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}

function relativeTime(dateStr) {
  if (!dateStr) return "recently";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function mapActivityItem(app, index) {
  const status = app.application_status || "";
  const appStep = app.app_step || "";
  const user = app.user_name || "Unknown";
  const drugName = app.brand_name && app.generic_name
    ? `${app.brand_name} (${app.generic_name})`
    : app.brand_name || app.generic_name || app.dtn || "—";
  const icon = app.icon || "📄";
  const statusColor = app.status_color || "#4A7FD4";
  const statusBg = app.status_bg || "#EEF4FF";
  const statusLabel = app.status_label || status || "Unknown";
  const actionMap = {
    Approved: "approved application", Disapproved: "disapproved application",
    Completed: "completed application", "In Progress": "updated application",
    "For Evaluation": "started evaluation", "For Compliance": "flagged for compliance",
    "For Checking": "submitted for checking", "For QA": "submitted for QA",
    "For Releasing": "released document",
  };
  const action = actionMap[statusLabel] || actionMap[appStep] || "updated application";
  const rawDate = app.end_date || app.created_at || app.start_date || null;
  return { id: app.log_id || app.dtn || index, user, action, target: drugName, time: relativeTime(rawDate), rawDate, icon, statusColor, statusBg, statusLabel, appStep, dtn: app.dtn };
}

// ── Live Dot ──────────────────────────────────────────────────
function LiveDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", background: color, opacity: 0.3, animation: "liveRipple 1.6s ease-out infinite" }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <style>{`
        @keyframes liveRipple { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeFlash { 0% { background: rgba(74,127,212,0.1); } 100% { background: transparent; } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ icon, label, value, p, sub }) {
  return (
    <div style={{
      background: p.bg, border: `1px solid ${p.border}`,
      borderRadius: 16, padding: "18px 20px",
      boxShadow: `0 2px 12px ${p.color}15`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: p.color, opacity: 0.75 }}>{label}</p>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${p.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{icon}</div>
      </div>
      <p style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: p.color, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</p>
      <p style={{ margin: 0, fontSize: "0.7rem", color: p.color, opacity: 0.6 }}>{sub}</p>
    </div>
  );
}

// ── Soft Card ─────────────────────────────────────────────────
function Card({ children, style = {}, onClick, darkMode }) {
  return (
    <div onClick={onClick} style={{
      background: darkMode ? "#242526" : "#FFFFFF",
      border: `1px solid ${darkMode ? "#3a3b3c" : "#EDF1F7"}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: darkMode ? "none" : "0 2px 10px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────
function SectionHeader({ title, liveColor, liveBg, error, lastUpdated, onRefresh, onSeeAll, darkMode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: darkMode ? "#e4e6ea" : "#1E2A3B" }}>{title}</p>
        {!error ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, background: liveBg, border: `1px solid ${liveColor}30` }}>
            <LiveDot color={liveColor} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: liveColor, letterSpacing: "0.05em" }}>LIVE</span>
          </div>
        ) : (
          <span style={{ fontSize: "0.63rem", color: "#C98A2E", padding: "2px 8px", borderRadius: 99, background: "#FFFBEB", border: "1px solid #C98A2E30" }}>⚠ offline</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {lastUpdated && (
          <span style={{ fontSize: "0.63rem", color: darkMode ? "#65676b" : "#9CA3AF" }}>
            {lastUpdated.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onRefresh(); }} title="Refresh" style={{
          background: darkMode ? "#3a3b3c" : "#F3F6FC",
          border: `1px solid ${darkMode ? "#4a4b4c" : "#E2E8F0"}`,
          borderRadius: 8, color: darkMode ? "#9CA3AF" : "#6B7280",
          cursor: "pointer", width: 28, height: 28,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", padding: 0, flexShrink: 0,
        }}>↻</button>
        {onSeeAll && (
          <button onClick={onSeeAll} style={{ background: "none", border: "none", color: "#4A7FD4", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>See all</button>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function OverviewView({
  ui, darkMode,
  tableData, uniqueEvaluators,
  USER_ROLE_MAP,
  ACTIVITY_FEED: staticFeed,
  DEADLINES, COMPLIANCE_FLAGS,
  setActiveNav, setModalEval,
  userDatabase = [],
}) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [liveFeed, setLiveFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const prevIdsRef = useRef(new Set());

  const [kpiData, setKpiData] = useState(null);
  const [userLoadData, setUserLoadData] = useState([]);
  const [userLoadLoading, setUserLoadLoading] = useState(true);
  const [userLoadError, setUserLoadError] = useState(null);
  const [userLoadLastUpdated, setUserLoadLastUpdated] = useState(null);

  const fetchUserLoad = useCallback(async () => {
    try {
      setUserLoadError(null);
      const res = await axios.get("/monitoring/users-tasks");
      setUserLoadData(res.data?.data ?? []);
      setUserLoadLastUpdated(new Date());
    } catch (err) {
      setUserLoadError(true);
    } finally { setUserLoadLoading(false); }
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      setFeedError(null);
      const data = await getDashboardRecentApplications();
      const raw = Array.isArray(data?.rows) ? data.rows : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const items = raw.map((app, i) => mapActivityItem(app, i));
      items.sort((a, b) => { if (!a.rawDate) return 1; if (!b.rawDate) return -1; return new Date(b.rawDate) - new Date(a.rawDate); });
      const incoming = new Set(items.map((x) => x.id));
      const fresh = new Set([...incoming].filter((id) => !prevIdsRef.current.has(id)));
      if (fresh.size > 0 && prevIdsRef.current.size > 0) { setNewIds(fresh); setTimeout(() => setNewIds(new Set()), 1800); }
      prevIdsRef.current = incoming;
      setLiveFeed(items);
      setLastUpdated(new Date());
    } catch (err) {
      setFeedError(true);
      if (liveFeed.length === 0 && staticFeed?.length) {
        setLiveFeed(staticFeed.map((a, i) => ({ id: a.id ?? i, user: a.user, action: a.action, target: a.target, time: a.time, rawDate: null, icon: a.icon, statusColor: "#4A7FD4", statusBg: "#EEF4FF", statusLabel: "", appStep: "", dtn: null })));
      }
    } finally { setFeedLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetchFeed(); }, [fetchFeed]);
  useEffect(() => { fetchUserLoad(); }, [fetchUserLoad]);
  useEffect(() => { const id = setInterval(fetchFeed, 30_000); return () => clearInterval(id); }, [fetchFeed]);
  useEffect(() => { const id = setInterval(fetchUserLoad, 30_000); return () => clearInterval(id); }, [fetchUserLoad]);
  useEffect(() => {
    axios.get("/monitoring/overview-summary")
      .then((r) => setKpiData(r.data))
      .catch((err) => console.error("KPI fetch error:", err));
  }, []);

  const totalAll = tableData.length;
  const approvedAll = tableData.filter((r) => r.status === "Approved").length;
  const disapprovedAll = tableData.filter((r) => r.status === "Disapproved").length;
  const onProcessAll = tableData.filter((r) => r.status === "On Process").length;
  const approvalRateAll = totalAll ? ((approvedAll / totalAll) * 100).toFixed(1) : "0.0";

  // Pastel colors — light or dark mode
  const kpiPalettes = [
    darkMode ? P.blue.dark   : P.blue,
    darkMode ? P.green.dark  : P.green,
    darkMode ? P.amber.dark  : P.amber,
    darkMode ? P.rose.dark   : P.rose,
  ];

  const liveGreen  = darkMode ? "#6DD4A0" : "#3A9E6A";
  const liveBgGreen = darkMode ? "#0f2e1a" : "#EDFBF3";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15, fontFamily: font }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { icon: "📥", label: "Total Applications", value: (kpiData?.total_applications ?? totalAll).toLocaleString(), sub: "All years combined" },
          { icon: "✅", label: "CPR Released",        value: (kpiData?.cpr_released ?? approvedAll).toLocaleString(),    sub: `${approvalRateAll}% approval rate` },
          { icon: "⏳", label: "On Process",          value: (kpiData?.on_process ?? onProcessAll).toLocaleString(),     sub: "Pending completion" },
          { icon: "❌", label: "LOD Released",        value: (kpiData?.lod_released ?? disapprovedAll).toLocaleString(), sub: "Requires review" },
        ].map((kpi, i) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} sub={kpi.sub} p={kpiPalettes[i]} />
        ))}
      </div>

      {/* ── User Load + Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* ── User Load ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionHeader
            title="User Load"
            liveColor={liveGreen} liveBg={liveBgGreen}
            error={userLoadError}
            lastUpdated={userLoadLastUpdated}
            onRefresh={() => { setUserLoadLoading(true); fetchUserLoad(); }}
            onSeeAll={() => setActiveNav("users")}
            darkMode={darkMode}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Skeleton */}
            {userLoadLoading && userLoadData.length === 0 && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: darkMode ? "#242526" : "#FFFFFF", border: `1px solid ${darkMode ? "#3a3b3c" : "#EDF1F7"}`, borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", opacity: 1 - i * 0.2 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: darkMode ? "#3a3b3c" : "#F3F6FC", flexShrink: 0, animation: "pulse 1.4s ease-in-out infinite" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 9, borderRadius: 4, background: darkMode ? "#3a3b3c" : "#F3F6FC", width: "55%", animation: "pulse 1.4s ease-in-out infinite" }} />
                  <div style={{ height: 7, borderRadius: 4, background: darkMode ? "#3a3b3c" : "#F3F6FC", width: "35%", animation: "pulse 1.4s ease-in-out infinite" }} />
                </div>
              </div>
            ))}

            {/* Live user cards */}
            {userLoadData.map((user, idx) => {
              const completed  = user.tasks?.completed ?? 0;
              const inProgress = user.tasks?.in_progress ?? 0;
              const total      = user.tasks?.total ?? 0;
              const pct = total ? Math.round((completed / total) * 100) : 0;
              const av = avatarPalette[idx % avatarPalette.length];
              const isActive = user.is_active;
              const progressP = pct >= 70 ? (darkMode ? P.green.dark : P.green) : (darkMode ? P.blue.dark : P.blue);

              return (
                <Card key={user.user_id} darkMode={darkMode} style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Avatar */}
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0, border: `2px solid ${av.color}30` }}>
                      {getInitials(user.full_name || user.username)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: darkMode ? "#e4e6ea" : "#1E2A3B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {user.full_name || user.username}
                          </p>
                          <p style={{ margin: 0, fontSize: "0.66rem", color: darkMode ? "#65676b" : "#8A96A3" }}>
                            {user.position || user.role}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          <span style={{ fontSize: "0.7rem", color: darkMode ? "#65676b" : "#8A96A3" }}>{total} tasks</span>
                          <span style={{
                            fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                            background: isActive ? (darkMode ? P.green.dark.bg : P.green.bg) : (darkMode ? P.amber.dark.bg : P.amber.bg),
                            color: isActive ? (darkMode ? P.green.dark.color : P.green.color) : (darkMode ? P.amber.dark.color : P.amber.color),
                            border: `1px solid ${isActive ? (darkMode ? P.green.dark.border : P.green.border) : (darkMode ? P.amber.dark.border : P.amber.border)}`,
                          }}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 99, background: darkMode ? "#3a3b3c" : "#EDF1F7", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: progressP.color, transition: "width 0.5s ease" }} />
                        </div>
                        <span style={{ fontSize: "0.68rem", color: progressP.color, fontWeight: 600, flexShrink: 0, minWidth: 28 }}>{pct}%</span>
                      </div>
                    </div>

                    {/* Task badges */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: "0.66rem", fontWeight: 600, padding: "3px 7px", borderRadius: 99, background: darkMode ? P.green.dark.bg : P.green.bg, color: darkMode ? P.green.dark.color : P.green.color, border: `1px solid ${darkMode ? P.green.dark.border : P.green.border}` }}>
                        {completed} ✅
                      </span>
                      <span style={{ fontSize: "0.66rem", fontWeight: 600, padding: "3px 7px", borderRadius: 99, background: darkMode ? P.amber.dark.bg : P.amber.bg, color: darkMode ? P.amber.dark.color : P.amber.color, border: `1px solid ${darkMode ? P.amber.dark.border : P.amber.border}` }}>
                        {inProgress} ⏳
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}

            {!userLoadLoading && userLoadData.length === 0 && (
              <div style={{ padding: "28px", textAlign: "center", color: darkMode ? "#65676b" : "#8A96A3", fontSize: "0.82rem", background: darkMode ? "#242526" : "#FAFBFE", border: `1px solid ${darkMode ? "#3a3b3c" : "#EDF1F7"}`, borderRadius: 14 }}>
                No users found
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionHeader
            title="Recent Activity"
            liveColor={liveGreen} liveBg={liveBgGreen}
            error={feedError}
            lastUpdated={lastUpdated}
            onRefresh={() => { setFeedLoading(true); fetchFeed(); }}
            onSeeAll={() => setActiveNav("activity")}
            darkMode={darkMode}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Skeleton */}
            {feedLoading && liveFeed.length === 0 && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: darkMode ? "#242526" : "#FFFFFF", border: `1px solid ${darkMode ? "#3a3b3c" : "#EDF1F7"}`, borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", opacity: 1 - i * 0.15 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: darkMode ? "#3a3b3c" : "#F3F6FC", flexShrink: 0, animation: "pulse 1.4s ease-in-out infinite" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ height: 9, borderRadius: 4, background: darkMode ? "#3a3b3c" : "#F3F6FC", width: `${60 + i * 6}%`, animation: "pulse 1.4s ease-in-out infinite" }} />
                  <div style={{ height: 7, borderRadius: 4, background: darkMode ? "#3a3b3c" : "#F3F6FC", width: "40%", animation: "pulse 1.4s ease-in-out infinite" }} />
                </div>
              </div>
            ))}

            {/* Live feed */}
            {liveFeed.slice(0, 6).map((act) => {
              const isNew = newIds.has(act.id);
              return (
                <div key={act.id} style={{
                  background: darkMode ? "#242526" : "#FFFFFF",
                  border: `1px solid ${darkMode ? "#3a3b3c" : "#EDF1F7"}`,
                  borderRadius: 14, padding: "12px 14px",
                  boxShadow: darkMode ? "none" : "0 2px 8px rgba(0,0,0,0.03)",
                  animation: isNew ? "slideIn 0.35s ease, fadeFlash 1.6s ease" : undefined,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {/* Icon */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: `${act.statusColor}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.9rem", flexShrink: 0,
                      border: `1px solid ${act.statusColor}25`,
                    }}>
                      {act.icon}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: darkMode ? "#e4e6ea" : "#1E2A3B", lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600 }}>{act.user}</span>{" "}
                        <span style={{ color: darkMode ? "#b0b3b8" : "#6B7280" }}>{act.action}</span>
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: darkMode ? "#65676b" : "#8A96A3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {act.target}
                      </p>
                      {act.statusLabel && (
                        <span style={{
                          display: "inline-block", marginTop: 5,
                          fontSize: "0.62rem", fontWeight: 700,
                          padding: "2px 9px", borderRadius: 99,
                          background: act.statusBg, color: act.statusColor,
                          border: `1px solid ${act.statusColor}25`,
                        }}>
                          {act.statusLabel}
                        </span>
                      )}
                    </div>

                    {/* Time */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: "0.65rem", color: darkMode ? "#65676b" : "#9CA3AF", whiteSpace: "nowrap" }}>{act.time}</span>
                      {act.appStep && <span style={{ fontSize: "0.6rem", color: darkMode ? "#65676b" : "#B0B8C4", whiteSpace: "nowrap" }}>{act.appStep}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty */}
            {!feedLoading && liveFeed.length === 0 && (
              <div style={{ padding: "28px", textAlign: "center", color: darkMode ? "#65676b" : "#8A96A3", fontSize: "0.82rem", background: darkMode ? "#242526" : "#FAFBFE", border: `1px solid ${darkMode ? "#3a3b3c" : "#EDF1F7"}`, borderRadius: 14 }}>
                No recent activity found
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}