// src/pages/GMPMonitoringPage.jsx
// FGMP Monitoring & Analytics — a first-class FGMP page (sits next to FGMP
// Queue / FGMP Tasks in the sidebar), replacing the "gmpanalytics" tab that
// used to live buried inside the shared, CPR-oriented Monitoring page. Two
// tabs split the same underlying data by purpose:
//   Monitoring — live/operational: current snapshot, per-record live status,
//                who's carrying open work, what needs attention right now.
//   Analytics  — historical/compositional: trends over time, breakdowns,
//                data worth a second look.
import { useState, useEffect, useMemo } from "react";
import {
  getGMPAnalyticsAvailableYears, getGMPAnalyticsSummary, getGMPAnalyticsDTNSummary,
  getGMPAnalyticsTrend, getGMPAnalyticsByCategory, getGMPAnalyticsStepTiming,
  getGMPAnalyticsWorkload, getGMPAnalyticsAging, getGMPAnalyticsNOD, getGMPAnalyticsPicsCountry,
} from "../api/gmpAnalytics";
import { makeUI } from "../components/dashboard/utils";
import { MONTH_OPTIONS, KpiViewToggle, selectStyle } from "../components/gmp/dashboard/gmpAnalyticsShared";
import GMPMonitoringTab from "../components/gmp/dashboard/GMPMonitoringTab";
import GMPAnalyticsTab from "../components/gmp/dashboard/GMPAnalyticsTab";

const ACCENT = "#10b981";

const TABS = [
  { id: "monitoring", icon: "🩺", label: "Monitoring", caption: "Live status, right now" },
  { id: "analytics",  icon: "📈", label: "Analytics",  caption: "Trends & breakdowns" },
];

function TabSwitch({ active, onChange, ui, darkMode }) {
  return (
    <div style={{
      display: "inline-flex", gap: 4, padding: 4, borderRadius: 12,
      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      border: `1px solid ${ui.cardBorder}`,
    }}>
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
              padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
              background: isActive ? ACCENT : "transparent",
              color: isActive ? "#fff" : ui.textPrimary,
              transition: "background 0.15s, color 0.15s", textAlign: "left", minWidth: 150,
            }}
          >
            <span style={{ fontSize: "0.84rem", fontWeight: 800 }}>{t.icon} {t.label}</span>
            <span style={{ fontSize: "0.68rem", fontWeight: 500, opacity: isActive ? 0.92 : 0.65 }}>
              {t.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function GMPMonitoringPage({ darkMode = false }) {
  const ui = useMemo(() => makeUI(darkMode), [darkMode]);
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
      { label: "Total Records", value: summary.total, color: ACCENT, icon: "📄" },
      { label: "Released", value: summary.released, color: "#0ea5e9", icon: "✅", sub: `${summary.release_rate}% release rate` },
      { label: "On Process", value: summary.on_process, color: "#f59e0b", icon: "⏳" },
      { label: "Disapproved", value: summary.disapproved, color: "#ef4444", icon: "⛔" },
      { label: "Avg TAT", value: summary.avg_tat_days != null ? `${summary.avg_tat_days}d` : "—", color: "#8b5cf6", icon: "⏱️", sub: "working days, received → released" },
    ];
  }, [summary]);

  const dtnKpis = useMemo(() => {
    if (!dtnSummary) return [];
    return [
      { label: "Total DTNs", value: dtnSummary.total_dtns, color: ACCENT, icon: "🗂️" },
      { label: "Completed", value: dtnSummary.completed, color: "#0ea5e9", icon: "✅", sub: "all issuances terminal" },
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
      { label: "Avg Compliance Turnaround", value: nod.avg_compliance_turnaround_days != null ? `${nod.avg_compliance_turnaround_days}d` : "—", color: "#0ea5e9", icon: "⏱️", sub: "last NOD → compliance docs received" },
      { label: "Awaiting Compliance", value: nod.pending_compliance, color: "#ef4444", icon: "⏳", sub: "NOD sent, still on process" },
    ];
  }, [nod]);

  return (
    <div style={{ padding: "20px 24px", background: ui.pageBg, minHeight: "100%" }}>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, borderRadius: 12, background: `${ACCENT}1c`, fontSize: "1.2rem", flexShrink: 0,
        }}>
          🏭
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: ui.textPrimary, letterSpacing: "-0.015em" }}>
            FGMP Monitoring &amp; Analytics
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: ui.textMuted }}>
            Certification workflow volume, live status, workload and compliance in one place
          </p>
        </div>
      </div>

      {/* ── Tabs + filters ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <TabSwitch active={activeTab} onChange={setActiveTab} ui={ui} darkMode={darkMode} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={year} onChange={(e) => { setYear(e.target.value); setMonth("All"); }} style={selectStyle(ui)}>
            {years.map((y) => <option key={y} value={y}>{y === "All" ? "All years" : y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={year === "All"} style={selectStyle(ui)}>
            {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {activeTab === "monitoring" && <KpiViewToggle value={kpiView} onChange={setKpiView} ui={ui} />}
        </div>
      </div>

      {error && <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: 12 }}>{error}</div>}

      {activeTab === "monitoring" ? (
        <GMPMonitoringTab
          ui={ui} darkMode={darkMode} loading={loading}
          kpiView={kpiView} kpis={kpis} dtnKpis={dtnKpis}
          workload={workload} aging={aging} nodKpis={nodKpis}
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
