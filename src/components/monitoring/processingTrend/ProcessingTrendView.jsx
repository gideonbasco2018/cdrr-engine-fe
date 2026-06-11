// src/components/monitoring/processingTrend/ProcessingTrendView.jsx
// Trend of Received and Released Applications with categorical filters

import { useState, useEffect, useRef, useMemo } from "react";
import { Chart, registerables } from "chart.js";
import {
  getProcessingTrend,
  getProcessingBreakdown,
  getSummary,
} from "../../../api/monitoring";

Chart.register(...registerables);

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "All Years" },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: String(CURRENT_YEAR - i),
    label: String(CURRENT_YEAR - i),
  })),
];

const GROUP_BY_OPTIONS = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const DIMENSION_OPTIONS = [
  { value: "doc_type", label: "Document Type Released" },
  { value: "processing_type", label: "Processing Type" },
  { value: "entry_type", label: "Entry Type" },
  { value: "app_status", label: "Application Status" },
  { value: "app_type", label: "Application Type" },
];

const BAR_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

// ── Static weekly data — swap with API call later ─────────────────────────────
const STATIC_WEEKLY_DATA = {
  periodLabel: "Week 11 (18 – 22 May 2026)",
  carryOverCutoff: "22 May 2026",
  rows: [
    {
      appType: "Monitored Release",
      carryOver: 52,
      received: 4,
      processed: 3,
      totalPending: 53,
    },
    {
      appType: "Initial",
      carryOver: 42,
      received: 1,
      processed: 0,
      totalPending: 43,
    },
    {
      appType: "Variation",
      carryOver: 168,
      received: 14,
      processed: 2,
      totalPending: 180,
    },
  ],
  overallStatus: [
    { label: "Ongoing Evaluation", highlight: true, count: 276 },
    { label: "Ongoing Safety & Efficacy Evaluation", count: 42 },
    { label: "Ongoing Quality Evaluation", count: 41 },
    { label: "For Checking of Senior Evaluator", count: 102 },
    { label: "Issued Notice of Deficiency (eNOD)", count: 29 },
    { label: "Decked (pending)", rightAlign: true, count: 62 },
  ],
};

