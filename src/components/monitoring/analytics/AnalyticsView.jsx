// FILE: src/pages/monitoring/analytics/AnalyticsView.jsx

import { useState, useMemo } from "react";

const FB = "#1877F2";
const FB_LIGHT = "#E7F0FD";

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
const PRESCRIPTION_TYPES = [
  "All",
  "Over-the-Counter (OTC)",
  "Vaccine",
  "Prescription Drug (RX)",
];
const ENTITY_TYPES = [
  { key: "mfrCountry", label: "Manufacturer", icon: "🏭", color: "#1877F2" },
  { key: "traderCountry", label: "Trader", icon: "🤝", color: "#9333ea" },
  { key: "importerCountry", label: "Importer", icon: "🚢", color: "#0891b2" },
  {
    key: "distributorCountry",
    label: "Distributor",
    icon: "🚚",
    color: "#f59e0b",
  },
  { key: "repackerCountry", label: "Repacker", icon: "📦", color: "#36a420" },
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
const USER_ROLE_MAP = {
  "Juan dela Cruz": "Evaluator",
  "Maria Santos": "QA Officer",
  "Pedro Reyes": "Checker",
  "Ana Gonzales": "Releasing Officer",
  "Jose Bautista": "Decker",
  "Liza Reyes": "Supervisor",
};
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

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}
function getAvatarColor(name, list) {
  return avatarPalette[list.indexOf(name) % avatarPalette.length];
}
function rxShortLabel(p) {
  return p === "Over-the-Counter (OTC)"
    ? "OTC"
    : p === "Prescription Drug (RX)"
      ? "RX"
      : "Vaccine";
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function smoothPath(pts) {
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

const MON_SERIES = [
  { key: "Approved", color: FB, label: "Approved" },
  { key: "Disapproved", color: "#f43f5e", label: "Disapproved" },
  { key: "OnProcess", color: "#f59e0b", label: "On Process" },
];

function MonAreaChart({ data, subtitle, ui }) {
  const [hov, setHov] = useState(null);
  const W = 700,
    H = 220;
  const PAD = { top: 22, right: 20, bottom: 34, left: 48 };
  const cW = W - PAD.left - PAD.right,
    cH = H - PAD.top - PAD.bottom;
  const allVals = data.flatMap((d) => MON_SERIES.map((s) => d[s.key] ?? 0));
  const maxV = (Math.max(...allVals) || 1) * 1.2;
  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxV) * cH;
  const yticks = [0, 1 / 3, 2 / 3, 1].map((f) => Math.round(maxV * f));
  const xstep = Math.max(1, Math.ceil(data.length / 10));
  const showDots = data.length <= 8;
  const seriesPaths = MON_SERIES.map((s) => {
    const pts = data.map((d, i) => [toX(i), toY(d[s.key] ?? 0)]);
    const linePath = smoothPath(pts);
    const areaPath =
      pts.length > 0
        ? `${linePath} L ${toX(data.length - 1)} ${PAD.top + cH} L ${PAD.left} ${PAD.top + cH} Z`
        : "";
    return { ...s, pts, linePath, areaPath };
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {MON_SERIES.map((s) => (
            <div
              key={s.key}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div
                style={{
                  width: 22,
                  height: 3,
                  borderRadius: 99,
                  background: s.color,
                }}
              />
              <span
                style={{
                  fontSize: "0.73rem",
                  color: ui.textSub,
                  fontWeight: 500,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 99,
              background: `${FB}12`,
              border: `1px solid ${FB}28`,
            }}
          >
            <span style={{ fontSize: "0.65rem" }}>📅</span>
            <span style={{ fontSize: "0.71rem", color: FB, fontWeight: 600 }}>
              {subtitle}
            </span>
          </div>
        )}
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
        <defs>
          {seriesPaths.map((s) => (
            <linearGradient
              key={s.key}
              id={`mongrad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
              <stop offset="75%" stopColor={s.color} stopOpacity={0.04} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {yticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(t)}
              x2={W - PAD.right}
              y2={toY(t)}
              stroke={ui.gridLine}
              strokeWidth={i === 0 ? 1.5 : 0.75}
              strokeDasharray={i === 0 ? "none" : "3 4"}
              opacity={i === 0 ? 0.8 : 0.5}
            />
            <text
              x={PAD.left - 7}
              y={toY(t) + 4}
              textAnchor="end"
              fill={ui.textMuted}
              fontSize="10"
              fontWeight="500"
            >
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        ))}
        {seriesPaths.map((s) => (
          <path
            key={`area-${s.key}`}
            d={s.areaPath}
            fill={`url(#mongrad-${s.key})`}
          />
        ))}
        {seriesPaths.map((s) => (
          <path
            key={`line-${s.key}`}
            d={s.linePath}
            fill="none"
            stroke={s.color}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {showDots &&
          data.map((d, i) =>
            seriesPaths.map((s) => (
              <circle
                key={`dot-${s.key}-${i}`}
                cx={toX(i)}
                cy={toY(d[s.key] ?? 0)}
                r="3.5"
                fill={s.color}
                stroke={ui.cardBg}
                strokeWidth="2"
                opacity="0.9"
              />
            )),
          )}
        {data.map(
          (d, i) =>
            i % xstep === 0 && (
              <text
                key={i}
                x={toX(i)}
                y={H - 6}
                textAnchor="middle"
                fill={ui.textMuted}
                fontSize="9.5"
                fontWeight="500"
              >
                {d.label}
              </text>
            ),
        )}
        {data.map((d, i) => {
          const zoneW = cW / Math.max(data.length, 1);
          return (
            <g key={`zone-${i}`}>
              <rect
                x={toX(i) - zoneW / 2}
                y={PAD.top}
                width={zoneW}
                height={cH}
                fill="transparent"
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
              />
              {hov === i &&
                (() => {
                  const cx2 = toX(i),
                    tipW = 150,
                    tipH = 18 + MON_SERIES.length * 20 + 10;
                  const tipX = cx2 > W * 0.65 ? cx2 - tipW - 14 : cx2 + 14,
                    tipY = PAD.top + 4;
                  return (
                    <>
                      <line
                        x1={cx2}
                        y1={PAD.top}
                        x2={cx2}
                        y2={PAD.top + cH}
                        stroke={ui.textMuted}
                        strokeWidth="1"
                        strokeDasharray="4 3"
                        opacity="0.5"
                      />
                      {seriesPaths.map((s) => (
                        <circle
                          key={s.key}
                          cx={cx2}
                          cy={toY(d[s.key] ?? 0)}
                          r="5"
                          fill={s.color}
                          stroke={ui.cardBg}
                          strokeWidth="2.5"
                        />
                      ))}
                      <g>
                        <rect
                          x={tipX}
                          y={tipY}
                          width={tipW}
                          height={tipH}
                          rx={8}
                          fill={ui.cardBg}
                          stroke={ui.cardBorder}
                          strokeWidth="1"
                        />
                        <rect
                          x={tipX}
                          y={tipY}
                          width={tipW}
                          height={22}
                          rx={8}
                          fill={`${FB}14`}
                        />
                        <rect
                          x={tipX}
                          y={tipY + 14}
                          width={tipW}
                          height={8}
                          fill={`${FB}14`}
                        />
                        <text
                          x={tipX + tipW / 2}
                          y={tipY + 14}
                          textAnchor="middle"
                          fill={FB}
                          fontSize="10"
                          fontWeight="700"
                        >
                          {d.label}
                          {subtitle ? ` · ${subtitle}` : ""}
                        </text>
                        {MON_SERIES.map((s, si) => (
                          <g key={s.key}>
                            <rect
                              x={tipX + 10}
                              y={tipY + 26 + si * 20 - 6}
                              width={8}
                              height={8}
                              rx={2}
                              fill={s.color}
                              opacity="0.9"
                            />
                            <text
                              x={tipX + 24}
                              y={tipY + 26 + si * 20}
                              fill={ui.textSub}
                              fontSize="9.5"
                            >
                              {s.label}
                            </text>
                            <text
                              x={tipX + tipW - 10}
                              y={tipY + 26 + si * 20}
                              textAnchor="end"
                              fill={s.color}
                              fontSize="10"
                              fontWeight="700"
                            >
                              {(d[s.key] ?? 0).toLocaleString()}
                            </text>
                          </g>
                        ))}
                      </g>
                    </>
                  );
                })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const DONUT_PALETTE = [
  { color: FB, light: "#5da4f8", glow: `${FB}55` },
  { color: "#f43f5e", light: "#f87191", glow: "rgba(244,63,94,0.35)" },
  { color: "#f59e0b", light: "#fbbf24", glow: "rgba(245,158,11,0.35)" },
];

function DonutChart({ data, ui, darkMode, onSliceClick }) {
  const [active, setActive] = useState(null);
  const cx = 100,
    cy = 100,
    r = 76,
    ri = 52;
  const total = data.reduce((s, d) => s + d.value, 0);
  let sa = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
    const s = {
      ...d,
      startAngle: sa,
      endAngle: sa + angle,
      ...DONUT_PALETTE[i],
    };
    sa += angle;
    return s;
  });
  function arcPath(sa, ea, or, ir) {
    if (Math.abs(ea - sa) < 0.001) return "";
    const x1o = cx + or * Math.cos(sa),
      y1o = cy + or * Math.sin(sa);
    const x2o = cx + or * Math.cos(ea),
      y2o = cy + or * Math.sin(ea);
    const x1i = cx + ir * Math.cos(ea),
      y1i = cy + ir * Math.sin(ea);
    const x2i = cx + ir * Math.cos(sa),
      y2i = cy + ir * Math.sin(sa);
    const lg = ea - sa > Math.PI ? 1 : 0;
    return `M ${x1o} ${y1o} A ${or} ${or} 0 ${lg} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ir} ${ir} 0 ${lg} 0 ${x2i} ${y2i} Z`;
  }
  const ai = active !== null ? active : 0;
  const aSlice = slices[ai];
  const pct = total > 0 ? ((aSlice?.value / total) * 100).toFixed(1) : "0.0";

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <svg
        viewBox="0 0 200 200"
        style={{
          width: "100%",
          maxWidth: 240,
          height: "auto",
          overflow: "visible",
        }}
      >
        <defs>
          {DONUT_PALETTE.map((p, i) => (
            <linearGradient
              key={i}
              id={`mondg${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor={p.light} />
              <stop offset="100%" stopColor={p.color} />
            </linearGradient>
          ))}
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={(r + ri) / 2}
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}
          strokeWidth={r - ri + 2}
        />
        {slices.map((s, i) => {
          const isAct = i === ai,
            or = isAct ? r + 8 : r,
            ir2 = isAct ? ri - 3 : ri;
          return (
            <g
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onSliceClick && onSliceClick(s.name)}
              style={{ cursor: "pointer" }}
            >
              <path
                d={arcPath(s.startAngle, s.endAngle, or, ir2)}
                fill={`url(#mondg${i})`}
                style={{ transition: "all 0.22s cubic-bezier(.34,1.56,.64,1)" }}
              />
            </g>
          );
        })}
        <circle
          cx={cx}
          cy={cy}
          r={ri - 4}
          fill={darkMode ? "rgba(36,37,38,0.97)" : "rgba(255,255,255,0.97)"}
        />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fill={aSlice?.color}
          fontSize={22}
          fontWeight={800}
        >
          {aSlice?.value ?? 0}
        </text>
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fill={ui.textMuted}
          fontSize={8.5}
          fontWeight={600}
        >
          {aSlice?.name?.toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fill={aSlice?.color}
          fontSize={12}
          fontWeight={700}
        >
          {pct}%
        </text>
        <text
          x={cx}
          y={cy + 33}
          textAnchor="middle"
          fill={ui.textMuted}
          fontSize={7}
          fontStyle="italic"
        >
          tap slice for details
        </text>
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: "100%",
          marginTop: 8,
        }}
      >
        {slices.map((s, i) => {
          const pv = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0.0";
          const isAct = i === ai;
          return (
            <div
              key={s.name}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onSliceClick && onSliceClick(s.name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
                background: isAct
                  ? darkMode
                    ? `${s.color}18`
                    : `${s.color}0e`
                  : "transparent",
                border: `1px solid ${isAct ? s.color + "40" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 28,
                  borderRadius: 99,
                  background: `linear-gradient(to bottom, ${s.light}, ${s.color})`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.77rem",
                      fontWeight: 600,
                      color: isAct ? s.color : ui.textSub,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </span>
                </div>
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
                      width: `${pv}%`,
                      background: `linear-gradient(to right, ${s.light}, ${s.color})`,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: isAct ? s.color : ui.textMuted,
                  minWidth: 34,
                  textAlign: "right",
                }}
              >
                {pv}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main AnalyticsView ────────────────────────────────────────────────────────
export default function AnalyticsView({
  ui,
  darkMode,
  tableData,
  uniqueEvaluators,
  availableYears,
  chartYear,
  setChartYear,
  chartMonth,
  setChartMonth,
  rxFilter,
  setRxFilter,
  chartFiltered,
  onSliceClick,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";

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
  const labelSt = {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginBottom: 4,
    display: "block",
  };

  const [topCountryTab, setTopCountryTab] = useState("mfrCountry");
  const [topCountryLimit, setTopCountryLimit] = useState(10);

  const totalApproved = chartFiltered.filter(
    (r) => r.status === "Approved",
  ).length;
  const totalDisapproved = chartFiltered.filter(
    (r) => r.status === "Disapproved",
  ).length;
  const totalOnProcess = chartFiltered.filter(
    (r) => r.status === "On Process",
  ).length;
  const approvalRate = chartFiltered.length
    ? `${((totalApproved / chartFiltered.length) * 100).toFixed(1)}%`
    : "—";

  const statCards = [
    {
      label: "Total",
      value: chartFiltered.length,
      color: FB,
      bg: darkMode ? "#1a2744" : `${FB}10`,
      icon: "📥",
    },
    {
      label: "Approved",
      value: totalApproved,
      color: "#36a420",
      bg: darkMode ? "#0f2e1a" : "#f0fdf4",
      icon: "✅",
    },
    {
      label: "Disapproved",
      value: totalDisapproved,
      color: "#e02020",
      bg: darkMode ? "#2e0f1a" : "#fff1f3",
      icon: "❌",
    },
    {
      label: "On Process",
      value: totalOnProcess,
      color: "#f59e0b",
      bg: darkMode ? "#2e1f00" : "#fffbeb",
      icon: "⏳",
    },
    {
      label: "Approval %",
      value: approvalRate,
      color: "#9333ea",
      bg: darkMode ? "#1e1a2e" : "#f5f3ff",
      icon: "📈",
    },
  ];

  const pieData = [
    { name: "Approved", value: totalApproved },
    { name: "Disapproved", value: totalDisapproved },
    { name: "On Process", value: totalOnProcess },
  ];

  const availableMonths = useMemo(() => {
    if (chartYear === "All") return [];
    const ms = new Set(
      tableData
        .filter(
          (r) =>
            new Date(r.date + "T00:00:00").getFullYear() === Number(chartYear),
        )
        .map((r) => new Date(r.date + "T00:00:00").getMonth()),
    );
    return Array.from(ms).sort((a, b) => a - b);
  }, [tableData, chartYear]);

  const areaData = useMemo(() => {
    const groups = {};
    chartFiltered.forEach((row) => {
      const d = new Date(row.date + "T00:00:00");
      const key =
        chartYear === "All" ? String(d.getFullYear()) : MONTHS[d.getMonth()];
      if (!groups[key])
        groups[key] = { label: key, Approved: 0, Disapproved: 0, OnProcess: 0 };
      if (row.status === "Approved") groups[key].Approved++;
      else if (row.status === "Disapproved") groups[key].Disapproved++;
      else if (row.status === "On Process") groups[key].OnProcess++;
    });
    const keys = Object.keys(groups);
    if (chartYear === "All")
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => groups[k]);
    return MONTHS.filter((m) => groups[m]).map((m) => groups[m]);
  }, [chartFiltered, chartYear]);

  const areaSub =
    chartYear === "All"
      ? "All Years"
      : chartMonth !== "All"
        ? `${MONTHS[Number(chartMonth)]} ${chartYear}`
        : chartYear;

  const evalStats = useMemo(
    () =>
      uniqueEvaluators
        .map((ev) => {
          const tasks = chartFiltered.filter((r) => r.evaluator === ev);
          const approved = tasks.filter((r) => r.status === "Approved").length;
          const disapproved = tasks.filter(
            (r) => r.status === "Disapproved",
          ).length;
          const onProcess = tasks.filter(
            (r) => r.status === "On Process",
          ).length;
          const rate = tasks.length
            ? parseFloat(((approved / tasks.length) * 100).toFixed(1))
            : 0;
          const beyond = tasks.filter((r) => r.timeline === "Beyond").length;
          return {
            name: ev,
            total: tasks.length,
            approved,
            disapproved,
            onProcess,
            rate,
            beyond,
          };
        })
        .sort((a, b) => b.total - a.total),
    [chartFiltered, uniqueEvaluators],
  );

  const drugStats = useMemo(() => {
    const map = {};
    chartFiltered.forEach((r) => {
      if (!map[r.drugName])
        map[r.drugName] = {
          name: r.drugName,
          total: 0,
          approved: 0,
          disapproved: 0,
          onProcess: 0,
          rx: r.prescription,
        };
      map[r.drugName].total++;
      if (r.status === "Approved") map[r.drugName].approved++;
      else if (r.status === "Disapproved") map[r.drugName].disapproved++;
      else map[r.drugName].onProcess++;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [chartFiltered]);

  const timelineSplit = useMemo(
    () => ({
      within: chartFiltered.filter((r) => r.timeline === "Within").length,
      beyond: chartFiltered.filter((r) => r.timeline === "Beyond").length,
    }),
    [chartFiltered],
  );

  const yearSummary = useMemo(
    () =>
      availableYears
        .filter((y) => y !== "All")
        .map((y) => {
          const rows = tableData.filter(
            (r) => new Date(r.date + "T00:00:00").getFullYear() === Number(y),
          );
          const approved = rows.filter((r) => r.status === "Approved").length;
          const disapproved = rows.filter(
            (r) => r.status === "Disapproved",
          ).length;
          const onProcess = rows.filter(
            (r) => r.status === "On Process",
          ).length;
          const rate = rows.length
            ? ((approved / rows.length) * 100).toFixed(1)
            : "0.0";
          return {
            year: y,
            total: rows.length,
            approved,
            disapproved,
            onProcess,
            rate,
          };
        }),
    [tableData, availableYears],
  );

  const rxSplit = useMemo(() => {
    const types = [
      "Prescription Drug (RX)",
      "Over-the-Counter (OTC)",
      "Vaccine",
    ];
    return types.map((type) => {
      const rows = chartFiltered.filter((r) => r.prescription === type);
      const approved = rows.filter((r) => r.status === "Approved").length;
      return {
        type,
        count: rows.length,
        approved,
        rate: rows.length ? ((approved / rows.length) * 100).toFixed(1) : "0.0",
      };
    });
  }, [chartFiltered]);

  const topCountriesData = useMemo(() => {
    const map = {};
    chartFiltered.forEach((row) => {
      const country = row[topCountryTab];
      if (!country) return;
      if (!map[country])
        map[country] = {
          country,
          count: 0,
          approved: 0,
          disapproved: 0,
          onProcess: 0,
        };
      map[country].count++;
      if (row.status === "Approved") map[country].approved++;
      else if (row.status === "Disapproved") map[country].disapproved++;
      else map[country].onProcess++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, topCountryLimit);
  }, [chartFiltered, topCountryTab, topCountryLimit]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header & Filters */}
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
              fontSize: "1rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: 0,
            }}
          >
            Analytics Overview
          </h2>
          <p
            style={{
              fontSize: "0.77rem",
              color: ui.textMuted,
              margin: "2px 0 0",
            }}
          >
            Comprehensive application analytics · click charts for details
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
          {/* Classification Toggle */}
          <div>
            <label style={labelSt}>Classification</label>
            <div
              style={{
                display: "flex",
                background: darkMode ? ui.inputBg : "#e4e6eb",
                borderRadius: 9,
                padding: 3,
                gap: 2,
              }}
            >
              {PRESCRIPTION_TYPES.map((pt) => {
                const isAct = rxFilter === pt;
                const lbl =
                  pt === "All"
                    ? "All"
                    : pt === "Over-the-Counter (OTC)"
                      ? "OTC"
                      : pt === "Vaccine"
                        ? "Vaccine"
                        : "RX";
                return (
                  <button
                    key={pt}
                    onClick={() => setRxFilter(pt)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.74rem",
                      fontWeight: isAct ? 700 : 500,
                      borderRadius: 6,
                      border: "none",
                      background: isAct ? ui.cardBg : "transparent",
                      color: isAct ? FB : ui.textMuted,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: isAct ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                      whiteSpace: "nowrap",
                      fontFamily: font,
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Year */}
          <div>
            <label style={labelSt}>Year</label>
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
            <label style={labelSt}>Month</label>
            <select
              value={chartMonth}
              onChange={(e) => setChartMonth(e.target.value)}
              disabled={chartYear === "All"}
              style={{
                ...inputSt,
                minWidth: 110,
                opacity: chartYear === "All" ? 0.4 : 1,
                cursor: chartYear === "All" ? "not-allowed" : "pointer",
              }}
            >
              <option value="All">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTHS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 10,
        }}
      >
        {statCards.map((s) => (
          <Card
            key={s.label}
            ui={ui}
            style={{
              background: s.bg,
              borderColor: `${s.color}28`,
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: `${s.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: s.color,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: s.color,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Trend + Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <Card ui={ui}>
          <div style={{ padding: "14px 16px 0" }}>
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: ui.textPrimary,
                margin: 0,
              }}
            >
              Trend Overview
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: ui.textSub,
                margin: "2px 0 0",
              }}
            >
              Grouped by {chartYear === "All" ? "year" : "month"}
            </p>
          </div>
          <div style={{ padding: "4px 16px 14px" }}>
            {areaData.length === 0 ? (
              <div
                style={{
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ui.textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No data
              </div>
            ) : (
              <MonAreaChart data={areaData} subtitle={areaSub} ui={ui} />
            )}
          </div>
        </Card>
        <Card ui={ui} style={{ padding: "14px" }}>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: "0 0 2px",
            }}
          >
            Approval Breakdown
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: ui.textSub,
              margin: "0 0 10px",
            }}
          >
            Click a slice to view records
          </p>
          {chartFiltered.length === 0 ? (
            <div
              style={{
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No data
            </div>
          ) : (
            <DonutChart
              data={pieData}
              ui={ui}
              darkMode={darkMode}
              onSliceClick={onSliceClick}
            />
          )}
        </Card>
      </div>

      {/* Timeline / Classification / Year Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.4fr",
          gap: 14,
        }}
      >
        {/* Timeline */}
        <Card ui={ui} style={{ padding: "14px 16px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            ⏱ Timeline Status
          </p>
          {[
            {
              label: "Within Timeline",
              val: timelineSplit.within,
              color: "#36a420",
              bg: darkMode ? "#0f2e1a" : "#f0fdf4",
            },
            {
              label: "Beyond Timeline",
              val: timelineSplit.beyond,
              color: "#e02020",
              bg: darkMode ? "#2e0f0f" : "#fff1f2",
            },
          ].map((item) => {
            const total = timelineSplit.within + timelineSplit.beyond;
            const pct = total ? ((item.val / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={item.label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: item.color,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: item.color,
                    }}
                  >
                    {item.val}{" "}
                    <span style={{ fontWeight: 400, color: ui.textMuted }}>
                      ({pct}%)
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 99,
                    background: ui.progressBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 99,
                      background: item.color,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: darkMode ? "#1a1a2e" : "#f5f3ff",
              border: "1px solid #9333ea30",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: "#9333ea",
                fontWeight: 600,
              }}
            >
              ⚠ {timelineSplit.beyond} applications past due deadline
            </p>
          </div>
        </Card>

        {/* By Classification */}
        <Card ui={ui} style={{ padding: "14px 16px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            💊 By Classification
          </p>
          {rxSplit.map((item, idx) => {
            const colors = ["#1877F2", "#f59e0b", "#36a420"];
            const short =
              item.type === "Prescription Drug (RX)"
                ? "RX"
                : item.type === "Over-the-Counter (OTC)"
                  ? "OTC"
                  : "Vaccine";
            const total = chartFiltered.length;
            const pct = total ? ((item.count / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={item.type} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 99,
                        background: `${colors[idx]}18`,
                        color: colors[idx],
                      }}
                    >
                      {short}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: ui.textSub }}>
                      {item.count} apps
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: colors[idx],
                    }}
                  >
                    {item.rate}% approved
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 99,
                    background: ui.progressBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 99,
                      background: colors[idx],
                      transition: "width 0.4s",
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.67rem",
                    color: ui.textMuted,
                  }}
                >
                  {pct}% of total
                </p>
              </div>
            );
          })}
        </Card>

        {/* Year Summary */}
        <Card ui={ui} style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 14px 8px",
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              📅 Year-by-Year Summary
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            {["Year", "Total", "✅", "❌", "⏳", "Rate"].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                  padding: "7px 10px",
                  textAlign: i > 0 ? "center" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {yearSummary.map((row, i) => (
            <div
              key={row.year}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
                borderBottom:
                  i < yearSummary.length - 1
                    ? `1px solid ${ui.divider}`
                    : "none",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ui.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: FB,
                  padding: "8px 10px",
                }}
              >
                {row.year}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: ui.textPrimary,
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.total}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#36a420",
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.approved}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#e02020",
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.disapproved}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#f59e0b",
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.onProcess}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  padding: "8px 10px",
                  textAlign: "center",
                  color: parseFloat(row.rate) >= 60 ? "#36a420" : "#f59e0b",
                }}
              >
                {row.rate}%
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* User Performance */}
      <Card ui={ui} style={{ padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              👤 User Performance
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Tasks handled · approval rate per user
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: "0.7rem" }}>
            {[
              { color: "#36a420", label: "Approved" },
              { color: "#e02020", label: "Disapproved" },
              { color: "#f59e0b", label: "On Process" },
            ].map((l) => (
              <div
                key={l.label}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: l.color,
                  }}
                />
                <span style={{ color: ui.textMuted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {evalStats.map((ev) => {
            const av = getAvatarColor(ev.name, uniqueEvaluators);
            const maxTotal = Math.max(...evalStats.map((e) => e.total), 1);
            const role = USER_ROLE_MAP[ev.name] || "User";
            return (
              <div
                key={ev.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 60px",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(ev.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: ui.textPrimary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ev.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.63rem",
                        color: ui.textMuted,
                      }}
                    >
                      {role} · {ev.total} tasks
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 18,
                    borderRadius: 6,
                    overflow: "hidden",
                    background: ui.progressBg,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${(ev.approved / maxTotal) * 100}%`,
                      background: "#36a420",
                      borderRadius: "6px 0 0 6px",
                      transition: "width 0.4s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: `${(ev.approved / maxTotal) * 100}%`,
                      top: 0,
                      height: "100%",
                      width: `${(ev.disapproved / maxTotal) * 100}%`,
                      background: "#e02020",
                      transition: "width 0.4s, left 0.4s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: `${((ev.approved + ev.disapproved) / maxTotal) * 100}%`,
                      top: 0,
                      height: "100%",
                      width: `${(ev.onProcess / maxTotal) * 100}%`,
                      background: "#f59e0b",
                      borderRadius: "0 6px 6px 0",
                      transition: "width 0.4s, left 0.4s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: ev.total > 5 ? "#fff" : ui.textMuted,
                      }}
                    >
                      ✅{ev.approved} ❌{ev.disapproved} ⏳{ev.onProcess}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: ev.rate >= 60 ? "#36a420" : "#f59e0b",
                    textAlign: "right",
                  }}
                >
                  {ev.rate}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Drug + Beyond Timeline */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}
      >
        {/* Top Drugs */}
        <Card ui={ui} style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 14px 8px",
              borderBottom: `1px solid ${ui.divider}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              💊 Top Drug Applications
            </p>
            <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
              Top 8 by volume
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 60px 60px 60px 70px",
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            {["Drug", "Total", "✅", "❌", "Rate"].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                  padding: "7px 10px",
                  textAlign: i > 0 ? "center" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {drugStats.map((drug, i) => {
            const rxShort =
              drug.rx === "Prescription Drug (RX)"
                ? "RX"
                : drug.rx === "Over-the-Counter (OTC)"
                  ? "OTC"
                  : "VAX";
            const rxClr =
              drug.rx === "Prescription Drug (RX)"
                ? FB
                : drug.rx === "Over-the-Counter (OTC)"
                  ? "#f59e0b"
                  : "#36a420";
            const rate = drug.total
              ? ((drug.approved / drug.total) * 100).toFixed(0)
              : "0";
            return (
              <div
                key={drug.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 60px 60px 60px 70px",
                  borderBottom:
                    i < drugStats.length - 1
                      ? `1px solid ${ui.divider}`
                      : "none",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = ui.hoverBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: `${rxClr}18`,
                      color: rxClr,
                      flexShrink: 0,
                    }}
                  >
                    {rxShort}
                  </span>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 500,
                      color: ui.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {drug.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: FB,
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  {drug.total}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#36a420",
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  {drug.approved}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#e02020",
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  {drug.disapproved}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                    color: parseInt(rate) >= 60 ? "#36a420" : "#f59e0b",
                  }}
                >
                  {rate}%
                </span>
              </div>
            );
          })}
        </Card>

        {/* Beyond Timeline per User */}
        <Card ui={ui} style={{ padding: "14px 16px" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            ⚠ Beyond Timeline
          </p>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Applications past deadline per user
          </p>
          {evalStats.map((ev) => {
            const av = getAvatarColor(ev.name, uniqueEvaluators);
            const pct = ev.total
              ? ((ev.beyond / ev.total) * 100).toFixed(0)
              : "0";
            const clr =
              parseInt(pct) >= 50
                ? "#e02020"
                : parseInt(pct) >= 25
                  ? "#f59e0b"
                  : "#36a420";
            const role = USER_ROLE_MAP[ev.name] || "User";
            return (
              <div key={ev.name} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(ev.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: ui.textPrimary,
                      }}
                    >
                      {ev.name}
                    </span>
                    <div style={{ fontSize: "0.62rem", color: ui.textMuted }}>
                      {role}
                    </div>
                  </div>
                  <span
                    style={{ fontSize: "0.75rem", fontWeight: 800, color: clr }}
                  >
                    {ev.beyond}{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: ui.textMuted,
                        fontSize: "0.68rem",
                      }}
                    >
                      ({pct}%)
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 99,
                    background: ui.progressBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 99,
                      background: clr,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Top Countries */}
      <Card ui={ui} style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            background: colHdr,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              🌍 Top Countries by Entity Type
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Country of origin per application role · based on current filters
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: ui.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              Show Top
            </label>
            <select
              value={topCountryLimit}
              onChange={(e) => setTopCountryLimit(Number(e.target.value))}
              style={{
                ...inputSt,
                padding: "4px 8px",
                fontSize: "0.78rem",
                minWidth: 60,
              }}
            >
              {[5, 10, 15].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Entity Type Tabs */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            background: darkMode ? ui.cardBg : "#fafbfc",
          }}
        >
          {ENTITY_TYPES.map((et) => {
            const isAct = topCountryTab === et.key;
            const countryCount = new Set(
              chartFiltered.map((r) => r[et.key]).filter(Boolean),
            ).size;
            return (
              <button
                key={et.key}
                onClick={() => setTopCountryTab(et.key)}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.78rem",
                  fontWeight: isAct ? 700 : 500,
                  borderRadius: 8,
                  border: `1.5px solid ${isAct ? et.color : ui.cardBorder}`,
                  background: isAct ? `${et.color}14` : "transparent",
                  color: isAct ? et.color : ui.textMuted,
                  cursor: "pointer",
                  fontFamily: font,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  boxShadow: isAct ? `0 2px 8px ${et.color}25` : "none",
                }}
              >
                <span>{et.icon}</span>
                <span>{et.label}</span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 99,
                    background: isAct ? et.color : ui.inputBg,
                    color: isAct ? "#fff" : ui.textMuted,
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {countryCount}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "16px" }}>
          {topCountriesData.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No country data available for current filters
            </div>
          ) : (
            (() => {
              const activeEntity = ENTITY_TYPES.find(
                (et) => et.key === topCountryTab,
              );
              const maxCount = topCountriesData[0]?.count || 1;
              const totalCount = topCountriesData.reduce(
                (s, d) => s + d.count,
                0,
              );
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  {/* Left: Country Bars */}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 7 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                        }}
                      >
                        {activeEntity?.icon} {activeEntity?.label} Countries
                      </p>
                      <div
                        style={{ display: "flex", gap: 8, fontSize: "0.65rem" }}
                      >
                        {[
                          { dot: "#36a420", label: "Approved" },
                          { dot: "#e02020", label: "Disapproved" },
                          { dot: "#f59e0b", label: "On Process" },
                        ].map((l) => (
                          <div
                            key={l.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: l.dot,
                              }}
                            />
                            <span style={{ color: ui.textMuted }}>
                              {l.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {topCountriesData.map((d, i) => {
                      const pct =
                        totalCount > 0
                          ? ((d.count / totalCount) * 100).toFixed(1)
                          : "0.0";
                      const barWidth =
                        maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                      const approvedPct =
                        d.count > 0 ? (d.approved / d.count) * 100 : 0;
                      const disapprovedPct =
                        d.count > 0 ? (d.disapproved / d.count) * 100 : 0;
                      const onProcessPct =
                        d.count > 0 ? (d.onProcess / d.count) * 100 : 0;
                      const flag = COUNTRY_FLAGS[d.country] || "🌐";
                      const isTop = i === 0;
                      return (
                        <div
                          key={d.country}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: isTop
                              ? darkMode
                                ? `${activeEntity?.color}18`
                                : `${activeEntity?.color}0a`
                              : "transparent",
                            border: `1px solid ${isTop ? activeEntity?.color + "30" : ui.divider}`,
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isTop)
                              e.currentTarget.style.background = ui.hoverBg;
                          }}
                          onMouseLeave={(e) => {
                            if (!isTop)
                              e.currentTarget.style.background = "transparent";
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
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background:
                                  i < 3
                                    ? darkMode
                                      ? `${activeEntity?.color}30`
                                      : `${activeEntity?.color}18`
                                    : ui.inputBg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.58rem",
                                  fontWeight: 800,
                                  color:
                                    i < 3 ? activeEntity?.color : ui.textMuted,
                                }}
                              >
                                #{i + 1}
                              </span>
                            </div>
                            <span
                              style={{ fontSize: "0.95rem", lineHeight: 1 }}
                            >
                              {flag}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  color: ui.textPrimary,
                                }}
                              >
                                {d.country}
                              </span>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 800,
                                  color: activeEntity?.color,
                                }}
                              >
                                {d.count}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: ui.textMuted,
                                  marginLeft: 4,
                                }}
                              >
                                ({pct}%)
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 99,
                              background: ui.progressBg,
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                height: "100%",
                                width: `${(d.count / maxCount) * 100}%`,
                                background: activeEntity?.color + "30",
                                borderRadius: 99,
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                height: "100%",
                                width: `${(approvedPct / 100) * barWidth}%`,
                                background: "#36a420",
                                transition: "width 0.4s",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                left: `${(approvedPct / 100) * barWidth}%`,
                                top: 0,
                                height: "100%",
                                width: `${(disapprovedPct / 100) * barWidth}%`,
                                background: "#e02020",
                                transition: "width 0.4s, left 0.4s",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                left: `${((approvedPct + disapprovedPct) / 100) * barWidth}%`,
                                top: 0,
                                height: "100%",
                                width: `${(onProcessPct / 100) * barWidth}%`,
                                background: "#f59e0b",
                                transition: "width 0.4s, left 0.4s",
                              }}
                            />
                          </div>
                          <div
                            style={{ display: "flex", gap: 8, marginTop: 4 }}
                          >
                            <span
                              style={{ fontSize: "0.62rem", color: "#36a420" }}
                            >
                              ✅ {d.approved}
                            </span>
                            <span
                              style={{ fontSize: "0.62rem", color: "#e02020" }}
                            >
                              ❌ {d.disapproved}
                            </span>
                            <span
                              style={{ fontSize: "0.62rem", color: "#f59e0b" }}
                            >
                              ⏳ {d.onProcess}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Summary + Podium + Entity Table */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
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
                          value: new Set(
                            chartFiltered
                              .map((r) => r[topCountryTab])
                              .filter(Boolean),
                          ).size,
                          icon: "🌍",
                          color: activeEntity?.color,
                        },
                        {
                          label: "Total Apps",
                          value: topCountriesData.reduce(
                            (s, d) => s + d.count,
                            0,
                          ),
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
                          label: "#1 Share",
                          value: topCountriesData[0]
                            ? `${((topCountriesData[0].count / totalCount) * 100).toFixed(1)}%`
                            : "—",
                          icon: "📊",
                          color: "#9333ea",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: darkMode ? ui.inputBg : "#f8f9fd",
                            border: `1px solid ${ui.divider}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 2,
                            }}
                          >
                            <span style={{ fontSize: "0.8rem" }}>{s.icon}</span>
                            <span
                              style={{
                                fontSize: "0.62rem",
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
                              fontSize: s.small ? "0.78rem" : "1.1rem",
                              fontWeight: 800,
                              color: s.color,
                              lineHeight: 1.2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Podium */}
                    <div
                      style={{
                        background: darkMode ? ui.inputBg : "#f8f9fd",
                        borderRadius: 10,
                        padding: "14px",
                        border: `1px solid ${ui.divider}`,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: "0.75rem",
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
                          const pct =
                            totalCount > 0
                              ? ((d.count / totalCount) * 100).toFixed(1)
                              : "0";
                          const flag = COUNTRY_FLAGS[d.country] || "🌐";
                          const medals = ["🥇", "🥈", "🥉"];
                          const heights = [80, 60, 48];
                          const isFirst = rank === 0;
                          const colors = [
                            activeEntity?.color,
                            "#9ca3af",
                            "#b45309",
                          ];
                          const c = colors[rank];
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
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: c,
                                }}
                              >
                                {medals[rank]} #{rank + 1}
                              </span>
                              <div
                                style={{
                                  width: "100%",
                                  background: isFirst
                                    ? darkMode
                                      ? `${c}25`
                                      : `${c}12`
                                    : darkMode
                                      ? "#3a3b3c"
                                      : "#e5e7eb",
                                  borderRadius: "8px 8px 0 0",
                                  height: heights[rank],
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 2,
                                  border: `2px solid ${c}${isFirst ? "50" : "40"}`,
                                  boxShadow: isFirst
                                    ? `0 4px 12px ${c}20`
                                    : "none",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: isFirst ? "1.4rem" : "1rem",
                                  }}
                                >
                                  {flag}
                                </span>
                                <span
                                  style={{
                                    fontSize: isFirst ? "0.68rem" : "0.62rem",
                                    fontWeight: isFirst ? 800 : 700,
                                    color: isFirst ? c : ui.textSub,
                                    textAlign: "center",
                                    lineHeight: 1.2,
                                    maxWidth: 75,
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
                                  background: `${c}18`,
                                  borderRadius: "0 0 6px 6px",
                                  padding: "4px 0",
                                  textAlign: "center",
                                  border: `1px solid ${c}30`,
                                  borderTop: "none",
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: isFirst ? "1rem" : "0.85rem",
                                    fontWeight: 800,
                                    color: c,
                                  }}
                                >
                                  {d.count}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.62rem",
                                    color: isFirst ? c : ui.textMuted,
                                    fontWeight: isFirst ? 600 : 400,
                                  }}
                                >
                                  {pct}%
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* #1 per Entity */}
                    <div
                      style={{
                        background: darkMode ? ui.inputBg : "#f8f9fd",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: `1px solid ${ui.divider}`,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 10px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: ui.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        📌 #1 Country per Entity
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {ENTITY_TYPES.map((et) => {
                          const map = {};
                          chartFiltered.forEach((row) => {
                            const c = row[et.key];
                            if (c) map[c] = (map[c] || 0) + 1;
                          });
                          const sorted = Object.entries(map).sort(
                            (a, b) => b[1] - a[1],
                          );
                          const top = sorted[0];
                          const flag = top
                            ? COUNTRY_FLAGS[top[0]] || "🌐"
                            : "—";
                          const isActive = topCountryTab === et.key;
                          return (
                            <div
                              key={et.key}
                              onClick={() => setTopCountryTab(et.key)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "5px 8px",
                                borderRadius: 6,
                                cursor: "pointer",
                                background: isActive
                                  ? `${et.color}14`
                                  : "transparent",
                                border: `1px solid ${isActive ? et.color + "30" : "transparent"}`,
                                transition: "all 0.12s",
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive)
                                  e.currentTarget.style.background = ui.hoverBg;
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive)
                                  e.currentTarget.style.background = isActive
                                    ? `${et.color}14`
                                    : "transparent";
                              }}
                            >
                              <span style={{ fontSize: "0.85rem" }}>
                                {et.icon}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: et.color,
                                  minWidth: 80,
                                }}
                              >
                                {et.label}
                              </span>
                              <span style={{ fontSize: "0.85rem" }}>
                                {flag}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: ui.textPrimary,
                                  flex: 1,
                                }}
                              >
                                {top ? top[0] : "N/A"}
                              </span>
                              {top && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    color: et.color,
                                    background: `${et.color}15`,
                                    padding: "1px 7px",
                                    borderRadius: 99,
                                  }}
                                >
                                  {top[1]}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </Card>
    </div>
  );
}
