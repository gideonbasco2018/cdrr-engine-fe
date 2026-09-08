// src/components/gmp/dashboard/GMPMonitoringAnalyticsView.jsx
// FGMP's tab inside the shared Monitoring page (was "FGMP Analytics",
// renamed — split into its own two internal tabs):
//   Monitoring — live/operational: current snapshot, per-record live status,
//                who's carrying open work, what needs attention right now.
//   Analytics  — historical/compositional: trends over time, breakdowns,
//                data worth a second look.
// Receives `ui`/`darkMode` from MonitoringPage the same way every other
// child view here does — this file owns no page chrome of its own beyond
// its own header + tab switch.
//
// Palette: ACCENT (emerald) is the one brand/interactive color — tabs, the
// "healthy" metrics. Everything else uses a semantic color kept separate
// from it: BLUE for volume, AMBER for attention/in-flight, RED for risk,
// VIOLET for time-based metrics — so a red number always means "look at
// this," not just "this is FGMP."
import { useState, useEffect, useMemo } from "react";
import {
  getGMPAnalyticsAvailableYears, getGMPAnalyticsSummary, getGMPAnalyticsDTNSummary,
  getGMPAnalyticsTrend, getGMPAnalyticsByCategory, getGMPAnalyticsStepTiming,
  getGMPAnalyticsWorkload, getGMPAnalyticsByStep, getGMPAnalyticsAging, getGMPAnalyticsNOD, getGMPAnalyticsPicsCountry,
} from "../../../api/gmpAnalytics";
import { MONTH_OPTIONS, KpiViewToggle, selectStyle } from "./gmpAnalyticsShared";
import GMPMonitoringTab from "./GMPMonitoringTab";
import GMPAnalyticsTab from "./GMPAnalyticsTab";

const ACCENT = "#0f8a72";
const BLUE = "#2f6fed";
const AMBER = "#b9740f";
const RED = "#c8384f";
const VIOLET = "#7c5cff";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const TABS = [
  { id: "monitoring", label: "🩺 Monitoring" },
  { id: "analytics",  label: "📈 Analytics" },
];