// ── Date helpers ──────────────────────────────────────────────────────────────
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
function todayISO() {
  return toISODate(new Date());
}
function firstOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  return toISODate(d);
}
function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonBox({ height = 74, borderRadius = 10, ui }) {
  return (
    <div
      style={{
        height,
        borderRadius,
        background: ui.inputBg,
        opacity: 0.6,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",
          animation: "ptshimmer 1.4s infinite",
        }}
      />
      <style>{`@keyframes ptshimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}
// ── Trend Donut Chart ─────────────────────────────────────────────────────────

function TrendDonutChart({ totalReceived, totalReleased, darkMode, font, ui }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const total = totalReceived + totalReleased;
  const receivedPct =
    total > 0 ? ((totalReceived / total) * 100).toFixed(1) : 0;
  const releasedPct =
    total > 0 ? ((totalReleased / total) * 100).toFixed(1) : 0;

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: ["Received", "Released"],
        datasets: [
          {
            data: [totalReceived, totalReleased],
            backgroundColor: ["#2563eb", "#10b981"],
            borderColor: darkMode ? "#1a1d23" : "#ffffff",
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct =
                  total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [totalReceived, totalReleased, darkMode]);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Donut */}
      <div style={{ position: "relative", width: 200, height: 200 }}>
        <canvas ref={canvasRef} />
        {/* Center label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: ui?.textPrimary || "#fff",
              fontFamily: font,
            }}
          >
            {total.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: font,
            }}
          >
            Total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 24 }}>
        {[
          {
            label: "Received",
            value: totalReceived,
            pct: receivedPct,
            color: "#2563eb",
          },
          {
            label: "Released",
            value: totalReleased,
            pct: releasedPct,
            color: "#10b981",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: item.color,
                }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  fontFamily: font,
                }}
              >
                {item.label}
              </span>
            </div>
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: item.color,
                fontFamily: font,
              }}
            >
              {item.value.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#6b7280",
                fontFamily: font,
              }}
            >
              {item.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProcessingTrendView({ ui, darkMode }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  // ── Categorical filters ───────────────────────────────────────────────────
  const [docType, setDocType] = useState("");
  const [processingType, setProcessingType] = useState("");
  const [entryType, setEntryType] = useState("");
  const [appStatus, setAppStatus] = useState("");
  const [appType, setAppType] = useState("");

  // Day range
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  // Month range
  const [monthFrom, setMonthFrom] = useState(currentYearMonth());
  const [monthTo, setMonthTo] = useState(currentYearMonth());

  const [dateMode, setDateMode] = useState("year");
  const [yearValue, setYearValue] = useState("");

  // Dropdown option lists (populated from trend API)
  const [docTypes, setDocTypes] = useState([]);
  const [processingTypes, setProcessingTypes] = useState([]);
  const [entryTypes, setEntryTypes] = useState([]);
  const [appStatuses, setAppStatuses] = useState([]);
  const [appTypes, setAppTypes] = useState([]);

  // ── Trend state ───────────────────────────────────────────────────────────
  const [groupBy, setGroupBy] = useState("month");
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const trendChartRef = useRef(null);
  const trendChartInstance = useRef(null);

  // ── Breakdown state ───────────────────────────────────────────────────────
  const [dimension, setDimension] = useState("doc_type");
  const [breakdownData, setBreakdownData] = useState([]);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const barChartRef = useRef(null);
  const barChartInstance = useRef(null);

  // ── Active tab ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("trend");

  // ── Weekly data (static — replace with API call later) ───────────────────
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const weeklyTotals = useMemo(() => {
    if (!weeklyData?.rows) {
      return {
        carryOver: 0,
        received: 0,
        processed: 0,
        totalPending: 0,
      };
    }

    return weeklyData.rows.reduce(
      (acc, r) => ({
        carryOver: acc.carryOver + r.carryOver,
        received: acc.received + r.received,
        processed: acc.processed + r.processed,
        totalPending: acc.totalPending + r.totalPending,
      }),
      {
        carryOver: 0,
        received: 0,
        processed: 0,
        totalPending: 0,
      },
    );
  }, [weeklyData]);

  // ── Shared filter params — date mode drives year/date_from/date_to ────────
  const sharedParams = useMemo(() => {
    const base = {
      doc_type: docType || null,
      processing_type: processingType || null,
      entry_type: entryType || null,
      app_status: appStatus || null,
      app_type: appType || null,
      year: null,
      date_from: null,
      date_to: null,
    };

    if (dateMode === "year") {
      base.year = yearValue || null;
    } else if (dateMode === "month") {
      base.date_from = monthFrom ? `${monthFrom}-01` : null;
      if (monthTo) {
        const [y, m] = monthTo.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        base.date_to = `${monthTo}-${String(lastDay).padStart(2, "0")}`;
      }
    } else {
      // day
      base.date_from = dateFrom || null;
      base.date_to = dateTo || null;
    }

    return base;
  }, [
    dateMode,
    yearValue,
    monthFrom,
    monthTo,
    dateFrom,
    dateTo,
    docType,
    processingType,
    entryType,
    appStatus,
    appType,
  ]);

  // ── Fetch trend ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setTrendLoading(true);
    getProcessingTrend({ group_by: groupBy || null, ...sharedParams })
      .then((res) => {
        if (cancelled) return;
        setTrendData(res.data || []);
        setDocTypes(res.doc_types || []);
        setProcessingTypes(res.processing_types || []);
        setEntryTypes(res.entry_types || []);
        setAppStatuses(res.app_statuses || []);
        setAppTypes(res.app_types || []);
      })
      .catch(() => {
        if (!cancelled) setTrendData([]);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupBy, sharedParams]);

  // ── Fetch breakdown ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setBreakdownLoading(true);
    getProcessingBreakdown({ dimension, ...sharedParams })
      .then((res) => {
        if (!cancelled) setBreakdownData(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setBreakdownData([]);
      })
      .finally(() => {
        if (!cancelled) setBreakdownLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dimension, sharedParams]);

  useEffect(() => {
    let cancelled = false;

    setWeeklyLoading(true);

    getSummary(sharedParams)
      .then((res) => {
        if (!cancelled) {
          setWeeklyData({
            ...res,
            rows: (res.rows || []).map((r) => ({
              appType: r.app_type,
              carryOver: r.carry_over,
              received: r.received,
              processed: r.processed,
              totalPending: r.total_pending,
            })),
          });
        }
      })
      .catch((err) => {
        console.error("Summary Error:", err);

        if (!cancelled) {
          setWeeklyData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWeeklyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sharedParams]);

  // ── Trend chart ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (trendLoading || !trendChartRef.current || activeTab !== "trend") return;
    trendChartInstance.current?.destroy();
    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    trendChartInstance.current = new Chart(trendChartRef.current, {
      type: "line",
      data: {
        labels: trendData.map((d) => d.period),
        datasets: [
          {
            label: "Received",
            data: trendData.map((d) => d.received_count),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: "#2563eb",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
          },
          {
            label: "Released",
            data: trendData.map((d) => d.released_count),
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: "#10b981",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: tickCol,
              font: { size: 12, family: font },
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          x: {
            ticks: { color: tickCol, font: { size: 11 }, maxRotation: 45 },
            grid: { color: gridCol },
            border: { display: false },
          },
          y: {
            ticks: { color: tickCol, font: { size: 11 } },
            grid: { color: gridCol },
            border: { display: false },
            beginAtZero: true,
          },
        },
      },
    });
    return () => {
      trendChartInstance.current?.destroy();
    };
  }, [trendData, darkMode, trendLoading, activeTab]);

  // ── Breakdown chart ───────────────────────────────────────────────────────
  useEffect(() => {
    if (breakdownLoading || !barChartRef.current || activeTab !== "breakdown")
      return;
    barChartInstance.current?.destroy();
    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    barChartInstance.current = new Chart(barChartRef.current, {
      type: "bar",
      data: {
        labels: breakdownData.map((d) => d.label),
        datasets: [
          {
            label: "Count",
            data: breakdownData.map((d) => d.count),
            backgroundColor: breakdownData.map(
              (_, i) => BAR_COLORS[i % BAR_COLORS.length] + "cc",
            ),
            borderColor: breakdownData.map(
              (_, i) => BAR_COLORS[i % BAR_COLORS.length],
            ),
            borderWidth: 1.5,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          x: {
            ticks: { color: tickCol, font: { size: 11 } },
            grid: { color: gridCol },
            border: { display: false },
            beginAtZero: true,
          },
          y: {
            ticks: {
              color: tickCol,
              font: { size: 11 },
              callback: (val, i) => {
                const lbl = breakdownData[i]?.label || "";
                return lbl.length > 30 ? lbl.slice(0, 28) + "…" : lbl;
              },
            },
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    });
    return () => {
      barChartInstance.current?.destroy();
    };
  }, [breakdownData, darkMode, breakdownLoading, activeTab]);

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalReceived = trendData.reduce((s, d) => s + d.received_count, 0);
  const totalReleased = trendData.reduce((s, d) => s + d.released_count, 0);
  const totalBreakdown = breakdownData.reduce((s, d) => s + d.count, 0);

  // ── Defaults & reset helpers ──────────────────────────────────────────────
  const DEFAULT_DATE_FROM = firstOfMonthISO();
  const DEFAULT_DATE_TO = todayISO();
  const DEFAULT_MONTH = currentYearMonth();

  const hasDateFilter =
    dateMode === "year"
      ? yearValue !== ""
      : dateMode === "month"
        ? monthFrom !== DEFAULT_MONTH || monthTo !== DEFAULT_MONTH
        : dateFrom !== DEFAULT_DATE_FROM || dateTo !== DEFAULT_DATE_TO;

  const hasDropdownFilter = !!(
    docType ||
    processingType ||
    entryType ||
    appStatus ||
    appType
  );
  const hasAnyFilter = hasDropdownFilter || hasDateFilter;

  function resetAll() {
    setDocType("");
    setProcessingType("");
    setEntryType("");
    setAppStatus("");
    setAppType("");
    setYearValue(String(CURRENT_YEAR));
    setMonthFrom(DEFAULT_MONTH);
    setMonthTo(DEFAULT_MONTH);
    setDateFrom(DEFAULT_DATE_FROM);
    setDateTo(DEFAULT_DATE_TO);
  }

  // Quick date presets (day mode only)
  const PRESETS = [
    {
      label: "This Week",
      fn: () => {
        const d = new Date(),
          day = d.getDay();
        const mon = new Date(d);
        mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        setDateFrom(toISODate(mon));
        setDateTo(todayISO());
      },
    },
    {
      label: "This Month",
      fn: () => {
        setDateFrom(firstOfMonthISO());
        setDateTo(todayISO());
      },
    },
    {
      label: "Last Month",
      fn: () => {
        const d = new Date();
        setDateFrom(toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
        setDateTo(toISODate(new Date(d.getFullYear(), d.getMonth(), 0)));
      },
    },
    {
      label: "This Year",
      fn: () => {
        setDateFrom(`${new Date().getFullYear()}-01-01`);
        setDateTo(todayISO());
      },
    },
  ];

  // ── Shared styles ─────────────────────────────────────────────────────────
  const selectStyle = {
    padding: "6px 12px",
    borderRadius: 7,
    border: `1px solid ${ui.cardBorder}`,
    background: ui.inputBg,
    color: ui.textPrimary,
    fontSize: "0.82rem",
    cursor: "pointer",
    outline: "none",
    fontFamily: font,
  };
  const labelStyle = {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: ui.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const tabBase = {
    padding: "6px 16px",
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
    fontFamily: font,
    transition: "background 0.15s, color 0.15s",
  };
  const thStyle = {
    padding: "9px 14px",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: ui.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: `2px solid ${ui.cardBorder}`,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "11px 14px",
    fontSize: "0.85rem",
    color: ui.textPrimary,
    borderBottom: `1px solid ${ui.cardBorder}`,
    textAlign: "center",
  };

  const TABS = [
    { value: "trend", label: "📈 Trend" },
    { value: "breakdown", label: "📊 Breakdown" },
    { value: "weekly", label: "📋 Summary" },
  ];

  const DATE_MODES = [
    { value: "day", label: "Day Range" },
    { value: "month", label: "Month Range" },
    { value: "year", label: "By Year" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: font, padding: 0 }}>
      {/* ── Header + Tab switcher ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.15rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Application Processing Trend
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.78rem",
              color: ui.textMuted,
            }}
          >
            Received vs released over time, with categorical breakdowns
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                ...tabBase,
                background: activeTab === tab.value ? "#2563eb" : ui.inputBg,
                color: activeTab === tab.value ? "#fff" : ui.textMuted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SHARED FILTER BAR — applies to ALL tabs
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 18,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Row 1 — Categorical dropdowns */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>Doc Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              style={{ ...selectStyle, minWidth: 160 }}
            >
              <option value="">All</option>
              {docTypes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>Processing Type</label>
            <select
              value={processingType}
              onChange={(e) => setProcessingType(e.target.value)}
              style={{ ...selectStyle, minWidth: 140 }}
            >
              <option value="">All</option>
              {processingTypes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>Entry Type</label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              style={selectStyle}
            >
              <option value="">All</option>
              {entryTypes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>App Status</label>
            <select
              value={appStatus}
              onChange={(e) => setAppStatus(e.target.value)}
              style={{ ...selectStyle, minWidth: 140 }}
            >
              <option value="">All</option>
              {appStatuses.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>App Type</label>
            <select
              value={appType}
              onChange={(e) => setAppType(e.target.value)}
              style={{ ...selectStyle, minWidth: 140 }}
            >
              <option value="">All</option>
              {appTypes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{ height: 1, background: ui.cardBorder, margin: "0 -14px" }}
        />

        {/* Row 2 — Date mode toggle + dynamic inputs */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          {/* Mode selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>📅 Filter By</label>
            <div style={{ display: "flex", gap: 4 }}>
              {DATE_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setDateMode(m.value)}
                  style={{
                    ...tabBase,
                    padding: "5px 11px",
                    fontSize: "0.75rem",
                    background: dateMode === m.value ? "#2563eb" : ui.inputBg,
                    color: dateMode === m.value ? "#fff" : ui.textMuted,
                    border: `1px solid ${
                      dateMode === m.value ? "#2563eb" : ui.cardBorder
                    }`,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── By Year ── */}
          {dateMode === "year" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>Year</label>
              <select
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
                style={selectStyle}
              >
                {YEAR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Month Range ── */}
          {dateMode === "month" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>From</label>
                <input
                  type="month"
                  value={monthFrom}
                  max={monthTo}
                  onChange={(e) => setMonthFrom(e.target.value)}
                  style={selectStyle}
                />
              </div>
              <span
                style={{
                  color: ui.textMuted,
                  fontSize: "0.85rem",
                  paddingBottom: 7,
                }}
              >
                →
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>To</label>
                <input
                  type="month"
                  value={monthTo}
                  min={monthFrom}
                  onChange={(e) => setMonthTo(e.target.value)}
                  style={selectStyle}
                />
              </div>
            </>
          )}

          {/* ── Day Range ── */}
          {dateMode === "day" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>From</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={selectStyle}
                />
              </div>
              <span
                style={{
                  color: ui.textMuted,
                  fontSize: "0.85rem",
                  paddingBottom: 7,
                }}
              >
                →
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>To</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={selectStyle}
                />
              </div>
              {/* Quick presets — day mode only */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Quick Select</label>
                <div style={{ display: "flex", gap: 5 }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={p.fn}
                      style={{
                        ...tabBase,
                        padding: "5px 10px",
                        fontSize: "0.75rem",
                        background: ui.inputBg,
                        color: ui.textMuted,
                        border: `1px solid ${ui.cardBorder}`,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reset all */}
          {hasAnyFilter && (
            <button
              onClick={resetAll}
              style={{
                ...tabBase,
                padding: "5px 12px",
                fontSize: "0.78rem",
                background: "transparent",
                color: "#ef4444",
                border: "1px solid #ef4444",
                marginLeft: "auto",
                alignSelf: "flex-end",
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {hasAnyFilter && (
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}
          >
            <span
              style={{ ...labelStyle, alignSelf: "center", marginRight: 2 }}
            >
              Active:
            </span>
            {[
              docType && {
                k: "dt",
                lbl: `Doc: ${docType}`,
                clear: () => setDocType(""),
              },
              processingType && {
                k: "pt",
                lbl: `Proc: ${processingType}`,
                clear: () => setProcessingType(""),
              },
              entryType && {
                k: "et",
                lbl: `Entry: ${entryType}`,
                clear: () => setEntryType(""),
              },
              appStatus && {
                k: "as",
                lbl: `Status: ${appStatus}`,
                clear: () => setAppStatus(""),
              },
              appType && {
                k: "at",
                lbl: `App Type: ${appType}`,
                clear: () => setAppType(""),
              },
              // Date chip — label changes per mode
              hasDateFilter &&
                dateMode === "year" && {
                  k: "dr",
                  lbl: `Year: ${yearValue}`,
                  clear: () => setYearValue(""), // ← "" = All Years
                },
              hasDateFilter &&
                dateMode === "month" && {
                  k: "dr",
                  lbl: `${monthFrom} → ${monthTo}`,
                  clear: () => {
                    setMonthFrom(DEFAULT_MONTH);
                    setMonthTo(DEFAULT_MONTH);
                  },
                },
              hasDateFilter &&
                dateMode === "day" && {
                  k: "dr",
                  lbl: `${dateFrom} → ${dateTo}`,
                  clear: () => {
                    setDateFrom(DEFAULT_DATE_FROM);
                    setDateTo(DEFAULT_DATE_TO);
                  },
                },
            ]
              .filter(Boolean)
              .map((chip) => (
                <span
                  key={chip.k}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: darkMode
                      ? "rgba(37,99,235,0.18)"
                      : "rgba(37,99,235,0.09)",
                    border: "1px solid rgba(37,99,235,0.3)",
                    borderRadius: 20,
                    padding: "3px 8px 3px 10px",
                    fontSize: "0.73rem",
                    color: "#2563eb",
                    fontWeight: 600,
                  }}
                >
                  {chip.lbl}
                  <button
                    onClick={chip.clear}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#2563eb",
                      fontSize: "1rem",
                      padding: "0 0 1px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Trend
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "trend" && (
        <>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 14,
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Group by:</span>
            {GROUP_BY_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setGroupBy(o.value)}
                style={{
                  ...tabBase,
                  padding: "4px 12px",
                  background: groupBy === o.value ? "#2563eb" : ui.inputBg,
                  color: groupBy === o.value ? "#fff" : ui.textMuted,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              {
                label: "Total Received",
                value: totalReceived,
                color: "#2563eb",
              },
              {
                label: "Total Released",
                value: totalReleased,
                color: "#10b981",
              },
              {
                label: "Periods",
                value: trendData.length,
                color: ui.textPrimary,
              },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  background: ui.inputBg,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: "0.7rem",
                    color: ui.textMuted,
                  }}
                >
                  {c.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: c.color,
                  }}
                >
                  {trendLoading ? "..." : c.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            {trendLoading ? (
              <SkeletonBox height={380} borderRadius={10} ui={ui} />
            ) : trendData.length === 0 ? (
              <div
                style={{
                  height: 380,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ui.textMuted,
                  fontSize: "0.85rem",
                }}
              >
                No data available for the selected filters.
              </div>
            ) : (
              <div style={{ height: 380 }}>
                <canvas ref={trendChartRef} />
              </div>
            )}
          </div>

          {/* ── Period Table + Donut Chart ── */}
          {!trendLoading && trendData.length > 0 && (
            <>
              <div
                style={{
                  marginTop: 20,
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: ui.textPrimary,
                  }}
                >
                  📋 Period Breakdown
                </span>
                <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                  {trendData.length} periods
                </span>
              </div>
              <div
                style={{ display: "flex", gap: 16, alignItems: "flex-start" }}
              >
                {/* Table — 50% */}
                <div
                  style={{
                    flex: "0 0 50%",
                    background: ui.cardBg,
                    border: `1px solid ${ui.cardBorder}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    marginBottom: 32,
                  }}
                >
                  <div
                    style={{
                      overflowX: "auto",
                      maxHeight: 420,
                      overflowY: "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: 300,
                      }}
                    >
                      <thead>
                        <tr>
                          {["Period", "Received", "Released"].map((h) => (
                            <th
                              key={h}
                              style={{
                                position: "sticky",
                                top: 0,
                                zIndex: 2,
                                background: darkMode ? "#1e2025" : "#f5f5f7",
                                padding: "10px 16px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: ui.textMuted,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                borderBottom: `2px solid ${ui.cardBorder}`,
                                textAlign: h === "Period" ? "left" : "center",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...trendData].reverse().map((row) => (
                          <tr
                            key={row.period}
                            style={{ transition: "background 0.1s" }}
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
                                padding: "10px 16px",
                                fontSize: "0.83rem",
                                fontWeight: 600,
                                color: ui.textPrimary,
                                borderBottom: `1px solid ${ui.cardBorder}`,
                              }}
                            >
                              {row.period}
                            </td>
                            <td
                              style={{
                                padding: "10px 16px",
                                fontSize: "0.83rem",
                                color: "#2563eb",
                                fontWeight: 600,
                                textAlign: "center",
                                borderBottom: `1px solid ${ui.cardBorder}`,
                              }}
                            >
                              {row.received_count.toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "10px 16px",
                                fontSize: "0.83rem",
                                color: "#10b981",
                                fontWeight: 600,
                                textAlign: "center",
                                borderBottom: `1px solid ${ui.cardBorder}`,
                              }}
                            >
                              {row.released_count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Donut Chart — remaining 50% */}
                <div
                  style={{
                    flex: 1,
                    background: ui.cardBg,
                    border: `1px solid ${ui.cardBorder}`,
                    borderRadius: 12,
                    padding: "24px 16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 320,
                    marginBottom: 32,
                  }}
                >
                  <TrendDonutChart
                    totalReceived={totalReceived}
                    totalReleased={totalReleased}
                    darkMode={darkMode}
                    font={font}
                    ui={ui}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Breakdown
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "breakdown" && (
        <>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 14,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={labelStyle}>Group by:</span>
            {DIMENSION_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setDimension(o.value)}
                style={{
                  ...tabBase,
                  padding: "4px 12px",
                  background: dimension === o.value ? "#2563eb" : ui.inputBg,
                  color: dimension === o.value ? "#fff" : ui.textMuted,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              {
                label: "Total Records",
                value: totalBreakdown,
                color: "#2563eb",
              },
              {
                label: "Categories",
                value: breakdownData.length,
                color: ui.textPrimary,
              },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  background: ui.inputBg,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: "0.7rem",
                    color: ui.textMuted,
                  }}
                >
                  {c.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: c.color,
                  }}
                >
                  {breakdownLoading ? "..." : c.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            {breakdownLoading ? (
              <SkeletonBox
                height={Math.max(200, breakdownData.length * 40)}
                borderRadius={10}
                ui={ui}
              />
            ) : breakdownData.length === 0 ? (
              <div
                style={{
                  height: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ui.textMuted,
                  fontSize: "0.85rem",
                }}
              >
                No data available for the selected filters.
              </div>
            ) : (
              <div style={{ height: Math.max(200, breakdownData.length * 42) }}>
                <canvas ref={barChartRef} />
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Weekly Status  (static — wire getWeeklyStatus() later)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "weekly" && (
        <>
          {/* Table 1 */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: ui.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Table 1 &nbsp;·&nbsp; Application Summary
              </p>
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                Carry Over until {weeklyData?.carryOverCutoff ?? "-"}
              </span>
            </div>
            <div
              style={{
                background: ui.cardBg,
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: darkMode
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                    }}
                  >
                    <th
                      style={{ ...thStyle, textAlign: "left", minWidth: 170 }}
                    >
                      Application Type
                    </th>
                    <th style={thStyle}>Carry Over</th>
                    <th style={thStyle}>Received</th>
                    <th style={thStyle}>Processed</th>
                    <th style={{ ...thStyle, color: ui.textPrimary }}>
                      Total Pending
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData?.rows?.map((row, i) => (
                    <tr
                      key={i}
                      style={{ transition: "background 0.1s" }}
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
                          ...tdStyle,
                          textAlign: "left",
                          fontWeight: 600,
                        }}
                      >
                        {row.appType}
                      </td>
                      <td style={tdStyle}>
                        {(row.carryOver ?? 0).toLocaleString()}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: "#2563eb",
                          fontWeight: 600,
                        }}
                      >
                        {(row.received ?? 0).toLocaleString()}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: "#10b981",
                          fontWeight: 600,
                        }}
                      >
                        {(row.processed ?? 0).toLocaleString()}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700,
                          color: "#2563eb",
                        }}
                      >
                        {(row.totalPending ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr
                    style={{
                      background: darkMode
                        ? "rgba(37,99,235,0.13)"
                        : "rgba(37,99,235,0.06)",
                    }}
                  >
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "left",
                        fontWeight: 700,
                        borderBottom: "none",
                        fontSize: "0.9rem",
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        borderBottom: "none",
                      }}
                    >
                      {weeklyTotals.carryOver.toLocaleString()}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        borderBottom: "none",
                        color: "#2563eb",
                      }}
                    >
                      {weeklyTotals.received.toLocaleString()}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        borderBottom: "none",
                        color: "#10b981",
                      }}
                    >
                      {weeklyTotals.processed.toLocaleString()}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 800,
                        borderBottom: "none",
                        color: "#f59e0b",
                        fontSize: "1.05rem",
                      }}
                    >
                      {weeklyTotals.totalPending.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2 */}
          <div>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: ui.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Table 2 &nbsp;·&nbsp; Overall Status of Applications
            </p>
            <div
              style={{
                background: ui.cardBg,
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 12,
                overflow: "hidden",
                maxWidth: 580,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {weeklyData?.overallStatus?.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        background: row.highlight
                          ? darkMode
                            ? "rgba(37,99,235,0.18)"
                            : "rgba(37,99,235,0.07)"
                          : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        !row.highlight &&
                        (e.currentTarget.style.background = darkMode
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.02)")
                      }
                      onMouseLeave={(e) =>
                        !row.highlight &&
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: row.rightAlign ? "right" : "left",
                          fontWeight: row.highlight ? 700 : 400,
                          paddingLeft: row.rightAlign ? 12 : 16,
                          borderBottom:
                            i === weeklyData.overallStatus.length - 1
                              ? "none"
                              : `1px solid ${ui.cardBorder}`,
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          width: 90,
                          fontWeight: row.highlight ? 700 : 500,
                          fontSize: row.highlight ? "1rem" : "0.85rem",
                          color: row.highlight ? "#2563eb" : ui.textPrimary,
                          borderBottom:
                            i === weeklyData.overallStatus.length - 1
                              ? "none"
                              : `1px solid ${ui.cardBorder}`,
                        }}
                      >
                        {(row.count ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
