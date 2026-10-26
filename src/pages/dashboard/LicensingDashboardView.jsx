// FILE: src/pages/dashboard/LicensingDashboardView.jsx
// Main dashboard — licensing unit. Monitoring-style layout (4 stat cards,
// trend chart + breakdown donut, data table, recent applications).
// Accomplishment Report is removed for now.
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getDashboardSummary,
  getDashboardChart,
  getDashboardRecordByDtn,
  getDashboardAllRecentApplications,
} from "../../api/dashboard";
import ApplicationLogsModal from "../../components/tasks/ApplicationLogsModal";
import ViewDetailsModal from "../../components/reports/actions/ViewDetailsModal";
import HowToUseDashboardModal, {
  useHowToUseDashboardGuide,
} from "../../components/dashboard/HowToUseDashboardModal";
import { buildChartParams, mapPoint } from "../../components/dashboard/utils";
import {
  FB,
  ALL_MONTHS,
  CURRENT_YEAR,
  CURRENT_MONTH_IDX,
} from "../../components/dashboard/constants";
import RecentApplicationsCard from "../../components/dashboard/RecentApplicationsCard";
import MetricDetailModal from "../../components/dashboard/MetricDetailModal";
import RecentApplicationsModal from "../../components/dashboard/RecentApplicationsModal";
import TargetModal from "../../components/dashboard/TargetModal";
import UploadHistoryCard from "../../components/dashboard/UploadHistoryCard";
import InsightsSection, {
  ErrorToasts,
} from "../../components/dashboard/InsightsSection";

// Recent Applications shows 7 rows and Upload History 6 (it also has a filter
// bar), so the two side-by-side cards come out the same height.
const RECENT_PAGE_SIZE = 7;

export default function LicensingDashboardView({ darkMode, ui, isMobile }) {
  // ── Controls ──────────────────────────────────────────────────────────────
  const [breakdown, setBreakdown] = useState("month");
  const [selYear, setSelYear] = useState(String(CURRENT_YEAR));
  const [selMonth, setSelMonth] = useState(ALL_MONTHS[CURRENT_MONTH_IDX]);
  const [activeMetric, setActiveMetric] = useState(0);
  const [activeTarget, setActiveTarget] = useState(null);
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

  // ── Recent apps ───────────────────────────────────────────────────────────
  const [recentApps, setRecentApps] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(null);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentTotalPages, setRecentTotalPages] = useState(1);

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
      setStatsError(
        err?.response?.data?.detail || err.message || "Failed to load stats",
      );
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

  const fetchRecentApps = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const res = await getDashboardAllRecentApplications({
        page: recentPage,
        page_size: RECENT_PAGE_SIZE,
      });
      setRecentApps(res.data);
      setRecentTotal(res.total ?? res.data.length);
      setRecentTotalPages(res.total_pages ?? 1);
    } catch (err) {
      setRecentError(
        err?.response?.data?.detail || err.message || "Failed to load",
      );
      setRecentApps([]);
    } finally {
      setRecentLoading(false);
    }
  }, [recentPage]);

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
      isLive: true,
    },
    {
      icon: "✅",
      label: "Completed",
      metricKey: "completed",
      value: liveStats ? liveStats.completed : chartTotals.completed,
      isLive: true,
    },
    {
      icon: "⏳",
      label: "On Process",
      metricKey: "on_process",
      value: liveStats ? liveStats.on_process : chartTotals.onProcess,
      isLive: true,
    },
    {
      icon: "🎯",
      label: "Target",
      metricKey: null,
      value: chartTotals.target,
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

  const handleMetricClick = useCallback(
    (i, m) => {
      setActiveMetric(i);
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

  // Totals shown in the donut: prefer live stats, fall back to chart totals.
  const donutTotals = {
    received: liveStats?.received ?? chartTotals.received,
    completed: liveStats?.completed ?? chartTotals.completed,
    onProcess: liveStats?.on_process ?? chartTotals.onProcess,
  };

  return (
    <>
      <ErrorToasts
        statsError={statsError}
        chartError={chartError}
        onRetryStats={fetchStats}
        onRetryChart={fetchChart}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <InsightsSection
          ui={ui}
          isMobile={isMobile}
          title="Insights"
          subtitle="Learn how your applications are performing."
          subtitleExtra={
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
                fontFamily: "inherit",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              ? How to use
            </button>
          }
          metrics={metrics}
          activeMetric={activeMetric}
          onMetricClick={handleMetricClick}
          statsLoading={statsLoading}
          breakdown={breakdown}
          setBreakdown={setBreakdown}
          selYear={selYear}
          setSelYear={setSelYear}
          selMonth={selMonth}
          setSelMonth={setSelMonth}
          chartData={chartData}
          chartTotals={chartTotals}
          donutTotals={donutTotals}
          chartSubtitle={chartSubtitle}
          chartLoading={chartLoading}
        />

        {/* Recent Applications | Upload History — side by side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <RecentApplicationsCard
            ui={ui}
            isMobile={isMobile}
            data={recentApps}
            loading={recentLoading}
            error={recentError}
            onRetry={fetchRecentApps}
            onSeeAll={() => setShowRecentModal(true)}
            page={recentPage}
            totalPages={recentTotalPages}
            total={recentTotal}
            onPageChange={setRecentPage}
            pageSize={RECENT_PAGE_SIZE}
          />
          <UploadHistoryCard ui={ui} pageSize={6} />
        </div>
      </div>

      {/* ── Modals ── */}
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
