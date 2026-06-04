// src/components/monitoring/analytics/AnalyticsView.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAnalyticsAvailableYears,
  getAnalyticsSummary,
  getAnalyticsTrend,
  getAnalyticsByClassification,
  getAnalyticsYearSummary,
  getAnalyticsTopDrugs,
  getAnalyticsTopCountries,
  getDocTypeReleased,
} from "../../../api/analytics";

const FB = "#1877F2";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ENTITY_TYPES = [
  { key: "mfr", label: "Manufacturer", icon: "🏭", color: "#1877F2" },
  { key: "trader", label: "Trader", icon: "🤝", color: "#9333ea" },
  { key: "importer", label: "Importer", icon: "🚢", color: "#0891b2" },
  { key: "distributor", label: "Distributor", icon: "🚚", color: "#f59e0b" },
  { key: "repacker", label: "Repacker", icon: "📦", color: "#36a420" },
];

const COUNTRY_FLAGS = {
  India: "🇮🇳",
  China: "🇨🇳",
  USA: "🇺🇸",
  Germany: "🇩🇪",
  Switzerland: "🇨🇭",
  "South Korea": "🇰🇷",
  Japan: "🇯🇵",
  UK: "🇬🇧",
  France: "🇫🇷",
  Philippines: "🇵🇭",
  Singapore: "🇸🇬",
  Belgium: "🇧🇪",
  Netherlands: "🇳🇱",
  Italy: "🇮🇹",
  Canada: "🇨🇦",
  "Hong Kong": "🇭🇰",
  Thailand: "🇹🇭",
  Malaysia: "🇲🇾",
  Indonesia: "🇮🇩",
  Australia: "🇦🇺",
  Vietnam: "🇻🇳",
};

// ── Neumorphic helpers ────────────────────────────────────────
function neuShadow(darkMode, raised = true) {
  if (darkMode) {
    return raised
      ? "2px 2px 5px rgba(0,0,0,0.2), -1px -1px 4px rgba(60,60,80,0.08)"
      : "inset 1px 1px 3px rgba(0,0,0,0.15), inset -1px -1px 2px rgba(60,60,80,0.06)";
  }
  return raised
    ? "0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)"
    : "inset 2px 2px 5px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(255,255,255,0.8)";
}

function neuBg(darkMode) {
  return darkMode ? "#1e1f2e" : "#f4f6f9";
}

function neuCardBg(darkMode) {
  return darkMode ? "#1a1a1a" : "#ffffff";
}

function neuInputShadow(darkMode) {
  return darkMode
    ? "inset 1px 1px 3px rgba(0,0,0,0.12), inset -1px -1px 2px rgba(60,60,80,0.06)"
    : "inset 2px 2px 4px rgba(0,0,0,0.08), inset -1px -1px 3px rgba(0,0,0,0.03)";
}

// ── Inject keyframes once ─────────────────────────────────────
const ANIM_STYLE_ID = "analytics-view-animations";
if (
  typeof document !== "undefined" &&
  !document.getElementById(ANIM_STYLE_ID)
) {
  const style = document.createElement("style");
  background: (neuBg(darkMode), (style.id = ANIM_STYLE_ID));
  style.textContent = `
    @keyframes analytics-shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes analytics-fade-slide-up {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes analytics-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes analytics-pulse-soft {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
  `;
  document.head.appendChild(style);
}

// ── Skeleton primitives ───────────────────────────────────────
function SkeletonBox({
  width = "100%",
  height = 16,
  radius = 6,
  style: extra = {},
  darkMode,
}) {
  // Shimmer colors derived from neumorphic palette for cohesion
  const shimmerBg = darkMode
    ? "linear-gradient(90deg, #252636 25%, #2f3045 50%, #252636 75%)"
    : "linear-gradient(90deg, #e8ecf2 25%, #f4f6f9 50%, #e8ecf2 75%)";
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: shimmerBg,
        backgroundSize: "800px 100%",
        animation: "analytics-shimmer 1.4s infinite linear",
        boxShadow: darkMode
          ? "inset 1px 1px 2px rgba(0,0,0,0.12), inset -1px -1px 2px rgba(60,60,80,0.04)"
          : "inset 1px 1px 3px rgba(0,0,0,0.05), inset -1px -1px 2px rgba(255,255,255,0.7)",
        flexShrink: 0,
        ...extra,
      }}
    />
  );
}

