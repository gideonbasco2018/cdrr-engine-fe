import { useState, useEffect, useCallback, useRef } from "react";
import { getDashboardRecentApplications } from "../../../api/dashboard";
import axios from "../../../api/axios";

// ── Animated Count-Up Hook ────────────────────────────────────
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const num = typeof target === "number" ? target : parseInt(String(target).replace(/,/g, ""), 10);
    if (isNaN(num) || num === 0) { setValue(0); return; }

    let start = null;
    const timeout = setTimeout(() => {
      const animate = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        // easeOutExpo for snappy feel
        const eased = 1 - Math.pow(2, -10 * progress);
        setValue(Math.round(eased * num));
        if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => { clearTimeout(timeout); if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration, delay]);

  return value;
}

// ── Animated Number Display Component ─────────────────────────
function AnimatedNumber({ value, duration = 1200, delay = 0, suffix = "", prefix = "" }) {
  const num = typeof value === "number" ? value : parseInt(String(value).replace(/,/g, ""), 10);
  const animated = useCountUp(isNaN(num) ? 0 : num, duration, delay);
  return <>{prefix}{animated.toLocaleString()}{suffix}</>;
}

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

const TILE_GAP = 8;
const PAGE_OPTIONS = [5, 10, 50];

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

// ── Glassmorphism helpers ──────────────────────────────────────
function glassCard(darkMode, opacity = 0.6) {
  return {
    background: darkMode ? `rgba(36,37,38,${opacity})` : `rgba(255,255,255,${opacity})`,
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)"}`,
    boxShadow: darkMode
      ? "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
  };
}

