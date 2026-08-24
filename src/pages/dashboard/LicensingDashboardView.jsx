// FILE: src/pages/dashboard/LicensingDashboardView.jsx
// The original main Dashboard — licensing unit KPIs (received / completed /
// on-process / target), Insights chart, data table, and recent applications,
// scoped to the current user's ApplicationLogs/MainDB records.
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getDashboardSummary,
  getDashboardChart,
  getDashboardRecentApplications,
  getDashboardRecordByDtn,
  getDashboardAllRecentApplications,
} from "../../api/dashboard";
import ApplicationLogsModal from "../../components/tasks/ApplicationLogsModal";
import ViewDetailsModal from "../../components/reports/actions/ViewDetailsModal";
import HowToUseDashboardModal, {
  useHowToUseDashboardGuide,
} from "../../components/dashboard/HowToUseDashboardModal";
import {
  buildChartParams,
  mapPoint,
  getWorkingWeek,
} from "../../components/dashboard/utils";

import {
  FB,
  ALL_MONTHS,
  CURRENT_YEAR,
  CURRENT_MONTH_IDX,
  MONTHS_BY_YEAR,
  AVAILABLE_YEARS,
} from "../../components/dashboard/constants";
import { Card, SeeAll } from "../../components/dashboard/CardPrimitives";
import MetricTile from "../../components/dashboard/MetricTile";
import AreaChart from "../../components/dashboard/AreaChart";
import DataTable from "../../components/dashboard/DataTable";
import RecentApplicationsCard from "../../components/dashboard/RecentApplicationsCard";
import MetricDetailModal from "../../components/dashboard/MetricDetailModal";
import RecentApplicationsModal from "../../components/dashboard/RecentApplicationsModal";
import TargetModal from "../../components/dashboard/TargetModal";
import AccomplishmentReport from "../../components/dashboard/AccomplishmentReport";
import SystemStatusCard from "../../components/dashboard/SystemStatusCard";
import UploadHistoryCard from "../../components/dashboard/UploadHistoryCard";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SystemStatusCard connections={dbConnections} onToggle={toggleConn} ui={ui} />
      <Card ui={ui}>
        <div style={{ padding: "14px 16px 10px" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: ui.textPrimary }}>
            Accomplishment Report
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: ui.textMuted }}>
            Select a date range to generate
          </p>
        </div>
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function LicensingDashboardView({ darkMode, ui, isMobile }) {
  // ── Controls ──────────────────────────────────────────────────────────────
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

  // ── KPI state ─────────────────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // ── Chart state ───────────────────────────────────────────────────────────
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

  // ── Report dates ──────────────────────────────────────────────────────────
  const week = getWorkingWeek();
  const [reportStart, setReportStart] = useState(week.start);
  const [reportEnd, setReportEnd] = useState(week.end);
  const [reportDateErr] = useState("");
  const canGenReport = !reportDateErr && reportStart && reportEnd;

  // ── Recent apps ───────────────────────────────────────────────────────────
  const [recentApps, setRecentApps] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(null);

  // ── DB connections ────────────────────────────────────────────────────────
  const [dbConnections, setDbConnections] = useState([
    { id: "doctrack", label: "Doctrack", desc: "Document Tracking DB", icon: "🗂️", active: true },
    { id: "aws", label: "AWS", desc: "Cloud Storage & Services", icon: "☁️", active: true },
    { id: "maindb", label: "Main DB", desc: "Primary Application DB", icon: "🗄️", active: true },
  ]);

  const toggleConn = (id) =>
    setDbConnections((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));

  // ── Fetches ───────────────────────────────────────────────────────────────
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
      setStatsError(err?.response?.data?.detail || err.message || "Failed to load stats");
      setLiveStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [breakdown, selYear, selMonth]);

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
      setChartError(err?.response?.data?.detail || err.message || "Failed to load chart data");
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [breakdown, selYear, selMonth]);

  const fetchRecentApps = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const res = await getDashboardRecentApplications({ limit: 10 });
      setRecentApps(res.data);
    } catch (err) {
      setRecentError(err?.response?.data?.detail || err.message || "Failed to load");
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

  const rightPanelProps = {
    ui,
    dbConnections,
    toggleConn,
    canGenReport,
    reportStart,
    reportEnd,
    setCustomReportDates,
    setShowReport,
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
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 290px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Insights card */}
          <Card ui={ui}>
            <div style={{ padding: "14px 16px 0" }}>
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
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: ui.textPrimary, margin: 0 }}>
                    Insights
                  </h2>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: ui.textSub,
                      margin: "2px 0 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Learn how your applications are performing.
                    <button
                      onClick={openGuide}
                      style={{
                        background: "none",
                        border: "none",
                        color: FB,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "0 6px",
                        borderRadius: 4,
                        fontFamily: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        opacity: 0.85,
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
                    >
                      ? How to use
                    </button>
                  </p>
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
                          background: breakdown === opt.key ? FB : "transparent",
                          color: breakdown === opt.key ? "#fff" : ui.textSub,
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
                  {(breakdown === "day" || breakdown === "month") && (
                    <select
                      value={selYear}
                      onChange={(e) => {
                        setSelYear(e.target.value);
                        if (breakdown === "day") {
                          const months = MONTHS_BY_YEAR[e.target.value] || [];
                          if (!months.includes(selMonth)) setSelMonth(months[months.length - 1] || "Jan");
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

              <div style={{ display: "flex", gap: isMobile ? 6 : 10, marginBottom: 14 }}>
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
                  <span style={{ fontSize: "0.82rem", color: ui.textMuted }}>⏳ Loading chart…</span>
                </div>
              )}
              <AreaChart data={chartData} subtitle={chartSubtitle} ui={ui} />
            </div>

            <DataTable
              chartData={chartData}
              chartTotals={chartTotals}
              breakdown={breakdown}
              chartSubtitle={chartSubtitle}
              chartLoading={chartLoading}
              ui={ui}
            />
          </Card>

          <RecentApplicationsCard
            ui={ui}
            isMobile={isMobile}
            data={recentApps}
            loading={recentLoading}
            error={recentError}
            onRetry={fetchRecentApps}
            onSeeAll={() => setShowRecentModal(true)}
          />

          <UploadHistoryCard ui={ui} />
          {isMobile && <RightPanel {...rightPanelProps} />}
        </div>

        {!isMobile && <RightPanel {...rightPanelProps} />}
      </div>

      {/* ── Modals ── */}
      <TargetModal target={activeTarget} onClose={() => setActiveTarget(null)} ui={ui} />
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
          fetcher={getDashboardAllRecentApplications}
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
      {showGuide && <HowToUseDashboardModal darkMode={darkMode} colors={ui} onClose={closeGuide} />}
    </>
  );
}