function KpiCardSkeleton({ darkMode, index = 0 }) {
  // Accent colors matching the real KPI cards for progressive reveal
  const accents = [
    "#1877F2",
    "#36a420",
    "#e02020",
    "#f59e0b",
    "#0891b2",
    "#9333ea",
  ];
  const accent = accents[index % accents.length];
  return (
    <div
      style={{
        background: neuCardBg(darkMode),
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: neuShadow(darkMode),
        borderTop: `3px solid ${accent}30`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation:
          "analytics-fade-slide-up 0.4s ease both, analytics-pulse-soft 2s ease-in-out infinite",
        animationDelay: `${index * 70}ms`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SkeletonBox width={70} height={10} darkMode={darkMode} />
        <SkeletonBox width={32} height={32} radius={10} darkMode={darkMode} />
      </div>
      <SkeletonBox width={80} height={32} radius={6} darkMode={darkMode} />
      <SkeletonBox width={110} height={9} radius={4} darkMode={darkMode} />
    </div>
  );
}

function SectionCardSkeleton({ height = 220, darkMode, children, delay = 0 }) {
  return (
    <div
      style={{
        background: neuCardBg(darkMode),
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: neuShadow(darkMode),
        animation:
          "analytics-fade-slide-up 0.45s ease both, analytics-pulse-soft 2.2s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          padding: "14px 18px 12px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
        }}
      >
        <SkeletonBox width={16} height={16} radius={4} darkMode={darkMode} />
        <SkeletonBox width={160} height={14} radius={4} darkMode={darkMode} />
      </div>
      <div style={{ padding: "16px 18px" }}>
        {children || (
          <SkeletonBox
            width="100%"
            height={height}
            radius={8}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}

// ── Fade/slide-in wrapper ─────────────────────────────────────
function FadeSlideIn({ children, delay = 0, style: extra = {} }) {
  return (
    <div
      style={{
        animation: `analytics-fade-slide-up 0.45s ease both`,
        animationDelay: `${delay}ms`,
        ...extra,
      }}
    >
      {children}
    </div>
  );
}

// ── useCountUp ────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  useEffect(() => {
    const isPercent = typeof target === "string" && target.endsWith("%");
    const end = parseFloat(target) || 0;
    const start = fromRef.current;
    fromRef.current = end;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startRef.current = null;
    function step(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(isPercent ? `${current}%` : current);
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    }
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return display;
}

// ── Mini bar chart ────────────────────────────────────────────
function MiniBar({ value, max, color, darkMode }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div
      style={{
        flex: 1,
        height: 8,
        borderRadius: 99,
        boxShadow: neuInputShadow(darkMode),
        overflow: "hidden",
        background: neuCardBg(darkMode),
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 99,
          background: color,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

// ── Trend line chart ──────────────────────────────────────────
function TrendChart({ data, ui, darkMode }) {
  const [hov, setHov] = useState(null);
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: ui.textMuted,
          fontSize: "0.84rem",
        }}
      >
        No trend data available
      </div>
    );
  }
  const W = 680,
    H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 44 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const series = [
    { key: "cpr", color: "#36a420", label: "CPR" },
    { key: "lod", color: "#e02020", label: "LOD" },
    { key: "on_process", color: "#f59e0b", label: "On Process" },
    { key: "completed", color: FB, label: "Completed" },
  ];
  const maxVal =
    Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0)), 1) * 1.2;
  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxVal) * cH;
  const yticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));
  function makePath(s) {
    const pts = data.map((d, i) => [toX(i), toY(d[s.key] ?? 0)]);
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i],
        [x1, y1] = pts[i + 1];
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }
  return (
    <div>
      <div
        style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}
      >
        {series.map((s) => (
          <div
            key={s.key}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 20,
                height: 3,
                borderRadius: 99,
                background: s.color,
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                color: ui.textMuted,
                fontWeight: 500,
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          overflow: "visible",
        }}
      >
        {yticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(t)}
              x2={W - PAD.right}
              y2={toY(t)}
              stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
              strokeWidth={i === 0 ? 1.5 : 0.75}
              strokeDasharray={i === 0 ? "none" : "3 4"}
            />
            <text
              x={PAD.left - 7}
              y={toY(t) + 4}
              textAnchor="end"
              fill={ui.textMuted}
              fontSize="9"
              fontWeight="500"
            >
              {t}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <path
            key={s.key}
            d={makePath(s)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {data.map((d, i) => (
          <g key={i}>
            <rect
              x={toX(i) - cW / data.length / 2}
              y={PAD.top}
              width={cW / data.length}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            />
            {hov === i && (
              <>
                <line
                  x1={toX(i)}
                  y1={PAD.top}
                  x2={toX(i)}
                  y2={PAD.top + cH}
                  stroke={ui.textMuted}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={toX(i)}
                    cy={toY(d[s.key] ?? 0)}
                    r={4}
                    fill={s.color}
                    stroke={neuCardBg(darkMode)}
                    strokeWidth={2}
                  />
                ))}
                <g>
                  <rect
                    x={toX(i) > W * 0.65 ? toX(i) - 130 : toX(i) + 10}
                    y={PAD.top + 4}
                    width={120}
                    height={18 + series.length * 18 + 8}
                    rx={10}
                    fill={neuCardBg(darkMode)}
                    stroke="none"
                    filter="url(#neuTooltip)"
                  />
                  <text
                    x={toX(i) > W * 0.65 ? toX(i) - 70 : toX(i) + 70}
                    y={PAD.top + 17}
                    textAnchor="middle"
                    fill={FB}
                    fontSize={9.5}
                    fontWeight={700}
                  >
                    {d.label}
                  </text>
                  {series.map((s, si) => (
                    <g key={s.key}>
                      <circle
                        cx={toX(i) > W * 0.65 ? toX(i) - 118 : toX(i) + 22}
                        cy={PAD.top + 28 + si * 18}
                        r={3}
                        fill={s.color}
                      />
                      <text
                        x={toX(i) > W * 0.65 ? toX(i) - 112 : toX(i) + 28}
                        y={PAD.top + 32 + si * 18}
                        fill={ui.textSub}
                        fontSize={8.5}
                      >
                        {s.label}
                      </text>
                      <text
                        x={toX(i) > W * 0.65 ? toX(i) - 18 : toX(i) + 122}
                        y={PAD.top + 32 + si * 18}
                        textAnchor="end"
                        fill={s.color}
                        fontSize={9}
                        fontWeight={700}
                      >
                        {d[s.key] ?? 0}
                      </text>
                    </g>
                  ))}
                </g>
              </>
            )}
            <text
              x={toX(i)}
              y={H - 6}
              textAnchor="middle"
              fill={ui.textMuted}
              fontSize={9}
              fontWeight={500}
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Donut chart ───────────────────────────────────────────────
function DonutChart({ data, ui, darkMode }) {
  const [active, setActive] = useState(0);
  const colors = ["#36a420", "#e02020", "#f59e0b"];
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 90,
    cy = 90,
    r = 70,
    ri = 48;
  let sa = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
    const s = { ...d, startAngle: sa, endAngle: sa + angle, color: colors[i] };
    sa += angle;
    return s;
  });
  function arc(sa, ea, or, ir) {
    if (Math.abs(ea - sa) < 0.001) return "";
    const lg = ea - sa > Math.PI ? 1 : 0;
    const x1o = cx + or * Math.cos(sa),
      y1o = cy + or * Math.sin(sa);
    const x2o = cx + or * Math.cos(ea),
      y2o = cy + or * Math.sin(ea);
    const x1i = cx + ir * Math.cos(ea),
      y1i = cy + ir * Math.sin(ea);
    const x2i = cx + ir * Math.cos(sa),
      y2i = cy + ir * Math.sin(sa);
    return `M ${x1o} ${y1o} A ${or} ${or} 0 ${lg} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ir} ${ir} 0 ${lg} 0 ${x2i} ${y2i} Z`;
  }
  const aSlice = slices[active] || slices[0];
  const pct =
    total > 0 && aSlice ? ((aSlice.value / total) * 100).toFixed(1) : "0.0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ position: "relative" }}>
        <svg
          viewBox="0 0 180 180"
          style={{
            width: 160,
            height: 160,
            flexShrink: 0,
            overflow: "visible",
          }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={(r + ri) / 2}
            fill="none"
            stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
            strokeWidth={r - ri + 2}
          />
          {slices.map((s, i) => {
            const isAct = i === active;
            const or = isAct ? r + 5 : r,
              ir2 = isAct ? ri - 2 : ri;
            return (
              <path
                key={i}
                d={arc(s.startAngle, s.endAngle, or, ir2)}
                fill={s.color}
                opacity={isAct ? 1 : 0.7}
                onMouseEnter={() => setActive(i)}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  filter: isAct
                    ? `drop-shadow(0 2px 6px ${s.color}60)`
                    : "none",
                }}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={ri - 3} fill={neuCardBg(darkMode)} />
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fill={aSlice?.color}
            fontSize={22}
            fontWeight={800}
          >
            {aSlice?.value ?? 0}
          </text>
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fill={ui.textMuted}
            fontSize={7.5}
            fontWeight={600}
          >
            {(aSlice?.name || "").toUpperCase()}
          </text>
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fill={aSlice?.color}
            fontSize={11}
            fontWeight={700}
          >
            {pct}%
          </text>
        </svg>
      </div>
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}
      >
        {slices.map((s, i) => {
          const pv = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0.0";
          const isAct = i === active;
          return (
            <div
              key={s.name}
              onMouseEnter={() => setActive(i)}
              style={{ cursor: "pointer" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: isAct ? 700 : 500,
                    color: isAct ? s.color : ui.textSub,
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: s.color,
                  }}
                >
                  {s.value}{" "}
                  <span
                    style={{
                      fontWeight: 400,
                      color: ui.textMuted,
                      fontSize: "0.68rem",
                    }}
                  >
                    ({pv}%)
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 99,
                  boxShadow: neuInputShadow(darkMode),
                  background: neuCardBg(darkMode),
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pv}%`,
                    borderRadius: 99,
                    background: s.color,
                    transition: "width 0.5s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Neumorphic KPI Card ──────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  color,
  sub,
  darkMode,
  ui,
  animDelay = 0,
}) {
  const animated = useCountUp(value);
  return (
    <FadeSlideIn delay={animDelay}>
      <div
        style={{
          background: neuCardBg(darkMode),
          borderRadius: 16,
          padding: "16px 18px",
          boxShadow: neuShadow(darkMode),
          borderTop: `3px solid ${color}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          height: "100%",
          boxSizing: "border-box",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: ui.textMuted,
            }}
          >
            {label}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: neuCardBg(darkMode),
              boxShadow: neuShadow(darkMode),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
            }}
          >
            {icon}
          </div>
        </div>
        <div
          style={{
            fontSize: "1.9rem",
            fontWeight: 800,
            color,
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {animated}
        </div>
        {sub && (
          <div style={{ fontSize: "0.7rem", color: ui.textMuted }}>{sub}</div>
        )}
      </div>
    </FadeSlideIn>
  );
}

// ── Neumorphic Section Card ──────────────────────────────────
function SectionCard({
  title,
  subtitle,
  icon,
  children,
  ui,
  darkMode,
  action,
}) {
  return (
    <div
      style={{
        background: neuCardBg(darkMode),
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: neuShadow(darkMode),
      }}
    >
      <div
        style={{
          padding: "14px 18px 12px",
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
            {title}
          </p>
          {subtitle && (
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ── Full-page skeleton ────────────────────────────────────────
function AnalyticsSkeleton({ ui, darkMode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "transparent",
        padding: 16,
        borderRadius: 20,
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
          animation: "analytics-fade-slide-up 0.35s ease both",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SkeletonBox width={220} height={18} radius={5} darkMode={darkMode} />
          <SkeletonBox width={280} height={11} radius={4} darkMode={darkMode} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SkeletonBox
            width={200}
            height={34}
            radius={12}
            darkMode={darkMode}
            style={{ boxShadow: neuShadow(darkMode, false) }}
          />
          <SkeletonBox
            width={90}
            height={34}
            radius={12}
            darkMode={darkMode}
            style={{ boxShadow: neuShadow(darkMode) }}
          />
          <SkeletonBox
            width={110}
            height={34}
            radius={12}
            darkMode={darkMode}
            style={{ boxShadow: neuShadow(darkMode) }}
          />
          <SkeletonBox
            width={88}
            height={34}
            radius={12}
            darkMode={darkMode}
            style={{ boxShadow: neuShadow(darkMode) }}
          />
        </div>
      </div>

      {/* KPI cards with staggered entry */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} darkMode={darkMode} index={i} />
        ))}
      </div>

      {/* Trend + Donut row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <SectionCardSkeleton height={220} darkMode={darkMode} delay={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 4 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox
                  key={i}
                  width={80}
                  height={10}
                  radius={4}
                  darkMode={darkMode}
                />
              ))}
            </div>
            <SkeletonBox
              width="100%"
              height={200}
              radius={8}
              darkMode={darkMode}
            />
          </div>
        </SectionCardSkeleton>
        <SectionCardSkeleton darkMode={darkMode} delay={560}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <SkeletonBox
              width={160}
              height={160}
              radius={999}
              darkMode={darkMode}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <SkeletonBox
                    width="90%"
                    height={10}
                    radius={4}
                    darkMode={darkMode}
                  />
                  <SkeletonBox
                    width="100%"
                    height={5}
                    radius={99}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionCardSkeleton>
      </div>

      {/* Table skeleton */}
      <SectionCardSkeleton darkMode={darkMode} delay={640}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 10,
                opacity: 1 - i * 0.12,
              }}
            >
              {Array.from({ length: 6 }).map((_, j) => (
                <SkeletonBox
                  key={j}
                  width="100%"
                  height={14}
                  radius={4}
                  darkMode={darkMode}
                />
              ))}
            </div>
          ))}
        </div>
      </SectionCardSkeleton>
    </div>
  );
}