function glassPanel(darkMode) {
  return {
    background: darkMode ? "rgba(28,29,30,0.5)" : "rgba(248,250,253,0.5)",
    backdropFilter: "blur(12px) saturate(160%)",
    WebkitBackdropFilter: "blur(12px) saturate(160%)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"}`,
    boxShadow: darkMode
      ? "0 2px 16px rgba(0,0,0,0.25)"
      : "0 2px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
  };
}

// ── Global keyframes ──────────────────────────────────────────
const GLOBAL_STYLES = `
@keyframes liveRipple { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes slideIn    { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeFlash  { 0% { background: rgba(74,127,212,0.1); } 100% { background: transparent; } }
@keyframes pulse      { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
@keyframes cardFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ovShimmer  { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
@keyframes ovPulseGlow { 0%,100% { opacity: 1; box-shadow: 0 4px 24px rgba(0,0,0,0.06); } 50% { opacity: 0.7; box-shadow: 0 2px 12px rgba(0,0,0,0.03); } }
`;

// ── Live Dot ──────────────────────────────────────────────────
function LiveDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10, flexShrink: 0 }}>
      <style>{GLOBAL_STYLES}</style>
      <span style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", background: color, opacity: 0.3, animation: "liveRipple 1.6s ease-out infinite" }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
    </span>
  );
}

// ── Glass Skeleton Primitives ─────────────────────────────────
function GlassSkeletonBox({ width = "100%", height = 14, radius = 6, darkMode, style: extra = {} }) {
  const shimmerBg = darkMode
    ? "linear-gradient(90deg, rgba(58,59,60,0.5) 25%, rgba(80,81,82,0.5) 50%, rgba(58,59,60,0.5) 75%)"
    : "linear-gradient(90deg, rgba(220,228,240,0.5) 25%, rgba(243,246,252,0.7) 50%, rgba(220,228,240,0.5) 75%)";
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: shimmerBg,
      backgroundSize: "800px 100%",
      animation: "ovShimmer 1.4s infinite linear",
      flexShrink: 0,
      ...extra,
    }} />
  );
}

function KpiCardSkeleton({ index = 0, darkMode, p }) {
  return (
    <div style={{
      ...glassCard(darkMode, 0.5),
      borderRadius: 14,
      padding: "12px 14px",
      border: `1px solid ${p.border}`,
      boxShadow: `0 4px 20px ${p.color}10, inset 0 1px 0 rgba(255,255,255,0.3)`,
      animation: "cardFadeUp 0.4s ease both, ovPulseGlow 2s ease-in-out infinite",
      animationDelay: `${index * 80}ms`,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <GlassSkeletonBox width={70} height={9} radius={4} darkMode={darkMode} />
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${p.color}15`, backdropFilter: "blur(8px)" }} />
      </div>
      <GlassSkeletonBox width={80} height={26} radius={5} darkMode={darkMode} />
      <GlassSkeletonBox width={100} height={8} radius={4} darkMode={darkMode} />
    </div>
  );
}

function UserLoadSkeletonCard({ index = 0, darkMode }) {
  return (
    <div style={{
      ...glassCard(darkMode, 0.5),
      borderRadius: 14,
      padding: "12px 14px",
      display: "flex", gap: 10, alignItems: "center",
      flexShrink: 0,
      animation: "cardFadeUp 0.35s ease both, ovPulseGlow 2.2s ease-in-out infinite",
      animationDelay: `${index * 90}ms`,
    }}>
      <GlassSkeletonBox width={38} height={38} radius={999} darkMode={darkMode} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <GlassSkeletonBox width="55%" height={10} radius={4} darkMode={darkMode} />
        <GlassSkeletonBox width="35%" height={8} radius={4} darkMode={darkMode} />
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          <GlassSkeletonBox width="100%" height={5} radius={99} darkMode={darkMode} />
          <GlassSkeletonBox width={28} height={9} radius={4} darkMode={darkMode} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <GlassSkeletonBox width={40} height={22} radius={99} darkMode={darkMode} />
        <GlassSkeletonBox width={40} height={22} radius={99} darkMode={darkMode} />
      </div>
    </div>
  );
}

function ActivitySkeletonCard({ index = 0, darkMode }) {
  return (
    <div style={{
      ...glassCard(darkMode, 0.5),
      borderRadius: 14,
      padding: "12px 14px",
      display: "flex", gap: 10, alignItems: "flex-start",
      flexShrink: 0,
      animation: "cardFadeUp 0.35s ease both, ovPulseGlow 2.2s ease-in-out infinite",
      animationDelay: `${index * 70}ms`,
    }}>
      <GlassSkeletonBox width={34} height={34} radius={10} darkMode={darkMode} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <GlassSkeletonBox width={`${60 + index * 5}%`} height={10} radius={4} darkMode={darkMode} />
        <GlassSkeletonBox width="40%" height={8} radius={4} darkMode={darkMode} />
        <GlassSkeletonBox width={80} height={18} radius={99} darkMode={darkMode} style={{ marginTop: 3 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        <GlassSkeletonBox width={55} height={8} radius={4} darkMode={darkMode} />
        <GlassSkeletonBox width={45} height={7} radius={4} darkMode={darkMode} />
      </div>
    </div>
  );
}

// ── KPI Card — with progressive number animation ──────────────
function KpiCard({ icon, label, value, p, sub, index = 0, darkMode }) {
  return (
    <div style={{
      background: darkMode ? `${p.bg}cc` : `${p.bg}cc`,
      backdropFilter: "blur(16px) saturate(180%)",
      WebkitBackdropFilter: "blur(16px) saturate(180%)",
      border: `1px solid ${p.border}`,
      borderRadius: 14,
      padding: "12px 14px",
      boxShadow: `0 4px 20px ${p.color}18, inset 0 1px 0 rgba(255,255,255,0.4)`,
      animation: "cardFadeUp 0.45s ease both",
      animationDelay: `${index * 80}ms`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: p.color, opacity: 0.85 }}>{label}</p>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${p.color}22`, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>{icon}</div>
      </div>
      <p style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 800, color: p.color, lineHeight: 1, letterSpacing: "-0.03em" }}>
        <AnimatedNumber value={value} duration={1400} delay={index * 150} />
      </p>
      <p style={{ margin: 0, fontSize: "0.65rem", color: p.color, opacity: 0.6 }}>{sub}</p>
    </div>
  );
}

// ── Soft Card — staggered fade-up ─────────────────────────────
function Card({ children, style = {}, onClick, darkMode, animIndex = 0 }) {
  return (
    <div onClick={onClick} style={{
      ...glassCard(darkMode, 0.6),
      borderRadius: 14,
      overflow: "hidden",
      animation: "cardFadeUp 0.4s ease both",
      animationDelay: `${animIndex * 60}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Page Size Selector ────────────────────────────────────────
function PageSizeSelector({ value, onChange, darkMode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: "0.63rem", color: darkMode ? "#65676b" : "#9CA3AF", whiteSpace: "nowrap" }}>Show</span>
      <button onClick={() => setOpen((o) => !o)} style={{ fontSize: "0.63rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6, border: `1px solid ${open ? "#4A7FD4" : (darkMode ? "#4a4b4c" : "#E2E8F0")}`, background: open ? "#4A7FD415" : (darkMode ? "#3a3b3c" : "#F3F6FC"), color: open ? "#4A7FD4" : (darkMode ? "#9CA3AF" : "#6B7280"), cursor: "pointer", display: "flex", alignItems: "center", gap: 4, lineHeight: 1.6, transition: "all 0.15s ease", userSelect: "none" }}>
        <span style={{ fontWeight: 800 }}>{value}</span>
        <span style={{ fontSize: "0.5rem", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease", lineHeight: 1 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, ...glassCard(darkMode, 0.85), borderRadius: 8, overflow: "hidden", zIndex: 100, minWidth: 56 }}>
          {PAGE_OPTIONS.map((opt) => {
            const active = value === opt;
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ display: "block", width: "100%", padding: "6px 14px", fontSize: "0.72rem", fontWeight: 800, textAlign: "center", border: "none", background: active ? (darkMode ? "#1a2744" : "#EEF4FF") : "transparent", color: active ? "#4A7FD4" : (darkMode ? "#b0b3b8" : "#374151"), cursor: "pointer", transition: "background 0.1s ease" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = darkMode ? "#3a3b3c" : "#F3F6FC"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────
function SectionHeader({ title, liveColor, liveBg, error, lastUpdated, onRefresh, onSeeAll, darkMode, pageSize, onPageSizeChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: darkMode ? "#e4e6ea" : "#1E2A3B" }}>{title}</p>
        {!error ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, background: liveBg, border: `1px solid ${liveColor}30` }}>
            <LiveDot color={liveColor} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: liveColor, letterSpacing: "0.05em" }}>LIVE</span>
          </div>
        ) : (
          <span style={{ fontSize: "0.63rem", color: "#C98A2E", padding: "2px 8px", borderRadius: 99, background: "#FFFBEB", border: "1px solid #C98A2E30" }}>⚠ offline</span>
        )}
        {lastUpdated && (<span style={{ fontSize: "0.63rem", color: darkMode ? "#65676b" : "#9CA3AF" }}>{lastUpdated.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</span>)}
        <button onClick={(e) => { e.stopPropagation(); onRefresh(); }} title="Refresh" style={{ background: darkMode ? "#3a3b3c" : "#F3F6FC", border: `1px solid ${darkMode ? "#4a4b4c" : "#E2E8F0"}`, borderRadius: 8, color: darkMode ? "#9CA3AF" : "#6B7280", cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", padding: 0, flexShrink: 0 }}>↻</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PageSizeSelector value={pageSize} onChange={onPageSizeChange} darkMode={darkMode} />
        {onSeeAll && (<button onClick={onSeeAll} style={{ background: "none", border: "none", color: "#4A7FD4", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>See all</button>)}
      </div>
    </div>
  );
}

// ── Scrollable Panel ──────────────────────────────────────────
function ScrollablePanel({ children, darkMode }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e) => {
      const atTop = el.scrollTop === 0;
      const atBottom = Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) < 2;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return;
      e.stopPropagation();
    };
    el.addEventListener("wheel", handler, { passive: true });
    return () => el.removeEventListener("wheel", handler);
  }, []);
  return (
    <div ref={ref} style={{ height: 500, overflowY: "scroll", ...glassPanel(darkMode), borderRadius: 14, padding: "10px", display: "flex", flexDirection: "column", gap: TILE_GAP, boxSizing: "border-box", scrollbarWidth: "thin", scrollbarColor: darkMode ? "#4a4b4c #1c1d1e" : "#D1D9E6 #F8FAFD" }}>
      {children}
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
  const [kpiLoaded, setKpiLoaded] = useState(false);

  const [userLoadData, setUserLoadData] = useState([]);
  const [userLoadLoading, setUserLoadLoading] = useState(true);
  const [userLoadError, setUserLoadError] = useState(null);
  const [userLoadLastUpdated, setUserLoadLastUpdated] = useState(null);
  const [userLoadPageSize, setUserLoadPageSize] = useState(5);
  const [activityPageSize, setActivityPageSize] = useState(5);

  const fetchUserLoad = useCallback(async () => {
    try {
      setUserLoadError(null);
      const res = await axios.get("/monitoring/users-tasks");
      setUserLoadData(res.data?.data ?? []);
      setUserLoadLastUpdated(new Date());
    } catch (err) { setUserLoadError(true); }
    finally { setUserLoadLoading(false); }
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
    axios.get("/monitoring/overview-summary").then((r) => { setKpiData(r.data); setKpiLoaded(true); }).catch(() => { setKpiLoaded(true); });
  }, []);

  const totalAll       = tableData.length;
  const approvedAll    = tableData.filter((r) => r.status === "Approved").length;
  const disapprovedAll = tableData.filter((r) => r.status === "Disapproved").length;
  const onProcessAll   = tableData.filter((r) => r.status === "On Process").length;

  const kpiPalettes = [
    darkMode ? P.blue.dark  : P.blue,
    darkMode ? P.green.dark : P.green,
    darkMode ? P.amber.dark : P.amber,
    darkMode ? P.rose.dark  : P.rose,
  ];

  const liveGreen   = darkMode ? "#6DD4A0" : "#3A9E6A";
  const liveBgGreen = darkMode ? "#0f2e1a" : "#EDFBF3";

  const visibleUsers    = userLoadData.slice(0, userLoadPageSize);
  const visibleActivity = liveFeed.slice(0, activityPageSize);

  const kpiItems = [
    { icon: "📥", label: "Total Applications", value: kpiData?.total_applications ?? totalAll, sub: "All years combined" },
    { icon: "✅", label: "CPR Released", value: kpiData?.cpr_released ?? approvedAll, sub: "Approved" },
    { icon: "⏳", label: "On Process", value: kpiData?.on_process ?? onProcessAll, sub: "Pending completion" },
    { icon: "❌", label: "LOD Released", value: kpiData?.lod_released ?? disapprovedAll, sub: "Disapproved" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15, fontFamily: font }}>
      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {!kpiLoaded ? (
          kpiItems.map((_, i) => (
            <KpiCardSkeleton key={i} index={i} darkMode={darkMode} p={kpiPalettes[i]} />
          ))
        ) : (
          kpiItems.map((kpi, i) => (
            <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} sub={kpi.sub} p={kpiPalettes[i]} index={i} darkMode={darkMode} />
          ))
        )}
      </div>

      {/* ── User Load + Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* ── User Load ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionHeader title="User Load" liveColor={liveGreen} liveBg={liveBgGreen} error={userLoadError} lastUpdated={userLoadLastUpdated} onRefresh={() => { setUserLoadLoading(true); fetchUserLoad(); }} onSeeAll={() => setActiveNav("users")} darkMode={darkMode} pageSize={userLoadPageSize} onPageSizeChange={setUserLoadPageSize} />
          <ScrollablePanel darkMode={darkMode}>
            {/* Skeleton */}
            {userLoadLoading && userLoadData.length === 0 && Array.from({ length: 3 }).map((_, i) => (
              <UserLoadSkeletonCard key={i} index={i} darkMode={darkMode} />
            ))}

            {/* Live user cards */}
            {visibleUsers.map((user, idx) => {
              const completed  = user.tasks?.completed  ?? 0;
              const inProgress = user.tasks?.in_progress ?? 0;
              const total      = user.tasks?.total       ?? 0;
              const pct        = total ? Math.round((completed / total) * 100) : 0;
              const av         = avatarPalette[idx % avatarPalette.length];
              const isActive   = user.is_active;
              const progressP  = pct >= 70 ? (darkMode ? P.green.dark : P.green) : (darkMode ? P.blue.dark : P.blue);
              return (
                <Card key={user.user_id} darkMode={darkMode} style={{ padding: "12px 14px", flexShrink: 0 }} animIndex={idx}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0, border: `2px solid ${av.color}30` }}>
                      {getInitials(user.full_name || user.username)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: darkMode ? "#e4e6ea" : "#1E2A3B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.full_name || user.username}</p>
                          <p style={{ margin: 0, fontSize: "0.66rem", color: darkMode ? "#65676b" : "#8A96A3" }}>{user.position || user.role}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 800, color: darkMode ? "#65676b" : "#8A96A3" }}>
                            <AnimatedNumber value={total} duration={1000} delay={idx * 100} /> tasks
                          </span>
                          <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: isActive ? (darkMode ? P.green.dark.bg : P.green.bg) : (darkMode ? P.amber.dark.bg : P.amber.bg), color: isActive ? (darkMode ? P.green.dark.color : P.green.color) : (darkMode ? P.amber.dark.color : P.amber.color), border: `1px solid ${isActive ? (darkMode ? P.green.dark.border : P.green.border) : (darkMode ? P.amber.dark.border : P.amber.border)}` }}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 99, background: darkMode ? "#3a3b3c" : "#EDF1F7", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: progressP.color, transition: "width 0.5s ease" }} />
                        </div>
                        <span style={{ fontSize: "0.68rem", color: progressP.color, fontWeight: 800, flexShrink: 0, minWidth: 28 }}>
                          <AnimatedNumber value={pct} duration={1000} delay={idx * 100} suffix="%" />
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: "0.66rem", fontWeight: 800, padding: "3px 7px", borderRadius: 99, background: darkMode ? P.green.dark.bg : P.green.bg, color: darkMode ? P.green.dark.color : P.green.color, border: `1px solid ${darkMode ? P.green.dark.border : P.green.border}` }}>
                        <AnimatedNumber value={completed} duration={900} delay={idx * 100} /> ✅
                      </span>
                      <span style={{ fontSize: "0.66rem", fontWeight: 800, padding: "3px 7px", borderRadius: 99, background: darkMode ? P.amber.dark.bg : P.amber.bg, color: darkMode ? P.amber.dark.color : P.amber.color, border: `1px solid ${darkMode ? P.amber.dark.border : P.amber.border}` }}>
                        <AnimatedNumber value={inProgress} duration={900} delay={idx * 100} /> ⏳
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Empty state */}
            {!userLoadLoading && userLoadData.length === 0 && (
              <div style={{ padding: "28px", textAlign: "center", color: darkMode ? "#65676b" : "#8A96A3", fontSize: "0.82rem", ...glassCard(darkMode, 0.4), borderRadius: 14 }}>No users found</div>
            )}
          </ScrollablePanel>
          {!userLoadLoading && userLoadData.length > 0 && (
            <p style={{ margin: 0, fontSize: "0.65rem", color: darkMode ? "#65676b" : "#9CA3AF", textAlign: "right" }}>Showing <strong>{visibleUsers.length}</strong> of <strong>{userLoadData.length}</strong> users</p>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionHeader title="Recent Activity" liveColor={liveGreen} liveBg={liveBgGreen} error={feedError} lastUpdated={lastUpdated} onRefresh={() => { setFeedLoading(true); fetchFeed(); }} onSeeAll={() => setActiveNav("activity")} darkMode={darkMode} pageSize={activityPageSize} onPageSizeChange={setActivityPageSize} />
          <ScrollablePanel darkMode={darkMode}>
            {/* Skeleton */}
            {feedLoading && liveFeed.length === 0 && Array.from({ length: 5 }).map((_, i) => (
              <ActivitySkeletonCard key={i} index={i} darkMode={darkMode} />
            ))}

            {/* Live feed */}
            {visibleActivity.map((act, idx) => {
              const isNew = newIds.has(act.id);
              return (
                <div key={act.id} style={{ ...glassCard(darkMode, 0.6), borderRadius: 14, padding: "12px 14px", flexShrink: 0, animation: isNew ? "slideIn 0.35s ease, fadeFlash 1.6s ease" : "cardFadeUp 0.4s ease both", animationDelay: isNew ? "0ms" : `${idx * 60}ms` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${act.statusColor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0, border: `1px solid ${act.statusColor}25` }}>{act.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: darkMode ? "#e4e6ea" : "#1E2A3B", lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600 }}>{act.user}</span>{" "}
                        <span style={{ color: darkMode ? "#b0b3b8" : "#6B7280" }}>{act.action}</span>
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: darkMode ? "#65676b" : "#8A96A3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{act.target}</p>
                      {act.statusLabel && (
                        <span style={{ display: "inline-block", marginTop: 5, fontSize: "0.62rem", fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: act.statusBg, color: act.statusColor, border: `1px solid ${act.statusColor}25` }}>{act.statusLabel}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: "0.65rem", color: darkMode ? "#65676b" : "#9CA3AF", whiteSpace: "nowrap" }}>{act.time}</span>
                      {act.appStep && (<span style={{ fontSize: "0.6rem", color: darkMode ? "#65676b" : "#B0B8C4", whiteSpace: "nowrap" }}>{act.appStep}</span>)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {!feedLoading && liveFeed.length === 0 && (
              <div style={{ padding: "28px", textAlign: "center", color: darkMode ? "#65676b" : "#8A96A3", fontSize: "0.82rem", ...glassCard(darkMode, 0.4), borderRadius: 14 }}>No recent activity found</div>
            )}
          </ScrollablePanel>
          {!feedLoading && liveFeed.length > 0 && (
            <p style={{ margin: 0, fontSize: "0.65rem", color: darkMode ? "#65676b" : "#9CA3AF", textAlign: "right" }}>Showing <strong>{visibleActivity.length}</strong> of <strong>{liveFeed.length}</strong> activities</p>
          )}
        </div>
      </div>
    </div>
  );
}
