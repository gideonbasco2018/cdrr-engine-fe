// FILE: src/pages/dashboard/GMPDashboardView.jsx
// FGMP taskforce dashboard — same Monitoring-style layout as the main
// dashboard, scoped to GMP records.
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getGMPDashboardSummary,
  getGMPDashboardChart,
  getGMPDashboardRecentApplications,
  getGMPPostEvalStatusSummary,
  getGMPPostEvalStatusRows,
} from "../../api/dashboard";
import { buildChartParams, mapPoint } from "../../components/dashboard/utils";
import {
  ALL_MONTHS,
  CURRENT_YEAR,
  CURRENT_MONTH_IDX,
} from "../../components/dashboard/constants";
import RecentApplicationsCard from "../../components/dashboard/RecentApplicationsCard";
import RecentApplicationsModal from "../../components/dashboard/RecentApplicationsModal";
import GMPMetricDetailModal from "../../components/dashboard/GMPMetricDetailModal";
import GMPRecordDetailModal from "../../components/dashboard/GMPRecordDetailModal";
import GMPPostEvalStatusCard, {
  POST_EVAL_CARD_ROWS,
} from "../../components/dashboard/GMPPostEvalStatusCard";
import GMPPostEvalStatusModal from "../../components/dashboard/GMPPostEvalStatusModal";
import InsightsSection, {
  ErrorToasts,
} from "../../components/dashboard/InsightsSection";

const RECENT_PAGE_SIZE = 6;

export default function GMPDashboardView({ darkMode, ui, isMobile }) {
  // ── Controls ──────────────────────────────────────────────────────────────
  const [breakdown, setBreakdown] = useState("month");
  const [selYear, setSelYear] = useState(String(CURRENT_YEAR));
  const [selMonth, setSelMonth] = useState(ALL_MONTHS[CURRENT_MONTH_IDX]);
  const [activeMetric, setActiveMetric] = useState(0);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [selectedGmpId, setSelectedGmpId] = useState(null);

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

  // ── Post-Evaluation Status ────────────────────────────────────────────────
  const [postEvalBreakdown, setPostEvalBreakdown] = useState([]);
  const [postEvalRows, setPostEvalRows] = useState([]);
  const [postEvalLoading, setPostEvalLoading] = useState(true);
  const [postEvalError, setPostEvalError] = useState(null);
  const [showPostEvalModal, setShowPostEvalModal] = useState(false);

  // ── Fetches ───────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const p = buildChartParams(breakdown, selYear, selMonth);
      const params = {};
      if (p.date_from) params.date_from = p.date_from;
      if (p.date_to) params.date_to = p.date_to;
      setLiveStats(await getGMPDashboardSummary(params));
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
      const res = await getGMPDashboardChart(params);
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
      const res = await getGMPDashboardRecentApplications({
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

  const fetchPostEvalStatus = useCallback(async () => {
    setPostEvalLoading(true);
    setPostEvalError(null);
    try {
      const [summary, rows] = await Promise.all([
        getGMPPostEvalStatusSummary(),
        getGMPPostEvalStatusRows({ page_size: POST_EVAL_CARD_ROWS }),
      ]);
      setPostEvalBreakdown(summary.breakdown);
      setPostEvalRows(rows.data);
    } catch (err) {
      setPostEvalError(
        err?.response?.data?.detail || err.message || "Failed to load",
      );
      setPostEvalBreakdown([]);
      setPostEvalRows([]);
    } finally {
      setPostEvalLoading(false);
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
  useEffect(() => {
    fetchPostEvalStatus();
  }, [fetchPostEvalStatus]);

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

  const handleRowClick = useCallback((row) => {
    if (!row?.gmp_id) return;
    setSelectedGmpId(row.gmp_id);
  }, []);

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
          title="FGMP Insights"
          subtitle="Learn how FGMP certification applications are performing."
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

        {/* Recent Applications | Post-Evaluation Status — side by side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 16,
            alignItems: "start",
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
            onRowClick={handleRowClick}
            emptyLabel="No recent FGMP applications found."
            page={recentPage}
            totalPages={recentTotalPages}
            total={recentTotal}
            onPageChange={setRecentPage}
            pageSize={RECENT_PAGE_SIZE}
          />
          <GMPPostEvalStatusCard
            ui={ui}
            breakdown={postEvalBreakdown}
            data={postEvalRows}
            loading={postEvalLoading}
            error={postEvalError}
            onRetry={fetchPostEvalStatus}
            onSeeAll={() => setShowPostEvalModal(true)}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      {detailModal && (
        <GMPMetricDetailModal
          metricKey={detailModal.metricKey}
          metricLabel={`FGMP ${detailModal.metricLabel}`}
          dateParams={detailModal.dateParams}
          onClose={() => setDetailModal(null)}
          onRowClick={handleRowClick}
          ui={ui}
        />
      )}
      {selectedGmpId && (
        <GMPRecordDetailModal
          gmpId={selectedGmpId}
          onClose={() => setSelectedGmpId(null)}
          ui={ui}
          darkMode={darkMode}
        />
      )}
      {showRecentModal && (
        <RecentApplicationsModal
          onClose={() => setShowRecentModal(false)}
          onRowClick={handleRowClick}
          fetcher={getGMPDashboardRecentApplications}
          ui={ui}
        />
      )}
      {showPostEvalModal && (
        <GMPPostEvalStatusModal
          onClose={() => setShowPostEvalModal(false)}
          onRowClick={handleRowClick}
          ui={ui}
        />
      )}
    </>
  );
}