// ── Main AnalyticsView ────────────────────────────────────────
export default function AnalyticsView({
  ui,
  darkMode,
  chartYear,
  setChartYear,
  chartMonth,
  setChartMonth,
  rxFilter,
  setRxFilter,
  onSliceClick,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [availableYears, setAvailableYears] = useState(["All"]);
  const [summary, setSummary] = useState({
    total: 0,
    cpr: 0,
    lod: 0,
    on_process: 0,
    completed: 0,
    approval_rate: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [classificationData, setClassificationData] = useState([]);
  const [yearSummaryData, setYearSummaryData] = useState([]);
  const [topDrugsData, setTopDrugsData] = useState([]);
  const [topCountriesData, setTopCountriesData] = useState([]);
  const [docTypeData, setDocTypeData] = useState({ doc_types: [], data: [] });
  const [loading, setLoading] = useState(true);
  const [topCountryTab, setTopCountryTab] = useState("mfr");
  const [topCountryLimit, setTopCountryLimit] = useState(10);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
      };
      const countryParams = {
        ...params,
        entity_type: topCountryTab,
        limit: topCountryLimit,
      };
      const [
        years,
        sum,
        trend,
        classification,
        yearSum,
        drugs,
        countries,
        docType,
      ] = await Promise.all([
        getAnalyticsAvailableYears(),
        getAnalyticsSummary(params),
        getAnalyticsTrend(params),
        getAnalyticsByClassification(params),
        getAnalyticsYearSummary(),
        getAnalyticsTopDrugs(params),
        getAnalyticsTopCountries(countryParams),
        getDocTypeReleased(),
      ]);
      setAvailableYears(years.years ?? ["All"]);
      setSummary(sum);
      setTrendData(trend.data ?? []);
      setClassificationData(classification.data ?? []);
      setYearSummaryData(yearSum.data ?? []);
      setTopDrugsData(drugs.data ?? []);
      setTopCountriesData(countries.data ?? []);
      setDocTypeData(docType ?? { doc_types: [], data: [] });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [chartYear, chartMonth, rxFilter, topCountryTab, topCountryLimit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const pieData = [
    { name: "CPR Released", value: summary.cpr },
    { name: "LOD Released", value: summary.lod },
    { name: "On Process", value: summary.on_process },
  ];
  const maxDrug = Math.max(...topDrugsData.map((d) => d.total), 1);
  const maxCountry = Math.max(...topCountriesData.map((d) => d.count), 1);

  // Neumorphic input style
  const inputSt = {
    background: neuCardBg(darkMode),
    border: "none",
    borderRadius: 10,
    padding: "7px 12px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    boxShadow: neuInputShadow(darkMode),
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };

  // Neumorphic button style
  const neuBtnStyle = (isActive) => ({
    padding: "5px 12px",
    fontSize: "0.72rem",
    fontWeight: isActive ? 700 : 500,
    borderRadius: 10,
    border: "none",
    background: neuCardBg(darkMode),
    color: isActive ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    boxShadow: isActive
      ? neuShadow(darkMode, false)
      : neuShadow(darkMode, true),
    transition: "all 0.2s ease",
  });

  if (loading) return <AnalyticsSkeleton ui={ui} darkMode={darkMode} />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: font,
        background: "transparent",
        padding: 16,
        borderRadius: 20,
      }}
    >
      {/* ── Header ── */}
      <FadeSlideIn delay={0}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              📊 Analytics Overview
            </h2>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.75rem",
                color: ui.textMuted,
              }}
            >
              Real-time data from main database
              {lastUpdated && (
                <span>
                  {" "}
                  · Updated{" "}
                  {lastUpdated.toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* Classification tabs — neumorphic pressed/raised */}
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                }}
              >
                Classification
              </p>
              <div
                style={{
                  display: "flex",
                  background: neuCardBg(darkMode),
                  borderRadius: 12,
                  padding: 4,
                  gap: 3,
                  boxShadow: neuShadow(darkMode, false),
                }}
              >
                {[
                  { key: "All", label: "All" },
                  { key: "Over-the-Counter (OTC)", label: "OTC" },
                  { key: "Vaccine", label: "Vaccine" },
                  { key: "Prescription Drug (RX)", label: "RX" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setRxFilter(key)}
                    style={neuBtnStyle(rxFilter === key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Year */}
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                }}
              >
                Year
              </p>
              <select
                value={chartYear}
                onChange={(e) => {
                  setChartYear(e.target.value);
                  setChartMonth("All");
                }}
                style={{ ...inputSt, minWidth: 85 }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {/* Month */}
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                }}
              >
                Month
              </p>
              <select
                value={chartMonth}
                onChange={(e) => setChartMonth(e.target.value)}
                disabled={chartYear === "All"}
                style={{
                  ...inputSt,
                  minWidth: 110,
                  opacity: chartYear === "All" ? 0.4 : 1,
                }}
              >
                <option value="All">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {/* Refresh */}
            <button
              onClick={fetchAll}
              title="Refresh"
              style={{
                ...inputSt,
                padding: "7px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                boxShadow: neuShadow(darkMode),
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>↻</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                Refresh
              </span>
            </button>
          </div>
        </div>
      </FadeSlideIn>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
        }}
      >
        {[
          {
            icon: "📥",
            label: "Total",
            value: summary.total,
            color: FB,
            sub: "All applications",
          },
          {
            icon: "✅",
            label: "CPR Released",
            value: summary.cpr,
            color: "#36a420",
            sub: "Documents issued",
          },
          {
            icon: "❌",
            label: "LOD Released",
            value: summary.lod,
            color: "#e02020",
            sub: "Disapproved",
          },
          {
            icon: "⏳",
            label: "On Process",
            value: summary.on_process,
            color: "#f59e0b",
            sub: "Pending completion",
          },
          {
            icon: "🏁",
            label: "Completed",
            value: summary.completed,
            color: "#0891b2",
            sub: "With other application categories",
          },
          {
            icon: "📈",
            label: "Approval %",
            value: `${summary.approval_rate}%`,
            color: "#9333ea",
            sub: "CPR over total",
          },
        ].map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            {...kpi}
            darkMode={darkMode}
            ui={ui}
            animDelay={i * 60}
          />
        ))}
      </div>

      {/* ── Trend + Donut ── */}
      <FadeSlideIn delay={420}>
        <div
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}
        >
          <SectionCard
            title="Trend Overview"
            subtitle={`Grouped by ${chartYear === "All" ? "year" : "month"}`}
            icon="📈"
            ui={ui}
            darkMode={darkMode}
          >
            <TrendChart data={trendData} ui={ui} darkMode={darkMode} />
          </SectionCard>
          <SectionCard
            title="Approval Breakdown"
            subtitle="CPR vs LOD vs On Process"
            icon="🍩"
            ui={ui}
            darkMode={darkMode}
          >
            <DonutChart data={pieData} ui={ui} darkMode={darkMode} />
          </SectionCard>
        </div>
      </FadeSlideIn>

      {/* ── Year Summary ── */}
      <FadeSlideIn delay={500}>
        <SectionCard
          title="Year-by-Year Summary"
          icon="📅"
          ui={ui}
          darkMode={darkMode}
        >
          {yearSummaryData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No year data available
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: darkMode
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                    }}
                  >
                    {["Year", "Total"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          textAlign: h === "Year" ? "left" : "center",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                    {docTypeData.doc_types.map((dt) => (
                      <th
                        key={dt}
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dt}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: ui.textMuted,
                        borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearSummaryData.map((row, i) => {
                    const docRow = docTypeData.data.find(
                      (d) => String(d.year) === String(row.year),
                    );
                    return (
                      <tr
                        key={row.year}
                        style={{
                          borderBottom:
                            i < yearSummaryData.length - 1
                              ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
                              : "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = darkMode
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(0,0,0,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          style={{
                            padding: "9px 12px",
                            fontWeight: 700,
                            color: FB,
                          }}
                        >
                          {row.year}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            fontWeight: 600,
                            color: ui.textPrimary,
                          }}
                        >
                          {row.total}
                        </td>
                        {docTypeData.doc_types.map((dt) => {
                          const count = docRow?.by_doc_type?.[dt] ?? 0;
                          const color =
                            dt === "CPR"
                              ? "#36a420"
                              : dt === "LOD"
                                ? "#e02020"
                                : dt === "ON PROCESS"
                                  ? "#f59e0b"
                                  : ui.textPrimary;
                          return (
                            <td
                              key={dt}
                              style={{
                                padding: "9px 12px",
                                textAlign: "center",
                                fontWeight: 600,
                                color,
                              }}
                            >
                              {count}
                            </td>
                          );
                        })}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            fontWeight: 700,
                            color:
                              parseFloat(row.rate) >= 60
                                ? "#36a420"
                                : "#f59e0b",
                          }}
                        >
                          {row.rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>

      {/* ── By Classification ── */}
      <FadeSlideIn delay={560}>
        <SectionCard
          title="By Classification"
          subtitle="Prescription type breakdown"
          icon="💊"
          ui={ui}
          darkMode={darkMode}
        >
          {classificationData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No classification data
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {classificationData.map((item, idx) => {
                const colors = [FB, "#f59e0b", "#36a420"];
                const color = colors[idx % colors.length];
                const short =
                  item.type === "Prescription Drug (RX)"
                    ? "RX"
                    : item.type === "Over-the-Counter (OTC)"
                      ? "OTC"
                      : "Vaccine";
                const totalAll = classificationData.reduce(
                  (s, d) => s + d.count,
                  0,
                );
                const pct =
                  totalAll > 0
                    ? ((item.count / totalAll) * 100).toFixed(1)
                    : "0.0";
                return (
                  <div
                    key={item.type}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: neuCardBg(darkMode),
                      boxShadow: neuShadow(darkMode),
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: `${color}18`,
                            color,
                          }}
                        >
                          {short}
                        </span>
                        <span
                          style={{ fontSize: "0.75rem", color: ui.textSub }}
                        >
                          {item.count} apps
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color,
                          }}
                        >
                          {item.rate}%
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: ui.textMuted,
                            marginLeft: 4,
                          }}
                        >
                          CPR rate
                        </span>
                      </div>
                    </div>
                    <MiniBar
                      value={parseFloat(pct)}
                      max={100}
                      color={color}
                      darkMode={darkMode}
                    />
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "0.67rem",
                        color: ui.textMuted,
                      }}
                    >
                      {pct}% of total
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>

      {/* ── Top Drug Applications ── */}
      <FadeSlideIn delay={620}>
        <SectionCard
          title="Top Drug Applications"
          subtitle="Ranked by application volume"
          icon="💊"
          ui={ui}
          darkMode={darkMode}
          action={
            <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
              Top {topDrugsData.length}
            </span>
          }
        >
          {topDrugsData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No drug data available
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 80px 80px 80px",
                  gap: 8,
                  padding: "0 4px",
                }}
              >
                {[
                  "Drug / Generic",
                  "Classification",
                  "Total",
                  "CPR",
                  "Rate",
                ].map((h) => (
                  <span
                    key={h}
                    style={{
                      fontSize: "0.63rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: ui.textMuted,
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
              {topDrugsData.map((drug, i) => {
                const rxShort =
                  drug.rx === "Prescription Drug (RX)"
                    ? "RX"
                    : drug.rx === "Over-the-Counter (OTC)"
                      ? "OTC"
                      : "VAX";
                const rxColor =
                  drug.rx === "Prescription Drug (RX)"
                    ? FB
                    : drug.rx === "Over-the-Counter (OTC)"
                      ? "#f59e0b"
                      : "#36a420";
                return (
                  <div
                    key={drug.name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 80px 80px 80px",
                      gap: 8,
                      padding: "10px 4px",
                      borderRadius: 10,
                      borderBottom:
                        i < topDrugsData.length - 1
                          ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
                          : "none",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = darkMode
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: `${rxColor}18`,
                            color: rxColor,
                            flexShrink: 0,
                          }}
                        >
                          {rxShort}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: ui.textPrimary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {drug.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MiniBar
                          value={drug.total}
                          max={maxDrug}
                          color={FB}
                          darkMode={darkMode}
                        />
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: ui.textMuted,
                            flexShrink: 0,
                          }}
                        >
                          {drug.generic}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                      {drug.rx || "—"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: FB,
                        textAlign: "center",
                      }}
                    >
                      {drug.total}
                    </span>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#36a420",
                        textAlign: "center",
                      }}
                    >
                      {drug.cpr}
                    </span>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        textAlign: "center",
                        color:
                          parseFloat(drug.rate) >= 60 ? "#36a420" : "#f59e0b",
                      }}
                    >
                      {drug.rate}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>

      {/* ── Top Countries ── */}
      <FadeSlideIn delay={680}>
        <SectionCard
          title="Top Countries by Entity Type"
          subtitle="Country of origin per application role"
          icon="🌍"
          ui={ui}
          darkMode={darkMode}
          action={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "0.68rem",
                  color: ui.textMuted,
                  fontWeight: 600,
                }}
              >
                Show Top
              </span>
              <select
                value={topCountryLimit}
                onChange={(e) => setTopCountryLimit(Number(e.target.value))}
                style={{ ...inputSt, padding: "3px 7px", fontSize: "0.75rem" }}
              >
                {[5, 10, 15].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {ENTITY_TYPES.map((et) => {
              const isAct = topCountryTab === et.key;
              return (
                <button
                  key={et.key}
                  onClick={() => setTopCountryTab(et.key)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.76rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 10,
                    border: "none",
                    background: neuCardBg(darkMode),
                    color: isAct ? et.color : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: isAct
                      ? neuShadow(darkMode, false)
                      : neuShadow(darkMode, true),
                    transition: "all 0.2s",
                  }}
                >
                  <span>{et.icon}</span>
                  <span>{et.label}</span>
                </button>
              );
            })}
          </div>

          {topCountriesData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No country data available
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topCountriesData.map((d, i) => {
                  const flag = COUNTRY_FLAGS[d.country] || "🌐";
                  const activeEntity = ENTITY_TYPES.find(
                    (et) => et.key === topCountryTab,
                  );
                  return (
                    <div
                      key={d.country}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: neuCardBg(darkMode),
                        boxShadow: neuShadow(darkMode),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            color: i < 3 ? activeEntity?.color : ui.textMuted,
                            minWidth: 20,
                          }}
                        >
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: "1rem" }}>{flag}</span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: ui.textPrimary,
                          }}
                        >
                          {d.country}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 800,
                            color: activeEntity?.color,
                          }}
                        >
                          {d.count}
                        </span>
                      </div>
                      <MiniBar
                        value={d.count}
                        max={maxCountry}
                        color={activeEntity?.color || FB}
                        darkMode={darkMode}
                      />
                      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <span style={{ fontSize: "0.62rem", color: "#36a420" }}>
                          ✅ {d.cpr}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "#e02020" }}>
                          ❌ {d.lod}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "#f59e0b" }}>
                          ⏳ {d.on_process}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div
                  style={{
                    background: neuCardBg(darkMode),
                    borderRadius: 12,
                    padding: 14,
                    boxShadow: neuShadow(darkMode, false),
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    🏆 Top 3 Podium
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    {[1, 0, 2].map((rank) => {
                      const d = topCountriesData[rank];
                      if (!d) return null;
                      const flag = COUNTRY_FLAGS[d.country] || "🌐";
                      const medals = ["🥇", "🥈", "🥉"];
                      const heights = [80, 60, 48];
                      const activeEntity = ENTITY_TYPES.find(
                        (et) => et.key === topCountryTab,
                      );
                      const c =
                        rank === 0
                          ? activeEntity?.color
                          : rank === 1
                            ? "#9ca3af"
                            : "#b45309";
                      return (
                        <div
                          key={rank}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: c,
                            }}
                          >
                            {medals[rank]} #{rank + 1}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              background: neuCardBg(darkMode),
                              borderRadius: "10px 10px 0 0",
                              height: heights[rank],
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 2,
                              boxShadow: neuShadow(darkMode),
                            }}
                          >
                            <span
                              style={{
                                fontSize: rank === 0 ? "1.3rem" : "1rem",
                              }}
                            >
                              {flag}
                            </span>
                            <span
                              style={{
                                fontSize: rank === 0 ? "0.65rem" : "0.58rem",
                                fontWeight: 700,
                                color: c,
                                textAlign: "center",
                                maxWidth: 70,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.country}
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              background: neuCardBg(darkMode),
                              borderRadius: "0 0 8px 8px",
                              padding: "4px 0",
                              textAlign: "center",
                              boxShadow: neuShadow(darkMode, false),
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: rank === 0 ? "0.95rem" : "0.82rem",
                                fontWeight: 800,
                                color: c,
                              }}
                            >
                              {d.count}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      label: "Countries",
                      value: topCountriesData.length,
                      icon: "🌍",
                      color:
                        ENTITY_TYPES.find((et) => et.key === topCountryTab)
                          ?.color || FB,
                    },
                    {
                      label: "Total Apps",
                      value: topCountriesData.reduce((s, d) => s + d.count, 0),
                      icon: "📋",
                      color: FB,
                    },
                    {
                      label: "#1 Country",
                      value: topCountriesData[0]?.country || "—",
                      icon: "🥇",
                      color: "#f59e0b",
                      small: true,
                    },
                    {
                      label: "#1 CPR",
                      value: topCountriesData[0]?.cpr ?? 0,
                      icon: "✅",
                      color: "#36a420",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: neuCardBg(darkMode),
                        boxShadow: neuShadow(darkMode),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontSize: "0.8rem" }}>{s.icon}</span>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: ui.textMuted,
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: s.small ? "0.75rem" : "1.05rem",
                          fontWeight: 800,
                          color: s.color,
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>
    </div>
  );
}
