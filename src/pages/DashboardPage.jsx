// FILE: src/pages/DashboardPage.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getDashboardSummary,
  getDashboardChart,
  getDashboardRecentApplications,
  getDashboardDetail,
  getDashboardRecordByDtn,
  getDashboardAllRecentApplications,
} from "../api/dashboard";
import ApplicationLogsModal from "../components/tasks/ApplicationLogsModal";
import ViewDetailsModal from "../components/reports/actions/ViewDetailsModal";
import HowToUseDashboardModal, {
  useHowToUseDashboardGuide,
} from "../components/dashboard/HowToUseDashboardModal";

// ── Dashboard sub-components ──────────────────────────────────────────────────
import {
  makeUI,
  buildChartParams,
  mapPoint,
  getWorkingWeek,
  formatDateRange,
} from "../components/dashboard/utils";
import {
  FB,
  ALL_MONTHS,
  CURRENT_YEAR,
  CURRENT_MONTH_IDX,
  MONTHS_BY_YEAR,
  AVAILABLE_YEARS,
} from "../components/dashboard/constants";
import {
  Card,
  CardHeader,
  SeeAll,
} from "../components/dashboard/CardPrimitives";
import MetricTile from "../components/dashboard/MetricTile";
import AreaChart from "../components/dashboard/AreaChart";
import MetricDetailModal from "../components/dashboard/MetricDetailModal";
import RecentApplicationsModal from "../components/dashboard/RecentApplicationsModal";
import TargetModal from "../components/dashboard/TargetModal";
import AccomplishmentReport from "../components/dashboard/AccomplishmentReport";
import TargetsPanel from "../components/dashboard/TargetsPanel";
import SystemStatusCard from "../components/dashboard/SystemStatusCard";

