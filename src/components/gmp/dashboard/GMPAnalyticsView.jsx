// src/components/gmp/dashboard/GMPAnalyticsView.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { Chart, registerables } from "chart.js";
import {
  getGMPAnalyticsAvailableYears,
  getGMPAnalyticsSummary,
  getGMPAnalyticsDTNSummary,
  getGMPAnalyticsTrend,
  getGMPAnalyticsByCategory,
  getGMPAnalyticsStepTiming,
  getGMPAnalyticsWorkload,
  getGMPAnalyticsAging,
  getGMPAnalyticsNOD,
  getGMPAnalyticsPicsCountry,
} from "../../../api/gmpAnalytics";
import { FadeSlideIn } from "../../monitoring/analytics/KpiCard";
import { SectionCard } from "../../monitoring/analytics/SectionCard";
import { MiniBar } from "../../monitoring/analytics/ChartComponents";
import { GMP_STEPS } from "../shared/constants";
import ApplicationMonitoringTable from "./ApplicationMonitoringTable";
import { GMPKpiCard } from "./GMPKpiCard";

Chart.register(...registerables);

const MONTH_OPTIONS = [
  { value: "All", label: "All months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const KPI_VIEW_OPTIONS = [
  { value: "reference", label: "By Reference" },
  { value: "dtn", label: "By DTN" },
  { value: "both", label: "Both" },
];

function KpiViewToggle({ value, onChange, ui, darkMode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {KPI_VIEW_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "6px 12px",
              fontSize: "0.78rem",
              fontWeight: active ? 700 : 500,
              color: active ? "#fff" : ui.textPrimary,
              background: active ? "#1877F2" : ui.inputBg,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function selectStyle(ui) {
  return {
    background: ui.inputBg,
    color: ui.textPrimary,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: "0.78rem",
    outline: "none",
  };
}

// ── Section heading — consistent eyebrow used to group related cards ────────
function SectionHeading({ icon, title, subtitle, ui, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `1px solid ${ui.cardBorder}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: "1.05rem", lineHeight: 1 }}>{icon}</span>}
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "0.98rem",
              fontWeight: 800,
              color: ui.textPrimary,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: "1px 0 0", fontSize: "0.74rem", color: ui.textMuted }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

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
          animation: "gmpAnalyticsShimmer 1.4s infinite",
        }}
      />
      <style>{`@keyframes gmpAnalyticsShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

function EmptyChart({ label, ui, darkMode }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.1rem",
          background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          color: ui.textMuted,
        }}
      >
        📭
      </div>
      <span style={{ color: ui.textMuted, fontSize: "0.78rem", maxWidth: 200 }}>
        {label}
      </span>
    </div>
  );
}

// ── Trend chart (received / released / disapproved) ─────────────────────────
function TrendChartPanel({ data, darkMode, ui, loading }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    chartRef.current?.destroy();
    if (!ref.current || !data.length) return;

    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";

    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: "Received",
            data: data.map((d) => d.received),
            borderColor: "#1877F2",
            backgroundColor: "rgba(24,119,242,0.08)",
            borderWidth: 2.5,
            pointRadius: 3,
            tension: 0.35,
            fill: true,
          },
          {
            label: "Released",
            data: data.map((d) => d.released),
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            borderWidth: 2.5,
            pointRadius: 3,
            tension: 0.35,
            fill: true,
          },
          {
            label: "Disapproved",
            data: data.map((d) => d.disapproved),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.08)",
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.35,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            labels: { color: tickCol, font: { size: 11 }, boxWidth: 14 },
          },
        },
        scales: {
          x: {
            ticks: { color: tickCol, font: { size: 11 } },
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

    return () => chartRef.current?.destroy();
  }, [data, darkMode, loading]);

  return (
    <div style={{ position: "relative", height: 300 }}>
      {loading ? (
        <SkeletonBox height={300} borderRadius={8} ui={ui} />
      ) : !data.length ? (
        <EmptyChart label="No data" ui={ui} darkMode={darkMode} />
      ) : (
        <canvas ref={ref} />
      )}
    </div>
  );
}