// Matches Processing Trend's tabBase/TABS pattern (compact single-line
// pills, header-right placement) — this page sits one click away from that
// tab in the same Monitoring nav, so its top row reads as the same control.
function TabSwitch({ active, onChange, ui }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer",
            fontSize: "0.82rem", fontWeight: 600, fontFamily: FONT,
            transition: "background 0.15s, color 0.15s",
            background: active === t.id ? ACCENT : ui.inputBg,
            color: active === t.id ? "#fff" : ui.textMuted,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Real period-over-period delta from the last two points of a series
// already on hand (the trend fetch) — never a fabricated/decorative number.
// Returns null when there isn't enough data yet to compare.
function lastDelta(series) {
  if (!series || series.length < 2) return null;
  const prev = series[series.length - 2];
  const cur = series[series.length - 1];
  if (prev === 0 && cur === 0) return { dir: "flat", text: "steady vs last period" };
  if (prev === 0) return { dir: "up", text: "vs last period" };
  const pct = ((cur - prev) / prev) * 100;
  const dir = Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down";
  return { dir, text: dir === "flat" ? "steady vs last period" : `${Math.abs(pct).toFixed(1)}% vs last period` };
}

export default function GMPMonitoringAnalyticsView({ ui, darkMode }) {
  const [activeTab, setActiveTab] = useState("monitoring");

  const [year, setYear] = useState("All");
  const [month, setMonth] = useState("All");
  const [years, setYears] = useState(["All"]);
  const [kpiView, setKpiView] = useState("reference");

  const [summary, setSummary] = useState(null);
  const [dtnSummary, setDtnSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [category, setCategory] = useState(null);
  const [stepTiming, setStepTiming] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [byStep, setByStep] = useState([]);
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
      getGMPAnalyticsByStep(params),
      getGMPAnalyticsAging(params),
      getGMPAnalyticsNOD(params),
      getGMPAnalyticsPicsCountry(params),
    ])
      .then(([summaryRes, dtnSummaryRes, trendRes, categoryRes, stepRes, workloadRes, byStepRes, agingRes, nodRes, picsCountryRes]) => {
        setSummary(summaryRes);
        setDtnSummary(dtnSummaryRes);
        setTrend(trendRes.data || []);
        setCategory(categoryRes);
        setStepTiming(stepRes.data || []);
        setWorkload(workloadRes.data || []);
        setByStep(byStepRes.data || []);
        setAging(agingRes.data || []);
        setNod(nodRes);
        setPicsCountry(picsCountryRes);
      })
      .catch(() => setError("Failed to load FGMP analytics. Please try again."))
      .finally(() => setLoading(false));
  }, [year, month]);

  // Sparklines/deltas ride on the trend series already being fetched for the
  // Analytics tab's chart — genuine per-period history, not invented.
  const receivedSeries = useMemo(() => trend.map((t) => t.received), [trend]);
  const releasedSeries = useMemo(() => trend.map((t) => t.released), [trend]);
  const disapprovedSeries = useMemo(() => trend.map((t) => t.disapproved), [trend]);

  const kpis = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Total Records", value: summary.total, color: ui.textPrimary, icon: "📄", sparkline: receivedSeries, delta: lastDelta(receivedSeries) },
      { label: "Released", value: summary.released, color: ACCENT, icon: "✅", sub: `${summary.release_rate}% release rate`, sparkline: releasedSeries },
      { label: "On Process", value: summary.on_process, color: AMBER, icon: "⏳" },
      { label: "Disapproved", value: summary.disapproved, color: RED, icon: "⛔", sparkline: disapprovedSeries },
      { label: "Avg TAT", value: summary.avg_tat_days != null ? `${summary.avg_tat_days}d` : "—", color: VIOLET, icon: "⏱️", sub: "working days, received → released" },
    ];
  }, [summary, ui.textPrimary, receivedSeries, releasedSeries, disapprovedSeries]);

  const dtnKpis = useMemo(() => {
    if (!dtnSummary) return [];
    return [
      { label: "Total DTNs", value: dtnSummary.total_dtns, color: ui.textPrimary, icon: "🗂️" },
      { label: "Completed", value: dtnSummary.completed, color: ACCENT, icon: "✅", sub: "all issuances terminal" },
      { label: "On Process", value: dtnSummary.on_process, color: AMBER, icon: "⏳", sub: "at least one issuance still open" },
      { label: "Disapproved", value: dtnSummary.disapproved, color: RED, icon: "⛔" },
      { label: "Multi-Issuance DTNs", value: dtnSummary.multi_issuance_dtns, color: VIOLET, icon: "🔀", sub: "DTNs with >1 reference record" },
    ];
  }, [dtnSummary, ui.textPrimary]);

  const nodKpis = useMemo(() => {
    if (!nod) return [];
    return [
      { label: "NOD Rate", value: `${nod.nod_rate}%`, color: ui.textPrimary, icon: "📋", sub: `${nod.records_with_nod.toLocaleString()} of ${nod.total_records.toLocaleString()} records` },
      { label: "Avg NODs / Record", value: nod.avg_nod_count, color: VIOLET, icon: "🔁" },
      { label: "Avg Compliance Turnaround", value: nod.avg_compliance_turnaround_days != null ? `${nod.avg_compliance_turnaround_days}d` : "—", color: BLUE, icon: "⏱️", sub: "last NOD → compliance docs received" },
      { label: "Awaiting Compliance", value: nod.pending_compliance, color: RED, icon: "⏳", sub: "NOD sent, still on process" },
    ];
  }, [nod, ui.textPrimary]);

  const labelStyle = {
    fontSize: "0.7rem", fontWeight: 600, color: ui.textMuted,
    textTransform: "uppercase", letterSpacing: "0.04em",
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* ── Header + tab switcher — matches Processing Trend's layout:
          title/subtitle left, compact tab pills right, same row. ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: ui.textPrimary }}>
            FGMP Monitoring &amp; Analytics
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: ui.textMuted }}>
            Certification workflow volume, live status, workload and compliance in one place
          </p>
        </div>
        <TabSwitch active={activeTab} onChange={setActiveTab} ui={ui} />
      </div>

      {/* ── Shared filter bar — bordered/tinted panel, labelled fields. ── */}
      <div style={{
        background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${ui.cardBorder}`, borderRadius: 10, padding: "12px 14px",
        marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>Year</label>
            <select value={year} onChange={(e) => { setYear(e.target.value); setMonth("All"); }} style={selectStyle(ui)}>
              {years.map((y) => <option key={y} value={y}>{y === "All" ? "All years" : y}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={year === "All"} style={selectStyle(ui)}>
              {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        {activeTab === "monitoring" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>Count by</label>
            <KpiViewToggle value={kpiView} onChange={setKpiView} ui={ui} />
          </div>
        )}
      </div>

      {error && <div style={{ color: RED, fontSize: "0.8rem", marginBottom: 12 }}>{error}</div>}

      {activeTab === "monitoring" ? (
        <GMPMonitoringTab
          ui={ui} darkMode={darkMode} loading={loading}
          kpiView={kpiView} kpis={kpis} dtnKpis={dtnKpis}
          workload={workload} byStep={byStep} aging={aging} nodKpis={nodKpis}
        />
      ) : (
        <GMPAnalyticsTab
          ui={ui} darkMode={darkMode} loading={loading}
          trend={trend} category={category} dtnSummary={dtnSummary}
          picsCountry={picsCountry} nod={nod} stepTiming={stepTiming}
        />
      )}
    </div>
  );
}