// ─── Right panel ──────────────────────────────────────────────────────────────
function RightPanel({
  ui,
  dbConnections,
  toggleConn,
  canGenReport,
  reportStart,
  reportEnd,
  setCustomReportDates,
  setShowReport,
  setActiveTarget,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SystemStatusCard
        connections={dbConnections}
        onToggle={toggleConn}
        ui={ui}
      />

      {/* Accomplishment Report card */}
      <Card ui={ui}>
        <div style={{ padding: "14px 16px 10px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Accomplishment Report
          </h3>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Select a date range to generate
          </p>
        </div>
        <div
          style={{
            padding: "0 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={() =>
              canGenReport &&
              (setCustomReportDates({ start: reportStart, end: reportEnd }),
              setShowReport(true))
            }
            disabled={!canGenReport}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 8,
              border: `1.5px solid ${canGenReport ? FB : ui.metricBorder}`,
              background: canGenReport ? FB : "transparent",
              color: canGenReport ? "#fff" : ui.textMuted,
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: canGenReport ? "pointer" : "not-allowed",
              opacity: canGenReport ? 1 : 0.5,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (canGenReport) e.currentTarget.style.background = "#1565d8";
            }}
            onMouseLeave={(e) => {
              if (canGenReport) e.currentTarget.style.background = FB;
            }}
          >
            📋 Generate Report
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Data table ────────────────────────────────────────────────────────────────
function DataTable({
  chartData,
  chartTotals,
  breakdown,
  chartSubtitle,
  chartLoading,
  ui,
}) {
  const TABLE_PAGE_SIZE = 13;
  const [tablePage, setTablePage] = useState(0);

  const totalPages = Math.ceil(chartData.length / TABLE_PAGE_SIZE);
  const safePage = Math.min(tablePage, Math.max(0, totalPages - 1));
  const pagedRows = chartData.slice(
    safePage * TABLE_PAGE_SIZE,
    (safePage + 1) * TABLE_PAGE_SIZE,
  );
  const startRow = safePage * TABLE_PAGE_SIZE + 1;
  const endRow = Math.min(startRow + TABLE_PAGE_SIZE - 1, chartData.length);
  const unitLabel =
    breakdown === "day" ? "day" : breakdown === "month" ? "month" : "year";

  const colLabel =
    breakdown === "day" ? "Day" : breakdown === "month" ? "Month" : "Year";

  return (
    <div
      style={{ borderTop: `1px solid ${ui.divider}`, padding: "0 16px 16px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 0 8px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Data Table{" "}
          <span
            style={{
              marginLeft: 8,
              fontSize: "0.72rem",
              fontWeight: 400,
              color: ui.textMuted,
            }}
          >
            📅 {chartSubtitle}
          </span>
        </p>
        <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
          {chartData.length > 0
            ? `${startRow}–${endRow} of ${chartData.length} ${unitLabel}${chartData.length !== 1 ? "s" : ""}`
            : ""}
        </span>
      </div>

      {chartLoading ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: ui.textMuted,
            fontSize: "0.82rem",
          }}
        >
          ⏳ Loading data…
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            borderRadius: 8,
            border: `1px solid ${ui.cardBorder}`,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
              fontFamily: "inherit",
            }}
          >
            <thead>
              <tr style={{ background: ui.pageBg }}>
                {[
                  { label: colLabel, align: "left", color: null },
                  { label: "Total Received", align: "right", color: "#1877F2" },
                  { label: "Completed", align: "right", color: "#36a420" },
                  { label: "On Process", align: "right", color: "#f59e0b" },
                  { label: "Target", align: "right", color: "#9333ea" },
                  { label: "Completed Rate", align: "right", color: "#9333ea" },
                ].map((col, ci) => (
                  <th
                    key={ci}
                    style={{
                      padding: "8px 12px",
                      textAlign: col.align,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: col.color || ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: `1px solid ${ui.cardBorder}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, ri) => {
                const rateN = row.completedRate;
                const isEven = ri % 2 === 0,
                  isLast = ri === pagedRows.length - 1;
                const border = !isLast ? `1px solid ${ui.divider}` : "none";
                return (
                  <tr
                    key={ri}
                    style={{
                      background: isEven ? "transparent" : `${ui.pageBg}88`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = isEven
                        ? "transparent"
                        : `${ui.pageBg}88`)
                    }
                  >
                    <td
                      style={{
                        padding: "7px 12px",
                        color: ui.textPrimary,
                        fontWeight: 600,
                        borderBottom: border,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.label}
                      {breakdown === "day" && (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: "0.68rem",
                            color: ui.textMuted,
                            fontWeight: 400,
                          }}
                        >
                          {chartSubtitle?.split(" ")[0]}
                        </span>
                      )}
                    </td>
                    {[
                      { val: row.received, color: "#1877F2" },
                      { val: row.completed, color: "#36a420" },
                      { val: row.onProcess, color: "#f59e0b" },
                    ].map((c, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "7px 12px",
                          textAlign: "right",
                          color: c.color,
                          fontWeight: 700,
                          borderBottom: border,
                        }}
                      >
                        {c.val.toLocaleString()}
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "7px 12px",
                        textAlign: "right",
                        color: "#9333ea",
                        fontWeight: 700,
                        borderBottom: border,
                      }}
                    >
                      {row.target > 0 ? row.target.toLocaleString() : "—"}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        textAlign: "right",
                        borderBottom: border,
                      }}
                    >
                      {rateN !== null ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: "0.73rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            color:
                              rateN >= 75
                                ? "#36a420"
                                : rateN >= 50
                                  ? "#f59e0b"
                                  : "#e02020",
                            background:
                              rateN >= 75
                                ? "#e9f7e6"
                                : rateN >= 50
                                  ? "#fff8e7"
                                  : "#fde8e8",
                          }}
                        >
                          {rateN >= 75 ? "▲" : rateN >= 50 ? "~" : "▼"}{" "}
                          {rateN.toFixed(1)}%
                        </span>
                      ) : (
                        <span
                          style={{ color: ui.textMuted, fontSize: "0.73rem" }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: ui.pageBg,
                  borderTop: `2px solid ${ui.cardBorder}`,
                }}
              >
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: ui.textPrimary,
                    fontSize: "0.78rem",
                  }}
                >
                  Total
                </td>
                {[
                  { val: chartTotals.received, color: "#1877F2" },
                  { val: chartTotals.completed, color: "#36a420" },
                  { val: chartTotals.onProcess, color: "#f59e0b" },
                  { val: chartTotals.target, color: "#9333ea" },
                ].map((c, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: c.color,
                      fontSize: "0.82rem",
                    }}
                  >
                    {(c.val ?? 0).toLocaleString()}
                  </td>
                ))}
                {(() => {
                  const n = chartTotals.completedRate;
                  return (
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      {n !== null ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 99,
                            color:
                              n >= 75
                                ? "#36a420"
                                : n >= 50
                                  ? "#f59e0b"
                                  : "#e02020",
                            background:
                              n >= 75
                                ? "#e9f7e6"
                                : n >= 50
                                  ? "#fff8e7"
                                  : "#fde8e8",
                          }}
                        >
                          {n >= 75 ? "▲" : n >= 50 ? "~" : "▼"} {n.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: ui.textMuted }}>—</span>
                      )}
                    </td>
                  );
                })()}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            gap: 8,
          }}
        >
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            Page {safePage + 1} of {totalPages}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setTablePage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${safePage === 0 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: safePage === 0 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: safePage === 0 ? "not-allowed" : "pointer",
                opacity: safePage === 0 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              ‹ Prev
            </button>
            {Array.from({ length: totalPages }, (_, pi) => {
              const show =
                pi === 0 ||
                pi === totalPages - 1 ||
                Math.abs(pi - safePage) <= 1;
              const showEllipsisBefore = pi === safePage - 2 && pi > 1;
              const showEllipsisAfter =
                pi === safePage + 2 && pi < totalPages - 2;
              if (!show && !showEllipsisBefore && !showEllipsisAfter)
                return null;
              if (showEllipsisBefore || showEllipsisAfter)
                return (
                  <span
                    key={pi}
                    style={{
                      fontSize: "0.74rem",
                      color: ui.textMuted,
                      padding: "0 2px",
                    }}
                  >
                    …
                  </span>
                );
              const isActive = pi === safePage;
              return (
                <button
                  key={pi}
                  onClick={() => setTablePage(pi)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: `1px solid ${isActive ? FB : ui.cardBorder}`,
                    background: isActive ? FB : "transparent",
                    color: isActive ? "#fff" : ui.textPrimary,
                    fontSize: "0.76rem",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {pi + 1}
                </button>
              );
            })}
            <button
              onClick={() =>
                setTablePage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={safePage === totalPages - 1}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${safePage === totalPages - 1 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color:
                  safePage === totalPages - 1 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: safePage === totalPages - 1 ? "not-allowed" : "pointer",
                opacity: safePage === totalPages - 1 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DashboardPage({ darkMode: darkModeProp }) {
  const [internalDark, setInternalDark] = useState(true);
  const darkMode = darkModeProp !== undefined ? darkModeProp : internalDark;
  const ui = useMemo(() => makeUI(darkMode), [darkMode]);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  // ── Controls ───────────────────────────────────────────────────────────────
  const [breakdown, setBreakdown] = useState("year");
  const [selYear, setSelYear] = useState(String(CURRENT_YEAR));
  const [selMonth, setSelMonth] = useState(ALL_MONTHS[CURRENT_MONTH_IDX]);
  const [activeMetric, setActiveMetric] = useState(0);
  const [activeTarget, setActiveTarget] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [customReportDates, setCustomReportDates] = useState(null);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [selectedDtnRecord, setSelectedDtnRecord] = useState(null);
  const { showGuide, openGuide, closeGuide } = useHowToUseDashboardGuide();
  const [logsModal, setLogsModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  // ── KPI state ──────────────────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // ── Chart state ────────────────────────────────────────────────────────────
  const [chartData, setChartData] = useState([]);
  const [chartTotals, setChartTotals] = useState({
    received: 0,
    completed: 0,
    onProcess: 0,
    target: 0,
    completedRate: null,
  });
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);
  const [chartSubtitle, setChartSubtitle] = useState("");

  // ── Accomplishment report dates ────────────────────────────────────────────
  const week = getWorkingWeek();
  const [reportStart, setReportStart] = useState(week.start);
  const [reportEnd, setReportEnd] = useState(week.end);
  const [reportDateErr, setReportDateErr] = useState("");
  const canGenReport = !reportDateErr && reportStart && reportEnd;

  // ── Recent apps ────────────────────────────────────────────────────────────
  const [recentApps, setRecentApps] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(null);

  // ── DB connections ─────────────────────────────────────────────────────────
  const [dbConnections, setDbConnections] = useState([
    {
      id: "doctrack",
      label: "Doctrack",
      desc: "Document Tracking DB",
      icon: "🗂️",
      active: true,
    },
    {
      id: "aws",
      label: "AWS",
      desc: "Cloud Storage & Services",
      icon: "☁️",
      active: true,
    },
    {
      id: "maindb",
      label: "Main DB",
      desc: "Primary Application DB",
      icon: "🗄️",
      active: true,
    },
  ]);
  const toggleConn = (id) =>
    setDbConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );

  // ── Mobile ────────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Global CSS ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = "cdrr-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `.cdrr-scroll::-webkit-scrollbar{width:7px}.cdrr-scroll::-webkit-scrollbar-track{background:transparent}.cdrr-scroll::-webkit-scrollbar-thumb{background:#3a3b3c;border-radius:99px}.cdrr-scroll::-webkit-scrollbar-thumb:hover{background:#555}.cdrr-scroll{scrollbar-width:thin;scrollbar-color:#3a3b3c transparent}@keyframes cdrrPulse{0%,100%{opacity:1}50%{opacity:0.4}}`;
      document.head.appendChild(s);
    }
    return () => {
      const el = document.getElementById("cdrr-style");
      if (el) el.remove();
    };
  }, []);

  // ── Fetch: KPI summary ────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const p = buildChartParams(breakdown, selYear, selMonth);
      const params = {};
      if (p.date_from) params.date_from = p.date_from;
      if (p.date_to) params.date_to = p.date_to;
      setLiveStats(await getDashboardSummary(params));
    } catch (err) {
      setStatsError(
        err?.response?.data?.detail || err.message || "Failed to load stats",
      );
      setLiveStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [breakdown, selYear, selMonth]);

  // ── Fetch: chart ──────────────────────────────────────────────────────────
  const fetchChart = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const params = buildChartParams(breakdown, selYear, selMonth);
      const res = await getDashboardChart(params);
      setChartData(res.data.map(mapPoint));
      setChartTotals({
        received: res.total_received ?? 0,
        completed: res.total_completed ?? 0,
        onProcess: res.total_on_process ?? 0,
        target: res.total_target ?? 0,
        completedRate: res.overall_completed_rate ?? null,
      });
      if (breakdown === "day") setChartSubtitle(`${selMonth} ${selYear}`);
      if (breakdown === "month") setChartSubtitle(selYear);
      if (breakdown === "year") setChartSubtitle("All Years");
    } catch (err) {
      setChartError(
        err?.response?.data?.detail ||
          err.message ||
          "Failed to load chart data",
      );
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [breakdown, selYear, selMonth]);

  // ── Fetch: recent apps ────────────────────────────────────────────────────
  const fetchRecentApps = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const res = await getDashboardRecentApplications({ limit: 10 });
      setRecentApps(res.data);
    } catch (err) {
      setRecentError(
        err?.response?.data?.detail || err.message || "Failed to load",
      );
      setRecentApps([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchChart();
  }, [fetchChart]);
  useEffect(() => {
    fetchRecentApps();
  }, [fetchRecentApps]);

  // ── Metrics array ─────────────────────────────────────────────────────────
  const metrics = [
    {
      icon: "👁️",
      label: "Total Received",
      metricKey: "received",
      value: liveStats ? liveStats.received : chartTotals.received,
      change: 8,
      isLive: true,
    },
    {
      icon: "✅",
      label: "Completed",
      metricKey: "completed",
      value: liveStats ? liveStats.completed : chartTotals.completed,
      change: -3,
      isLive: true,
    },
    {
      icon: "⏳",
      label: "On Process",
      metricKey: "on_process",
      value: liveStats ? liveStats.on_process : chartTotals.onProcess,
      change: 12,
      isLive: true,
    },
    {
      icon: "🎯",
      label: "Target",
      metricKey: null,
      value: chartTotals.target,
      change: 0,
      isLive: false,
    },
  ];

  // ── Date params for detail modal ──────────────────────────────────────────
  const currentDateParams = useMemo(() => {
    const p = buildChartParams(breakdown, selYear, selMonth);
    const out = {};
    if (p.date_from) out.date_from = p.date_from;
    if (p.date_to) out.date_to = p.date_to;
    return out;
  }, [breakdown, selYear, selMonth]);

  const openDetail = useCallback(
    (m) => {
      if (!m.metricKey) return;
      setDetailModal({
        metricKey: m.metricKey,
        metricLabel: m.label,
        dateParams: currentDateParams,
      });
    },
    [currentDateParams],
  );

  const handleDetailRowClick = useCallback(async (row) => {
    if (!row?.dtn) return;
    try {
      const fullRecord = await getDashboardRecordByDtn(row.dtn);
      setSelectedDtnRecord(fullRecord);
    } catch (err) {
      console.error("Failed to fetch full record:", err);
    }
  }, []);

  // ── Right-panel shared props ──────────────────────────────────────────────
  const rightPanelProps = {
    ui,
    dbConnections,
    toggleConn,
    canGenReport,
    reportStart,
    reportEnd,
    setCustomReportDates,
    setShowReport,
    setActiveTarget,
  };

  return (
    <>
      {/* Error toasts */}
      {(statsError || chartError) && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {statsError && (
            <div
              style={{
                background: "#e02020",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: 320,
              }}
            >
              <span>⚠️ Stats: {statsError}</span>
              <button
                onClick={fetchStats}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}
          {chartError && (
            <div
              style={{
                background: "#e02020",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: 320,
              }}
            >
              <span>⚠️ Chart: {chartError}</span>
              <button
                onClick={fetchChart}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          fontFamily: font,
        }}
      >
        <div
          className="cdrr-scroll"
          style={{
            display: "flex",
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "scroll",
            overflowX: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: isMobile ? "12px" : "16px",
              paddingBottom: 120,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 290px",
              gap: 16,
              alignItems: "start",
              boxSizing: "border-box",
            }}
          >
            {/* ── Left column ──────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Insights card */}
              <Card ui={ui}>
                <div style={{ padding: "14px 16px 0" }}>
                  {/* Insights header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                          margin: 0,
                        }}
                      >
                        Insights
                      </h2>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: ui.textSub,
                          margin: "2px 0 0",
                        }}
                      >
                        Learn how your applications are performing.
                      </p>
                      <button onClick={openGuide}>? How to use</button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* Breakdown toggle */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "3px",
                          borderRadius: 8,
                          background: ui.inputBg,
                          border: `1px solid ${ui.cardBorder}`,
                        }}
                      >
                        {[
                          { key: "day", label: "Daily" },
                          { key: "month", label: "Monthly" },
                          { key: "year", label: "Yearly" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => setBreakdown(opt.key)}
                            style={{
                              padding: "4px 11px",
                              borderRadius: 6,
                              border: "none",
                              background:
                                breakdown === opt.key ? FB : "transparent",
                              color:
                                breakdown === opt.key ? "#fff" : ui.textSub,
                              fontSize: "0.76rem",
                              fontWeight: breakdown === opt.key ? 700 : 500,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {/* Year picker */}
                      {(breakdown === "day" || breakdown === "month") && (
                        <select
                          value={selYear}
                          onChange={(e) => {
                            setSelYear(e.target.value);
                            if (breakdown === "day") {
                              const months =
                                MONTHS_BY_YEAR[e.target.value] || [];
                              if (!months.includes(selMonth))
                                setSelMonth(months[months.length - 1] || "Jan");
                            }
                          }}
                          style={{
                            padding: "4px 24px 4px 10px",
                            borderRadius: 7,
                            border: `1px solid ${ui.cardBorder}`,
                            background: ui.inputBg,
                            color: ui.textPrimary,
                            fontSize: "0.76rem",
                            fontFamily: "inherit",
                            outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2365676b' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      )}
                      {/* Month picker */}
                      {breakdown === "day" && (
                        <select
                          value={selMonth}
                          onChange={(e) => setSelMonth(e.target.value)}
                          style={{
                            padding: "4px 24px 4px 10px",
                            borderRadius: 7,
                            border: `1px solid ${ui.cardBorder}`,
                            background: ui.inputBg,
                            color: ui.textPrimary,
                            fontSize: "0.76rem",
                            fontFamily: "inherit",
                            outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2365676b' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          {(MONTHS_BY_YEAR[selYear] || []).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      )}
                      <SeeAll />
                    </div>
                  </div>

                  {/* KPI tiles */}
                  <div
                    style={{
                      display: "flex",
                      gap: isMobile ? 6 : 10,
                      marginBottom: 14,
                    }}
                  >
                    {metrics.map((m, i) => (
                      <MetricTile
                        key={i}
                        icon={m.icon}
                        label={m.label}
                        value={m.value}
                        change={m.change}
                        active={activeMetric === i}
                        onClick={() => {
                          setActiveMetric(i);
                          openDetail(m);
                        }}
                        ui={ui}
                        loading={m.isLive ? statsLoading : false}
                        isLive={m.isLive}
                      />
                    ))}
                  </div>
                </div>

                {/* Area chart */}
                <div style={{ padding: "0 16px 12px", position: "relative" }}>
                  {chartLoading && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `${ui.cardBg}cc`,
                        zIndex: 2,
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: "0.82rem", color: ui.textMuted }}
                      >
                        ⏳ Loading chart…
                      </span>
                    </div>
                  )}
                  <AreaChart
                    data={chartData}
                    subtitle={chartSubtitle}
                    ui={ui}
                  />
                </div>

                {/* Data table */}
                <DataTable
                  chartData={chartData}
                  chartTotals={chartTotals}
                  breakdown={breakdown}
                  chartSubtitle={chartSubtitle}
                  chartLoading={chartLoading}
                  ui={ui}
                />
              </Card>

              {/* Recent Applications */}
              <Card ui={ui}>
                <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
                  <CardHeader
                    title="Recent Applications"
                    sub="Access and manage your latest applications all in one place."
                    right={
                      <button
                        onClick={() => setShowRecentModal(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: FB,
                          fontSize: "0.84rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        See all
                      </button>
                    }
                    ui={ui}
                  />
                </div>

                {/* Skeleton */}
                {recentLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 16px",
                        borderBottom:
                          i < 4 ? `1px solid ${ui.divider}` : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: ui.progressBg,
                          animation: "cdrrPulse 1.2s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 150,
                            height: 10,
                            borderRadius: 4,
                            background: ui.progressBg,
                            animation: "cdrrPulse 1.2s ease-in-out infinite",
                          }}
                        />
                        <div
                          style={{
                            width: 100,
                            height: 8,
                            borderRadius: 4,
                            background: ui.progressBg,
                            animation: "cdrrPulse 1.2s ease-in-out infinite",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: 75,
                          height: 22,
                          borderRadius: 99,
                          flexShrink: 0,
                          background: ui.progressBg,
                          animation: "cdrrPulse 1.2s ease-in-out infinite",
                        }}
                      />
                    </div>
                  ))}

                {!recentLoading && recentError && (
                  <div
                    style={{
                      padding: "1.5rem",
                      textAlign: "center",
                      color: "#e02020",
                      fontSize: "0.82rem",
                    }}
                  >
                    ⚠️ {recentError}{" "}
                    <button
                      onClick={fetchRecentApps}
                      style={{
                        background: "none",
                        border: "none",
                        color: FB,
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!recentLoading && !recentError && recentApps.length === 0 && (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: ui.textMuted,
                      fontSize: "0.82rem",
                    }}
                  >
                    No recent applications found.
                  </div>
                )}

                {!recentLoading &&
                  !recentError &&
                  recentApps.map((row, i, arr) => (
                    <div
                      key={row.log_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 16px",
                        borderBottom:
                          i < arr.length - 1
                            ? `1px solid ${ui.divider}`
                            : "none",
                        cursor: "pointer",
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
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            background: row.status_bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                            flexShrink: 0,
                          }}
                        >
                          {row.icon}
                        </div>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.86rem",
                              fontWeight: 600,
                              color: ui.textPrimary,
                            }}
                          >
                            {row.dtn}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.78rem",
                              color: ui.textSub,
                            }}
                          >
                            {row.brand_name}
                            {row.generic_name ? ` (${row.generic_name})` : ""}
                          </p>
                          {row.app_step && (
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: "0.72rem",
                                color: ui.textMuted,
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <span style={{ fontSize: "0.65rem" }}>📌</span>
                              {row.app_step}
                            </p>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? 6 : 12,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: row.status_color,
                            background: row.status_bg,
                            padding: "3px 10px",
                            borderRadius: 99,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.status_label}
                        </span>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: ui.textMuted,
                            minWidth: 40,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.date_display}
                        </span>
                      </div>
                    </div>
                  ))}
              </Card>

              {isMobile && <RightPanel {...rightPanelProps} />}
            </div>

            {!isMobile && <RightPanel {...rightPanelProps} />}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <TargetModal
        target={activeTarget}
        onClose={() => setActiveTarget(null)}
        ui={ui}
      />

      {detailModal && (
        <MetricDetailModal
          metricKey={detailModal.metricKey}
          metricLabel={detailModal.metricLabel}
          dateParams={detailModal.dateParams}
          onClose={() => setDetailModal(null)}
          onRowClick={handleDetailRowClick}
          onViewLogs={(row) => setLogsModal({ dtn: row.dtn })}
          ui={ui}
        />
      )}

      {selectedDtnRecord && (
        <ViewDetailsModal
          record={selectedDtnRecord}
          onClose={() => setSelectedDtnRecord(null)}
          colors={ui}
          darkMode={darkMode}
        />
      )}

      {showReport && (
        <AccomplishmentReport
          onClose={() => setShowReport(false)}
          totals={{
            received: liveStats?.received ?? chartTotals.received,
            completed: liveStats?.completed ?? chartTotals.completed,
            onProcess: liveStats?.on_process ?? chartTotals.onProcess,
          }}
          ui={ui}
          customDates={customReportDates}
        />
      )}

      {showRecentModal && (
        <RecentApplicationsModal
          onClose={() => setShowRecentModal(false)}
          onRowClick={handleDetailRowClick}
          ui={ui}
        />
      )}

      {logsModal && (
        <ApplicationLogsModal
          record={{ dtn: logsModal.dtn }}
          onClose={() => setLogsModal(null)}
          darkMode={darkMode}
          colors={ui}
        />
      )}

      {showGuide && (
        <HowToUseDashboardModal
          darkMode={darkMode}
          colors={ui}
          onClose={closeGuide}
        />
      )}
    </>
  );
}