// ── Step timing bar chart ────────────────────────────────────────────────────
function StepTimingChart({ data, darkMode, ui, loading }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const stepColor = (step) =>
    GMP_STEPS.find((s) => s.id === step)?.color ?? "#1877F2";

  useEffect(() => {
    if (loading) return;
    chartRef.current?.destroy();
    if (!ref.current || !data.length) return;

    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";

    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: data.map((d) => d.step),
        datasets: [
          {
            label: "Avg days",
            data: data.map((d) => d.avg_days ?? 0),
            backgroundColor: data.map((d) => stepColor(d.step)),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const d = data[ctx.dataIndex];
                return `Based on ${d.total} completed application${d.total === 1 ? "" : "s"}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: tickCol, font: { size: 10 }, maxRotation: 30 },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            ticks: { color: tickCol, font: { size: 11 } },
            grid: { color: gridCol },
            border: { display: false },
            beginAtZero: true,
            title: { display: true, text: "Days", color: tickCol },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data, darkMode, loading]);

  return (
    <div style={{ position: "relative", height: 280 }}>
      {loading ? (
        <SkeletonBox height={280} borderRadius={8} ui={ui} />
      ) : !data.length ? (
        <EmptyChart label="No completed workflow steps yet" ui={ui} darkMode={darkMode} />
      ) : (
        <canvas ref={ref} />
      )}
    </div>
  );
}

// ── Ranked breakdown list (MiniBar rows) ─────────────────────────────────────
function BreakdownList({ items, color, ui, darkMode, emptyLabel }) {
  if (!items.length) {
    return <EmptyChart label={emptyLabel} ui={ui} darkMode={darkMode} />;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: "0.76rem",
              color: ui.textPrimary,
              width: 150,
              flexShrink: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={item.name}
          >
            {item.name}
          </span>
          <MiniBar value={item.count} max={max} color={color} darkMode={darkMode} />
          <span
            style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              color: ui.textPrimary,
              width: 40,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {item.count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Evaluator workload rows (open count + avg TAT) ───────────────────────────
function WorkloadList({ items, ui, darkMode, emptyLabel }) {
  if (!items.length) {
    return <EmptyChart label={emptyLabel} ui={ui} darkMode={darkMode} />;
  }
  const max = Math.max(...items.map((i) => i.open_count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={item.evaluator} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: "0.76rem",
              color: ui.textPrimary,
              width: 130,
              flexShrink: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={item.evaluator}
          >
            {item.evaluator}
          </span>
          <MiniBar value={item.open_count} max={max} color="#f59e0b" darkMode={darkMode} />
          <span
            style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              color: ui.textPrimary,
              width: 30,
              textAlign: "right",
              flexShrink: 0,
            }}
            title="Open tasks"
          >
            {item.open_count.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: ui.textMuted,
              width: 60,
              textAlign: "right",
              flexShrink: 0,
            }}
            title="Average TAT, working days"
          >
            {item.avg_tat_days != null ? `${item.avg_tat_days}d avg` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── PIC/S classification mismatch rows ────────────────────────────────────────
function MismatchList({ items, totalCount, ui, darkMode, emptyLabel }) {
  if (!items.length) {
    return <EmptyChart label={emptyLabel} ui={ui} darkMode={darkMode} />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((m) => (
        <div
          key={m.gmp_id}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: ui.inputBg,
            border: `1px solid ${ui.cardBorder}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: ui.textPrimary }}>
              {m.company || "—"}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 999,
                background: darkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                color: "#ef4444",
                flexShrink: 0,
              }}
            >
              {m.declared}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: ui.textMuted, marginTop: 2 }}>
            {m.foreign_manufacturer || "—"}
            {m.dtn ? ` · DTN ${m.dtn}` : ""}
          </div>
          <div style={{ fontSize: "0.72rem", color: ui.textMuted, marginTop: 2 }}>
            {m.reason}
          </div>
        </div>
      ))}
      {totalCount > items.length && (
        <div style={{ fontSize: "0.72rem", color: ui.textMuted, textAlign: "center", paddingTop: 4 }}>
          Showing {items.length} of {totalCount.toLocaleString()} flagged records
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GMPAnalyticsView({ ui, darkMode }) {
  const [year, setYear] = useState("All");
  const [month, setMonth] = useState("All");
  const [years, setYears] = useState(["All"]);
  const [kpiView, setKpiView] = useState("reference"); // "reference" | "dtn" | "both"

  const [summary, setSummary] = useState(null);
  const [dtnSummary, setDtnSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [category, setCategory] = useState(null);
  const [stepTiming, setStepTiming] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [aging, setAging] = useState([]);
  const [nod, setNod] = useState(null);
  const [picsCountry, setPicsCountry] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getGMPAnalyticsAvailableYears()
      .then((res) => setYears(res.years?.length ? res.years : ["All"]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { year, month };
    Promise.all([
      getGMPAnalyticsSummary(params),
      getGMPAnalyticsDTNSummary(params),
      getGMPAnalyticsTrend(params),
      getGMPAnalyticsByCategory({ year, month }),
      getGMPAnalyticsStepTiming(),
      getGMPAnalyticsWorkload(params),
      getGMPAnalyticsAging(params),
      getGMPAnalyticsNOD(params),
      getGMPAnalyticsPicsCountry(params),
    ])
      .then(([summaryRes, dtnSummaryRes, trendRes, categoryRes, stepRes, workloadRes, agingRes, nodRes, picsCountryRes]) => {
        setSummary(summaryRes);
        setDtnSummary(dtnSummaryRes);
        setTrend(trendRes.data || []);
        setCategory(categoryRes);
        setStepTiming(stepRes.data || []);
        setWorkload(workloadRes.data || []);
        setAging(agingRes.data || []);
        setNod(nodRes);
        setPicsCountry(picsCountryRes);
      })
      .catch(() => setError("Failed to load FGMP analytics. Please try again."))
      .finally(() => setLoading(false));
  }, [year, month]);

  const kpis = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Total Records", value: summary.total, color: "#1877F2", icon: "📄" },
      { label: "Released", value: summary.released, color: "#10b981", icon: "✅", sub: `${summary.release_rate}% release rate` },
      { label: "On Process", value: summary.on_process, color: "#f59e0b", icon: "⏳" },
      { label: "Disapproved", value: summary.disapproved, color: "#ef4444", icon: "⛔" },
      {
        label: "Avg TAT",
        value: summary.avg_tat_days != null ? `${summary.avg_tat_days}d` : "—",
        color: "#8b5cf6",
        icon: "⏱️",
        sub: "working days, received → released",
      },
    ];
  }, [summary]);

  const dtnKpis = useMemo(() => {
    if (!dtnSummary) return [];
    return [
      { label: "Total DTNs", value: dtnSummary.total_dtns, color: "#1877F2", icon: "🗂️" },
      { label: "Completed", value: dtnSummary.completed, color: "#10b981", icon: "✅", sub: "all issuances terminal" },
      { label: "On Process", value: dtnSummary.on_process, color: "#f59e0b", icon: "⏳", sub: "at least one issuance still open" },
      { label: "Disapproved", value: dtnSummary.disapproved, color: "#ef4444", icon: "⛔" },
      { label: "Multi-Issuance DTNs", value: dtnSummary.multi_issuance_dtns, color: "#8b5cf6", icon: "🔀", sub: "DTNs with >1 reference record" },
    ];
  }, [dtnSummary]);

  const nodKpis = useMemo(() => {
    if (!nod) return [];
    return [
      { label: "NOD Rate", value: `${nod.nod_rate}%`, color: "#f59e0b", icon: "📋", sub: `${nod.records_with_nod.toLocaleString()} of ${nod.total_records.toLocaleString()} records` },
      { label: "Avg NODs / Record", value: nod.avg_nod_count, color: "#8b5cf6", icon: "🔁" },
      {
        label: "Avg Compliance Turnaround",
        value: nod.avg_compliance_turnaround_days != null ? `${nod.avg_compliance_turnaround_days}d` : "—",
        color: "#0ea5e9",
        icon: "⏱️",
        sub: "last NOD → compliance docs received",
      },
      { label: "Awaiting Compliance", value: nod.pending_compliance, color: "#ef4444", icon: "⏳", sub: "NOD sent, still on process" },
    ];
  }, [nod]);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 18 }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: 800,
            color: ui.textPrimary,
            letterSpacing: "-0.01em",
          }}
        >
          FGMP Analytics
        </h2>
        <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: ui.textMuted }}>
          Certification workflow volume, breakdowns, workload and compliance in one place
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={year} onChange={(e) => { setYear(e.target.value); setMonth("All"); }} style={selectStyle(ui)}>
            {years.map((y) => (
              <option key={y} value={y}>{y === "All" ? "All years" : y}</option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={year === "All"} style={selectStyle(ui)}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <KpiViewToggle value={kpiView} onChange={setKpiView} ui={ui} darkMode={darkMode} />
      </div>

      {error && (
        <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: 12 }}>{error}</div>
      )}

      {/* ── Certification volume ── */}
      <SectionHeading icon="📊" title="Certification volume" ui={ui} />

      {(kpiView === "both" || kpiView === "reference") && (
        <>
          <div style={{ fontSize: "0.74rem", fontWeight: 600, color: ui.textMuted, marginBottom: 8 }}>
            By reference record — each issuance counted separately
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {loading || !kpis.length
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={78} borderRadius={12} ui={ui} />)
              : kpis.map((k, i) => (
                  <GMPKpiCard
                    key={k.label}
                    icon={k.icon}
                    label={k.label}
                    value={k.value}
                    sub={k.sub}
                    color={k.color}
                    darkMode={darkMode}
                    ui={ui}
                    animDelay={i * 60}
                  />
                ))}
          </div>
        </>
      )}

      {(kpiView === "both" || kpiView === "dtn") && (
        <>
          <div style={{ fontSize: "0.74rem", fontWeight: 600, color: ui.textMuted, marginBottom: 8 }}>
            By DTN — "Completed" only once every issuance under it is terminal
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {loading || !dtnKpis.length
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={78} borderRadius={12} ui={ui} />)
              : dtnKpis.map((k, i) => (
                  <GMPKpiCard
                    key={k.label}
                    icon={k.icon}
                    label={k.label}
                    value={k.value}
                    sub={k.sub}
                    color={k.color}
                    darkMode={darkMode}
                    ui={ui}
                    animDelay={i * 60}
                  />
                ))}
          </div>
        </>
      )}

      {/* ── Applications ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading icon="🗂️" title="Applications" subtitle="Trend over time and live per-record status" ui={ui} />
      </div>

      <FadeSlideIn delay={100} style={{ marginBottom: 16 }}>
        <SectionCard
          title="Applications over time"
          subtitle="Received, released & disapproved counts"
          ui={ui}
          darkMode={darkMode}
        >
          <TrendChartPanel data={trend} darkMode={darkMode} ui={ui} loading={loading} />
        </SectionCard>
      </FadeSlideIn>

      <FadeSlideIn delay={120} style={{ marginBottom: 16 }}>
        <SectionCard
          title="Application monitoring"
          subtitle="Live status of individual applications — search by DTN or establishment"
          ui={ui}
          darkMode={darkMode}
        >
          <ApplicationMonitoringTable ui={ui} darkMode={darkMode} />
        </SectionCard>
      </FadeSlideIn>

      {/* ── Breakdowns ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading icon="🧩" title="Breakdowns" subtitle="Volume sliced by category, geography and type" ui={ui} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <FadeSlideIn delay={140}>
          <SectionCard title="By establishment category" ui={ui} darkMode={darkMode}>
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList items={category?.by_est_category ?? []} color="#1877F2" ui={ui} darkMode={darkMode} emptyLabel="No category data" />
            )}
          </SectionCard>
        </FadeSlideIn>

        <FadeSlideIn delay={180}>
          <SectionCard title="PIC/S vs Non-PIC/S" ui={ui} darkMode={darkMode}>
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList items={category?.by_pics_nonpics ?? []} color="#10b981" ui={ui} darkMode={darkMode} emptyLabel="No PIC/S data" />
            )}
          </SectionCard>
        </FadeSlideIn>

        <FadeSlideIn delay={200}>
          <SectionCard
            title="By manufacturer country"
            subtitle="Parsed from address vs picscheme.org/en/members"
            ui={ui}
            darkMode={darkMode}
          >
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList items={picsCountry?.by_country ?? []} color="#14b8a6" ui={ui} darkMode={darkMode} emptyLabel="No manufacturer address data" />
            )}
          </SectionCard>
        </FadeSlideIn>

        <FadeSlideIn delay={220}>
          <SectionCard title="Top establishments" subtitle="By record count" ui={ui} darkMode={darkMode}>
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList items={category?.top_companies ?? []} color="#f59e0b" ui={ui} darkMode={darkMode} emptyLabel="No establishment data" />
            )}
          </SectionCard>
        </FadeSlideIn>

        <FadeSlideIn delay={260}>
          <SectionCard title="By type of issuance" ui={ui} darkMode={darkMode}>
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList items={category?.by_issuance_type ?? []} color="#8b5cf6" ui={ui} darkMode={darkMode} emptyLabel="No issuance-type data" />
            )}
          </SectionCard>
        </FadeSlideIn>

        <FadeSlideIn delay={300}>
          <SectionCard title="By transaction type" ui={ui} darkMode={darkMode}>
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList items={category?.by_transaction_type ?? []} color="#0ea5e9" ui={ui} darkMode={darkMode} emptyLabel="No transaction-type data" />
            )}
          </SectionCard>
        </FadeSlideIn>

        <FadeSlideIn delay={320}>
          <SectionCard
            title="Issuances per DTN"
            subtitle="How many issuance records share the same DTN"
            ui={ui}
            darkMode={darkMode}
          >
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList
                items={(dtnSummary?.issuance_count_distribution ?? []).map((d) => ({ name: d.label, count: d.count }))}
                color="#8b5cf6"
                ui={ui}
                darkMode={darkMode}
                emptyLabel="No DTN data"
              />
            )}
          </SectionCard>
        </FadeSlideIn>
      </div>

      {/* ── Workload & backlog ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading icon="👷" title="Workload & backlog" subtitle="Who's carrying open work, and how long it's aged" ui={ui} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <FadeSlideIn delay={380}>
          <SectionCard title="Evaluator workload" subtitle="Open tasks & avg TAT per evaluator" ui={ui} darkMode={darkMode}>
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <WorkloadList items={workload} ui={ui} darkMode={darkMode} emptyLabel="No open tasks assigned" />
            )}
          </SectionCard>
        </FadeSlideIn>

        <FadeSlideIn delay={420}>
          <SectionCard title="Backlog aging" subtitle="On Process records by days since received" ui={ui} darkMode={darkMode}>
            {loading ? (
              <SkeletonBox height={160} ui={ui} />
            ) : (
              <BreakdownList
                items={aging.map((a) => ({ name: a.label, count: a.count }))}
                color="#ef4444"
                ui={ui}
                darkMode={darkMode}
                emptyLabel="No records on process"
              />
            )}
          </SectionCard>
        </FadeSlideIn>
      </div>

      {/* ── Compliance & NOD ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading icon="📋" title="Compliance & NOD" subtitle="Notice of Deficiency rate and turnaround" ui={ui} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {loading || !nodKpis.length
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={78} borderRadius={12} ui={ui} />)
          : nodKpis.map((k, i) => (
              <GMPKpiCard
                key={k.label}
                icon={k.icon}
                label={k.label}
                value={k.value}
                sub={k.sub}
                color={k.color}
                darkMode={darkMode}
                ui={ui}
                animDelay={i * 60}
              />
            ))}
      </div>

      <FadeSlideIn delay={460} style={{ marginBottom: 16 }}>
        <SectionCard title="NOD count distribution" subtitle="Number of deficiency notices per record" ui={ui} darkMode={darkMode}>
          {loading ? (
            <SkeletonBox height={160} ui={ui} />
          ) : (
            <BreakdownList
              items={(nod?.distribution ?? []).map((d) => ({ name: d.label, count: d.count }))}
              color="#f59e0b"
              ui={ui}
              darkMode={darkMode}
              emptyLabel="No NOD data"
            />
          )}
        </SectionCard>
      </FadeSlideIn>

      {/* ── Data quality & process auditing ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading icon="🔍" title="Data quality & process auditing" subtitle="Records worth a second look, and where time is spent" ui={ui} />
      </div>

      <FadeSlideIn delay={500} style={{ marginBottom: 16 }}>
        <SectionCard
          title="Possible PIC/S classification mismatches"
          subtitle={
            picsCountry
              ? `${picsCountry.mismatch_count.toLocaleString()} record${picsCountry.mismatch_count === 1 ? "" : "s"} where the selected PIC/S / Non-PIC/S value doesn't match the manufacturer's detected country — worth a second look, not confirmed errors (address parsing is best-effort)`
              : "Records where the selected PIC/S / Non-PIC/S value doesn't match the manufacturer's detected country"
          }
          ui={ui}
          darkMode={darkMode}
        >
          {loading ? (
            <SkeletonBox height={160} ui={ui} />
          ) : (
            <MismatchList
              items={picsCountry?.mismatches ?? []}
              totalCount={picsCountry?.mismatch_count ?? 0}
              ui={ui}
              darkMode={darkMode}
              emptyLabel="No mismatches detected"
            />
          )}
        </SectionCard>
      </FadeSlideIn>

      <FadeSlideIn delay={260}>
        <SectionCard
          title="Workflow step timing"
          subtitle="Average days spent per step, Decking → OD Releasing"
          ui={ui}
          darkMode={darkMode}
        >
          <StepTimingChart data={stepTiming} darkMode={darkMode} ui={ui} loading={loading} />
        </SectionCard>
      </FadeSlideIn>
    </div>
  );
}
