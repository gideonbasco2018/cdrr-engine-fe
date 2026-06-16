import { useState, useEffect, useCallback, useRef } from "react";
import { getDashboardGlobalAllRecentApplications } from "../../../api/dashboard";
import { getUsersTaskSummary } from "../../../api/monitoring";

// ── Animated Count-Up Hook ────────────────────────────────────
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const num =
      typeof target === "number"
        ? target
        : parseInt(String(target).replace(/,/g, ""), 10);
    if (isNaN(num) || num === 0) {
      setValue(0);
      return;
    }

    let start = null;
    const timeout = setTimeout(() => {
      const animate = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(2, -10 * progress);
        setValue(Math.round(eased * num));
        if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return value;
}

// ── Animated Number Display Component ─────────────────────────
function AnimatedNumber({
  value,
  duration = 1200,
  delay = 0,
  suffix = "",
  prefix = "",
}) {
  const num =
    typeof value === "number"
      ? value
      : parseInt(String(value).replace(/,/g, ""), 10);
  const animated = useCountUp(isNaN(num) ? 0 : num, duration, delay);
  return (
    <>
      {prefix}
      {animated.toLocaleString()}
      {suffix}
    </>
  );
}

// ── Pastel Palette ────────────────────────────────────────────
const P = {
  blue: {
    bg: "#EEF4FF",
    color: "#4A7FD4",
    border: "#C7D9F8",
    dark: { bg: "#1a2744", color: "#7BAFF5", border: "#263a5e" },
  },
  green: {
    bg: "#EDFBF3",
    color: "#3A9E6A",
    border: "#B8EDD0",
    dark: { bg: "#0f2e1a", color: "#6DD4A0", border: "#1a4a2e" },
  },
  amber: {
    bg: "#FFFBEB",
    color: "#C98A2E",
    border: "#FAE1A0",
    dark: { bg: "#2e1f00", color: "#F5C26B", border: "#4a3300" },
  },
  rose: {
    bg: "#FFF0F3",
    color: "#C95470",
    border: "#F8C4CF",
    dark: { bg: "#2e0f1a", color: "#F58FAA", border: "#4a1a28" },
  },
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

const PAGE_OPTIONS = [5, 10, 50];

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

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

function mapActivityItem(app, index) {
  const status = app.application_status || "";
  const appStep = app.app_step || "";
  const user = app.user_name || "Unknown";
  const drugName =
    app.brand_name && app.generic_name
      ? `${app.brand_name} (${app.generic_name})`
      : app.brand_name || app.generic_name || app.dtn || "—";
  const icon = app.icon || "📄";
  const statusColor = app.status_color || "#4A7FD4";
  const statusBg = app.status_bg || "#EEF4FF";
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
  return {
    id: app.log_id || app.dtn || index,
    user,
    action,
    target: drugName,
    time: relativeTime(rawDate),
    rawDate,
    icon,
    statusColor,
    statusBg,
    statusLabel,
    appStep,
    dtn: app.dtn,
  };
}

// ── Glassmorphism helpers ──────────────────────────────────────
function glassCard(darkMode, opacity = 0.6) {
  return {
    background: darkMode
      ? `rgba(36,37,38,${opacity})`
      : `rgba(255,255,255,${opacity})`,
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
    boxShadow: darkMode
      ? "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
  };
}

// ── Global keyframes ──────────────────────────────────────────
const GLOBAL_STYLES = `
@keyframes slideIn    { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeFlash  { 0% { background: rgba(74,127,212,0.08); } 100% { background: transparent; } }
@keyframes cardFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ovShimmer  { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
@keyframes ovPulseGlow { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
`;

// ── Skeleton Primitives ───────────────────────────────────────
function SkeletonBox({
  width = "100%",
  height = 12,
  radius = 5,
  darkMode,
  style: extra = {},
}) {
  const shimmerBg = darkMode
    ? "linear-gradient(90deg, rgba(58,59,60,0.5) 25%, rgba(80,81,82,0.5) 50%, rgba(58,59,60,0.5) 75%)"
    : "linear-gradient(90deg, rgba(220,228,240,0.5) 25%, rgba(243,246,252,0.7) 50%, rgba(220,228,240,0.5) 75%)";
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: shimmerBg,
        backgroundSize: "800px 100%",
        animation: "ovShimmer 1.4s infinite linear",
        flexShrink: 0,
        ...extra,
      }}
    />
  );
}

function KpiCardSkeleton({ index = 0, darkMode, p }) {
  return (
    <div
      style={{
        background: darkMode ? `${p.bg}cc` : `${p.bg}cc`,
        border: `1px solid ${p.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        animation:
          "cardFadeUp 0.4s ease both, ovPulseGlow 2s ease-in-out infinite",
        animationDelay: `${index * 80}ms`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SkeletonBox width={70} height={8} radius={4} darkMode={darkMode} />
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `${p.color}15`,
          }}
        />
      </div>
      <SkeletonBox width={80} height={20} radius={5} darkMode={darkMode} />
      <SkeletonBox width={100} height={7} radius={4} darkMode={darkMode} />
    </div>
  );
}

function UserRowSkeleton({ index = 0, darkMode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
        display: "flex",
        gap: 10,
        alignItems: "center",
        animation: "ovPulseGlow 2s ease-in-out infinite",
        animationDelay: `${index * 100}ms`,
      }}
    >
      <SkeletonBox
        width={34}
        height={34}
        radius={999}
        darkMode={darkMode}
        style={{ flexShrink: 0 }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
      >
        <SkeletonBox width="50%" height={9} radius={4} darkMode={darkMode} />
        <SkeletonBox width="30%" height={7} radius={4} darkMode={darkMode} />
        <SkeletonBox width="100%" height={4} radius={99} darkMode={darkMode} />
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <SkeletonBox width={36} height={20} radius={99} darkMode={darkMode} />
        <SkeletonBox width={36} height={20} radius={99} darkMode={darkMode} />
      </div>
    </div>
  );
}

function ActivityRowSkeleton({ index = 0, darkMode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        animation: "ovPulseGlow 2s ease-in-out infinite",
        animationDelay: `${index * 80}ms`,
      }}
    >
      <SkeletonBox
        width={30}
        height={30}
        radius={8}
        darkMode={darkMode}
        style={{ flexShrink: 0 }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}
      >
        <SkeletonBox
          width={`${55 + index * 5}%`}
          height={9}
          radius={4}
          darkMode={darkMode}
        />
        <SkeletonBox width="38%" height={7} radius={4} darkMode={darkMode} />
        <SkeletonBox
          width={68}
          height={16}
          radius={99}
          darkMode={darkMode}
          style={{ marginTop: 2 }}
        />
      </div>
      <SkeletonBox
        width={48}
        height={7}
        radius={4}
        darkMode={darkMode}
        style={{ flexShrink: 0, marginTop: 2 }}
      />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ icon, label, value, p, sub, index = 0, darkMode }) {
  return (
    <div
      style={{
        background: darkMode ? `${p.bg}cc` : `${p.bg}ee`,
        border: `1px solid ${p.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: `0 2px 10px ${p.color}12`,
        animation: "cardFadeUp 0.45s ease both",
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.6rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: p.color,
            opacity: 0.85,
          }}
        >
          {label}
        </p>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `${p.color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8rem",
          }}
        >
          {icon}
        </div>
      </div>
      <p
        style={{
          margin: "0 0 2px",
          fontSize: "1.15rem",
          fontWeight: 700,
          color: p.color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        <AnimatedNumber value={value} duration={1400} delay={index * 150} />
      </p>
      <p
        style={{ margin: 0, fontSize: "0.6rem", color: p.color, opacity: 0.55 }}
      >
        {sub}
      </p>
    </div>
  );
}

// ── Page Size Selector ────────────────────────────────────────
function PageSizeSelector({ value, onChange, darkMode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          color: darkMode ? "#65676b" : "#9CA3AF",
          whiteSpace: "nowrap",
        }}
      >
        Show
      </span>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: "0.63rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 6,
          border: `1px solid ${open ? "#4A7FD4" : darkMode ? "#4a4b4c" : "#E2E8F0"}`,
          background: open ? "#4A7FD415" : darkMode ? "#3a3b3c" : "#F3F6FC",
          color: open ? "#4A7FD4" : darkMode ? "#9CA3AF" : "#6B7280",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          lineHeight: 1.6,
          transition: "all 0.15s ease",
          userSelect: "none",
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
            minWidth: 56,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {PAGE_OPTIONS.map((opt) => {
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

// ── Unified Panel Card ────────────────────────────────────────
function PanelCard({
  title,
  onSeeAll,
  darkMode,
  pageSize,
  onPageSizeChange,
  children,
  footer,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e) => {
      const atTop = el.scrollTop === 0;
      const atBottom =
        Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) < 2;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return;
      e.stopPropagation();
    };
    el.addEventListener("wheel", handler, { passive: true });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  return (
    <div
      style={{
        ...glassCard(darkMode, 0.7),
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
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
          flexShrink: 0,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            fontWeight: 700,
            color: darkMode ? "#e4e6ea" : "#1E2A3B",
          }}
        >
          {title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PageSizeSelector
            value={pageSize}
            onChange={onPageSizeChange}
            darkMode={darkMode}
          />
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              style={{
                background: "none",
                border: "none",
                color: "#4A7FD4",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              See all
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div
        ref={ref}
        style={{
          height: 400,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          scrollbarWidth: "thin",
          scrollbarColor: darkMode
            ? "#3a3b3c transparent"
            : "#D1D9E6 transparent",
        }}
      >
        {children}
      </div>

      {/* ── Footer ── */}
      {footer && (
        <div
          style={{
            padding: "7px 14px",
            borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: "0.62rem",
              color: darkMode ? "#65676b" : "#9CA3AF",
            }}
          >
            {footer}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function OverviewView({
  ui,
  darkMode,
  tableData,
  uniqueEvaluators,
  USER_ROLE_MAP,
  ACTIVITY_FEED: staticFeed,
  DEADLINES,
  COMPLIANCE_FLAGS,
  setActiveNav,
  setModalEval,
  userDatabase = [],
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [liveFeed, setLiveFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const prevIdsRef = useRef(new Set());

  const [kpiData, setKpiData] = useState(null);
  const [kpiLoaded, setKpiLoaded] = useState(false);

  const [userLoadData, setUserLoadData] = useState([]);
  const [userLoadLoading, setUserLoadLoading] = useState(true);
  const [userLoadPageSize, setUserLoadPageSize] = useState(5);
  const [activityPageSize, setActivityPageSize] = useState(5);

  const fetchUserLoad = useCallback(async () => {
    try {
      const res = await getUsersTaskSummary();
      setUserLoadData(res?.data ?? []);
    } catch (err) {
    } finally {
      setUserLoadLoading(false);
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      setFeedError(null);
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
      const incoming = new Set(items.map((x) => x.id));
      const fresh = new Set(
        [...incoming].filter((id) => !prevIdsRef.current.has(id)),
      );
      if (fresh.size > 0 && prevIdsRef.current.size > 0) {
        setNewIds(fresh);
        setTimeout(() => setNewIds(new Set()), 1800);
      }
      prevIdsRef.current = incoming;
      setLiveFeed(items);
    } catch (err) {
      setFeedError(true);
      if (liveFeed.length === 0 && staticFeed?.length) {
        setLiveFeed(
          staticFeed.map((a, i) => ({
            id: a.id ?? i,
            user: a.user,
            action: a.action,
            target: a.target,
            time: a.time,
            rawDate: null,
            icon: a.icon,
            statusColor: "#4A7FD4",
            statusBg: "#EEF4FF",
            statusLabel: "",
            appStep: "",
            dtn: null,
          })),
        );
      }
    } finally {
      setFeedLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);
  useEffect(() => {
    fetchUserLoad();
  }, [fetchUserLoad]);
  useEffect(() => {
    const id = setInterval(fetchFeed, 30_000);
    return () => clearInterval(id);
  }, [fetchFeed]);
  useEffect(() => {
    const id = setInterval(fetchUserLoad, 30_000);
    return () => clearInterval(id);
  }, [fetchUserLoad]);

  useEffect(() => {
    axios
      .get("/monitoring/overview-summary")
      .then((r) => {
        setKpiData(r.data);
        setKpiLoaded(true);
      })
      .catch(() => {
        setKpiLoaded(true);
      });
  }, []);

  const totalAll = tableData.length;
  const approvedAll = tableData.filter((r) => r.status === "Approved").length;
  const disapprovedAll = tableData.filter(
    (r) => r.status === "Disapproved",
  ).length;
  const onProcessAll = tableData.filter(
    (r) => r.status === "On Process",
  ).length;

  const kpiPalettes = [
    darkMode ? P.blue.dark : P.blue,
    darkMode ? P.green.dark : P.green,
    darkMode ? P.amber.dark : P.amber,
    darkMode ? P.rose.dark : P.rose,
  ];

  const visibleUsers = userLoadData.slice(0, userLoadPageSize);
  const visibleActivity = liveFeed.slice(0, activityPageSize);

  const kpiItems = [
    {
      icon: "📥",
      label: "Total Applications",
      value: kpiData?.total_applications ?? totalAll,
      sub: "All years combined",
    },
    {
      icon: "✅",
      label: "CPR Released",
      value: kpiData?.cpr_released ?? approvedAll,
      sub: "Approved",
    },
    {
      icon: "⏳",
      label: "On Process",
      value: kpiData?.on_process ?? onProcessAll,
      sub: "Pending completion",
    },
    {
      icon: "❌",
      label: "LOD Released",
      value: kpiData?.lod_released ?? disapprovedAll,
      sub: "Disapproved",
    },
  ];

  const divider = `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: font,
      }}
    >
      <style>{GLOBAL_STYLES}</style>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {!kpiLoaded
          ? kpiItems.map((_, i) => (
              <KpiCardSkeleton
                key={i}
                index={i}
                darkMode={darkMode}
                p={kpiPalettes[i]}
              />
            ))
          : kpiItems.map((kpi, i) => (
              <KpiCard
                key={kpi.label}
                {...kpi}
                p={kpiPalettes[i]}
                index={i}
                darkMode={darkMode}
              />
            ))}
      </div>

      {/* ── User Load + Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* ── User Load Panel Card ── */}
        <PanelCard
          title="User Load"
          onSeeAll={() => setActiveNav("users")}
          darkMode={darkMode}
          pageSize={userLoadPageSize}
          onPageSizeChange={setUserLoadPageSize}
          footer={
            !userLoadLoading && userLoadData.length > 0
              ? `${visibleUsers.length} of ${userLoadData.length} users`
              : null
          }
        >
          {/* Skeleton */}
          {userLoadLoading &&
            userLoadData.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <UserRowSkeleton key={i} index={i} darkMode={darkMode} />
            ))}

          {/* Rows */}
          {visibleUsers.map((user, idx) => {
            const completed = user.tasks?.completed ?? 0;
            const inProgress = user.tasks?.in_progress ?? 0;
            const total = user.tasks?.total ?? 0;
            const pct = total ? Math.round((completed / total) * 100) : 0;
            const av = avatarPalette[idx % avatarPalette.length];
            const isActive = user.is_active;
            const progressColor =
              pct >= 70
                ? darkMode
                  ? P.green.dark.color
                  : P.green.color
                : darkMode
                  ? P.blue.dark.color
                  : P.blue.color;

            return (
              <div
                key={user.user_id}
                style={{
                  padding: "10px 14px",
                  borderBottom: divider,
                  flexShrink: 0,
                  animation: "cardFadeUp 0.4s ease both",
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      border: `1.5px solid ${av.color}30`,
                    }}
                  >
                    {getInitials(user.full_name || user.username)}
                  </div>

                  {/* Name + progress */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 3,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: darkMode ? "#e4e6ea" : "#1E2A3B",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {user.full_name || user.username}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.62rem",
                            color: darkMode ? "#65676b" : "#8A96A3",
                          }}
                        >
                          {user.position || user.role}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.64rem",
                            color: darkMode ? "#65676b" : "#8A96A3",
                          }}
                        >
                          <AnimatedNumber
                            value={total}
                            duration={900}
                            delay={idx * 80}
                          />{" "}
                          tasks
                        </span>
                        <span
                          style={{
                            fontSize: "0.58rem",
                            fontWeight: 700,
                            padding: "1px 7px",
                            borderRadius: 99,
                            background: isActive
                              ? darkMode
                                ? P.green.dark.bg
                                : P.green.bg
                              : darkMode
                                ? P.amber.dark.bg
                                : P.amber.bg,
                            color: isActive
                              ? darkMode
                                ? P.green.dark.color
                                : P.green.color
                              : darkMode
                                ? P.amber.dark.color
                                : P.amber.color,
                          }}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 99,
                          background: darkMode ? "#3a3b3c" : "#EDF1F7",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            borderRadius: 99,
                            background: progressColor,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "0.64rem",
                          color: progressColor,
                          fontWeight: 700,
                          flexShrink: 0,
                          minWidth: 26,
                        }}
                      >
                        <AnimatedNumber
                          value={pct}
                          duration={900}
                          delay={idx * 80}
                          suffix="%"
                        />
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 99,
                        background: darkMode ? P.green.dark.bg : P.green.bg,
                        color: darkMode ? P.green.dark.color : P.green.color,
                      }}
                    >
                      <AnimatedNumber
                        value={completed}
                        duration={800}
                        delay={idx * 80}
                      />{" "}
                      ✅
                    </span>
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 99,
                        background: darkMode ? P.amber.dark.bg : P.amber.bg,
                        color: darkMode ? P.amber.dark.color : P.amber.color,
                      }}
                    >
                      <AnimatedNumber
                        value={inProgress}
                        duration={800}
                        delay={idx * 80}
                      />{" "}
                      ⏳
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {!userLoadLoading && userLoadData.length === 0 && (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: darkMode ? "#65676b" : "#8A96A3",
                fontSize: "0.8rem",
              }}
            >
              No users found
            </div>
          )}
        </PanelCard>

        {/* ── Recent Activity Panel Card ── */}
        <PanelCard
          title="Recent Activity"
          onSeeAll={() => setActiveNav("activity")}
          darkMode={darkMode}
          pageSize={activityPageSize}
          onPageSizeChange={setActivityPageSize}
          footer={
            !feedLoading && liveFeed.length > 0
              ? `${visibleActivity.length} of ${liveFeed.length} activities`
              : null
          }
        >
          {/* Skeleton */}
          {feedLoading &&
            liveFeed.length === 0 &&
            Array.from({ length: 5 }).map((_, i) => (
              <ActivityRowSkeleton key={i} index={i} darkMode={darkMode} />
            ))}

          {/* Rows */}
          {visibleActivity.map((act, idx) => {
            const isNew = newIds.has(act.id);
            return (
              <div
                key={act.id}
                style={{
                  padding: "10px 14px",
                  borderBottom: divider,
                  flexShrink: 0,
                  animation: isNew
                    ? "slideIn 0.35s ease, fadeFlash 1.6s ease"
                    : "cardFadeUp 0.4s ease both",
                  animationDelay: isNew ? "0ms" : `${idx * 50}ms`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `${act.statusColor}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      flexShrink: 0,
                      border: `1px solid ${act.statusColor}20`,
                    }}
                  >
                    {act.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.76rem",
                        color: darkMode ? "#e4e6ea" : "#1E2A3B",
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{act.user}</span>{" "}
                      <span style={{ color: darkMode ? "#b0b3b8" : "#6B7280" }}>
                        {act.action}
                      </span>
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.66rem",
                        color: darkMode ? "#65676b" : "#8A96A3",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {act.target}
                    </p>
                    {act.statusLabel && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          fontSize: "0.58rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: act.statusBg,
                          color: act.statusColor,
                        }}
                      >
                        {act.statusLabel}
                      </span>
                    )}
                  </div>
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
                        fontSize: "0.62rem",
                        color: darkMode ? "#65676b" : "#9CA3AF",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {act.time}
                    </span>
                    {act.appStep && (
                      <span
                        style={{
                          fontSize: "0.58rem",
                          color: darkMode ? "#4a4b4c" : "#C0C8D4",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {act.appStep}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!feedLoading && liveFeed.length === 0 && (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: darkMode ? "#65676b" : "#8A96A3",
                fontSize: "0.8rem",
              }}
            >
              No recent activity found
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
