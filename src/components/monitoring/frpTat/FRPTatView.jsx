// src/components/monitoring/frpTat/FRPTatView.jsx
// Changes vs previous version:
//   • Removed TAT Distribution histogram chart
//   • Additional Analysis section now has 3 charts:
//     1. Pass/Fail Rate over time (stacked bar)
//     2. Applications Volume trend (bar)
//     3. Target Compliance Heatmap (calendar-style, full width)

import { useState, useEffect, useRef, useMemo } from "react";
import { Chart, registerables } from "chart.js";
import { getAnalyticsFRPTATTrend } from "../../../api/analytics";

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

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function useProgressiveReveal(trigger, total, interval = 120) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) { setCount(0); return; }
    if (count >= total) return;
    const t = setTimeout(() => setCount((c) => c + 1), interval);
    return () => clearTimeout(t);
  }, [trigger, count, total, interval]);
  return count;
}

function FadeIn({ visible, delay = 0, children }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [visible, delay]);
  return (
    <div style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.35s ease, transform 0.35s ease" }}>
      {children}
    </div>
  );
}

function SkeletonBox({ height = 74, borderRadius = 10, ui }) {
  return (
    <div style={{ height, borderRadius, background: ui.inputBg, opacity: 0.6, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)", animation: "skshimmer 1.4s infinite" }} />
      <style>{`@keyframes skshimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

function MetricCard({ label, value, sub, subColor, ui }) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return (
    <div style={{ background: ui.inputBg, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 130 }}>
      <p style={{ margin: "0 0 6px", fontSize: "0.72rem", color: ui.textMuted, fontFamily: font }}>{label}</p>
      <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: ui.textPrimary, fontFamily: font }}>{value}</p>
      {sub && <p style={{ margin: "3px 0 0", fontSize: "0.7rem", color: subColor || ui.textMuted, fontFamily: font }}>{sub}</p>}
    </div>
  );
}

function StatusPill({ avgTat, target }) {
  if (avgTat == null || target == null) return <span style={{ color: "#888", fontSize: "0.72rem" }}>—</span>;
  const diff = +(avgTat - target).toFixed(1);
  const isOver = diff > 0;
  const isNear = !isOver && diff > -2;
  const s = isOver ? { bg: "#fef2f2", color: "#b91c1c", label: "Over target" } : isNear ? { bg: "#fef9c3", color: "#a16207", label: "Near target" } : { bg: "#dcfce7", color: "#15803d", label: "On target" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{s.label}</span>
      <span style={{ fontSize: "0.68rem", color: s.color, fontWeight: 600 }}>{diff > 0 ? `+${diff}` : diff} days</span>
    </div>
  );
}

function EmptyChart({ label, ui }) {
  return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: ui.textMuted, fontSize: "0.8rem" }}>{label}</div>;
}

function SkeletonTableRows({ ui, rows = 3 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} style={{ padding: "10px 14px" }}><SkeletonBox height={14} borderRadius={4} ui={ui} /></td>)}</tr>
  ));
}

// ── Existing Chart Panel (line + bar) ────────────────────────────────────────
function ChartPanel({ rows, darkMode, ui, loading, revealed }) {
  const FB = "#1877F2";
  const lineRef = useRef(null);
  const barRef = useRef(null);
  const lineChart = useRef(null);
  const barChart = useRef(null);

  useEffect(() => {
    if (loading || !rows.length) return;
    const labels = rows.map((d) => d.month);
    const avgData = rows.map((d) => +(d.avg_tat_days ?? 0).toFixed(2));
    const minData = rows.map((d) => d.min_tat_days ?? 0);
    const maxData = rows.map((d) => d.max_tat_days ?? 0);
    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    const baseScales = {
      x: { ticks: { color: tickCol, font: { size: 11 }, maxRotation: 45 }, grid: { color: gridCol }, border: { display: false } },
      y: { ticks: { color: tickCol, font: { size: 11 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true },
    };
    lineChart.current?.destroy();
    barChart.current?.destroy();
    if (lineRef.current) {
      lineChart.current = new Chart(lineRef.current, {
        type: "line",
        data: { labels, datasets: [{ label: "Avg TAT (days)", data: avgData, borderColor: FB, backgroundColor: "rgba(24,119,242,0.08)", borderWidth: 2.5, pointBackgroundColor: FB, pointRadius: 4, tension: 0.35, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: baseScales },
      });
    }
    if (barRef.current) {
      barChart.current = new Chart(barRef.current, {
        type: "bar",
        data: { labels, datasets: [{ label: "Min", data: minData, backgroundColor: "#9FE1CB", borderRadius: 3 }, { label: "Avg", data: avgData, backgroundColor: FB, borderRadius: 3 }, { label: "Max", data: maxData, backgroundColor: "#F0997B", borderRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: baseScales },
      });
    }
    return () => { lineChart.current?.destroy(); barChart.current?.destroy(); };
  }, [rows, darkMode, loading]);

  const legendDot = (color) => <span style={{ width: 9, height: 9, borderRadius: 2, background: color, display: "inline-block", flexShrink: 0 }} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
      <FadeIn visible={loading || revealed(7)}>
        <div style={{ background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "0.82rem", fontWeight: 700, color: ui.textPrimary }}>Average TAT per month</p>
          <p style={{ margin: "0 0 8px", fontSize: "0.72rem", color: ui.textMuted }}>Trend over time</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: ui.textMuted }}>{legendDot(FB)} Avg TAT (days)</span>
          </div>
          <div style={{ position: "relative", height: 180 }}>
            {loading ? <SkeletonBox height={180} borderRadius={8} ui={ui} /> : !rows.length ? <EmptyChart label="No data" ui={ui} /> : <canvas ref={lineRef} role="img" aria-label="Line chart of average TAT per month" />}
          </div>
        </div>
      </FadeIn>
      <FadeIn visible={loading || revealed(8)}>
        <div style={{ background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "0.82rem", fontWeight: 700, color: ui.textPrimary }}>TAT range per month</p>
          <p style={{ margin: "0 0 8px", fontSize: "0.72rem", color: ui.textMuted }}>Min, avg, and max days</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            {[["#9FE1CB", "Min"], [FB, "Avg"], ["#F0997B", "Max"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: ui.textMuted }}>{legendDot(c)} {l}</span>
            ))}
          </div>
          <div style={{ position: "relative", height: 180 }}>
            {loading ? <SkeletonBox height={180} borderRadius={8} ui={ui} /> : !rows.length ? <EmptyChart label="No data" ui={ui} /> : <canvas ref={barRef} role="img" aria-label="Bar chart of min, avg, max TAT per month" />}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

// ── Additional Charts Panel ───────────────────────────────────────────────────
function AdditionalChartsPanel({ rows, activeTimeline, darkMode, ui, loading, revealed }) {
  const volumeRef = useRef(null);
  const volumeChart = useRef(null);

  useEffect(() => {
    if (loading || !rows.length) return;

    const chronoRows = [...rows].reverse();
    const labels = chronoRows.map((d) => d.month);
    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    const baseScales = {
      x: { ticks: { color: tickCol, font: { size: 11 }, maxRotation: 45 }, grid: { color: gridCol }, border: { display: false } },
      y: { ticks: { color: tickCol, font: { size: 11 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true },
    };

    volumeChart.current?.destroy();

    // Applications Volume
    if (volumeRef.current) {
      const volumeData = chronoRows.map((d) => d.total_applications ?? 0);
      volumeChart.current = new Chart(volumeRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{ label: "Applications", data: volumeData, backgroundColor: "rgba(139,92,246,0.7)", borderRadius: 3, hoverBackgroundColor: "#8b5cf6" }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: baseScales,
        },
      });
    }

    return () => { volumeChart.current?.destroy(); };
  }, [rows, darkMode, loading, activeTimeline]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const map = {};
    rows.forEach((d) => {
      if (!d.month || !d.year) return;
      const key = `${d.year}-${d.month}`;
      map[key] = { avg: d.avg_tat_days, status: d.avg_tat_days != null && activeTimeline != null ? d.avg_tat_days <= activeTimeline ? "on" : "over" : "unknown" };
    });
    return map;
  }, [rows, activeTimeline]);

  const uniqueYears = useMemo(() => [...new Set(rows.map((d) => String(d.year)))].sort(), [rows]);
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const cardStyle = { background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 12, padding: "14px 16px" };
  const titleStyle = { margin: "0 0 2px", fontSize: "0.82rem", fontWeight: 700, color: ui.textPrimary };
  const subStyle = { margin: "0 0 10px", fontSize: "0.72rem", color: ui.textMuted };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header */}
      <FadeIn visible={loading || revealed(9)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: ui.cardBorder }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Additional Analysis</span>
          <div style={{ flex: 1, height: 1, background: ui.cardBorder }} />
        </div>
      </FadeIn>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Applications Volume — spans full width */}
        <FadeIn visible={loading || revealed(9)}>
          <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
            <p style={titleStyle}>Applications volume</p>
            <p style={subStyle}>Total received per month</p>
            <div style={{ position: "relative", height: 200 }}>
              {loading ? <SkeletonBox height={200} borderRadius={8} ui={ui} /> : !rows.length ? <EmptyChart label="No data" ui={ui} /> : <canvas ref={volumeRef} role="img" aria-label="Applications volume chart" />}
            </div>
          </div>
        </FadeIn>

        {/* 3. Compliance Heatmap — spans full width */}
        <FadeIn visible={loading || revealed(10)}>
          <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
            <p style={titleStyle}>Target compliance heatmap</p>
            <p style={subStyle}>Green = on target · Red = over target · Gray = no data</p>
            {loading ? (
              <SkeletonBox height={120} borderRadius={8} ui={ui} />
            ) : !rows.length ? (
              <EmptyChart label="No data" ui={ui} />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "separate", borderSpacing: 3, fontSize: "0.65rem" }}>
                  <thead>
                    <tr>
                      <th style={{ color: ui.textMuted, padding: "2px 4px", fontWeight: 600, textAlign: "left", minWidth: 36 }}>Year</th>
                      {MONTHS_SHORT.map((m) => (
                        <th key={m} style={{ color: ui.textMuted, padding: "2px 4px", fontWeight: 600, textAlign: "center", minWidth: 28 }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueYears.map((yr) => (
                      <tr key={yr}>
                        <td style={{ color: ui.textPrimary, fontWeight: 700, padding: "2px 4px" }}>{yr}</td>
                        {MONTHS_SHORT.map((m) => {
                          const entry = Object.entries(heatmapData).find(([k]) => k.startsWith(yr) && k.includes(m));
                          const status = entry ? entry[1].status : "unknown";
                          const avg = entry ? entry[1].avg : null;
                          const bg = status === "on" ? "#22c55e" : status === "over" ? "#ef4444" : darkMode ? "#2a2a2a" : "#e5e7eb";
                          const opacity = status === "unknown" ? 0.3 : 0.75;
                          return (
                            <td key={m} title={avg != null ? `${m} ${yr}: ${avg.toFixed(1)} days` : `${m} ${yr}: no data`}
                              style={{ width: 28, height: 28, borderRadius: 4, background: bg, opacity, cursor: avg != null ? "pointer" : "default", textAlign: "center", verticalAlign: "middle", color: "#fff", fontWeight: 700, fontSize: "0.6rem" }}>
                              {avg != null ? Math.round(avg) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  {[["#22c55e", "On target"], ["#ef4444", "Over target"], [darkMode ? "#2a2a2a" : "#e5e7eb", "No data"]].map(([c, l]) => (
                    <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.68rem", color: ui.textMuted }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} /> {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FadeIn>

      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FRPTatView({ ui, darkMode }) {
  const FB = "#1877F2";
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [selectedYears, setSelectedYears] = useState([]);
  const [month, setMonth] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [allData, setAllData] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTimeline, setActiveTimeline] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (month !== "All") params.month = month;
    getAnalyticsFRPTATTrend(params)
      .then((res) => {
        const rows = res.data || [];
        setAllData(rows);
        const uniqueYears = Array.from(new Set(rows.map((d) => String(d.year)))).sort();
        setYears(uniqueYears);
        const timelines = [...new Set(rows.map((d) => d.timeline_days))].sort((a, b) => a - b);
        setActiveTimeline((prev) => prev && timelines.includes(prev) ? prev : (timelines[0] ?? null));
      })
      .catch(() => setError("Failed to load TAT data. Please try again."))
      .finally(() => setLoading(false));
  }, [month]);

  const toggleYear = (y) => { setCurrentPage(1); setSelectedYears((prev) => prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y]); };
  const clearYears = () => { setSelectedYears([]); setCurrentPage(1); };

  const timelineTabs = useMemo(() => [...new Set(allData.map((d) => d.timeline_days))].sort((a, b) => a - b), [allData]);

  const tabRows = useMemo(() => {
    let rows = allData.filter((d) => d.timeline_days === activeTimeline);
    if (selectedYears.length > 0) rows = rows.filter((d) => selectedYears.includes(String(d.year)));
    return [...rows].sort((a, b) => new Date(b.month) - new Date(a.month));
  }, [allData, activeTimeline, selectedYears]);

  useEffect(() => { setCurrentPage(1); }, [activeTimeline, selectedYears, month]);

  const totalApps = tabRows.reduce((s, d) => s + (d.total_applications ?? 0), 0);
  const avgAll = tabRows.length ? +(tabRows.reduce((s, d) => s + (d.avg_tat_days ?? 0), 0) / tabRows.length).toFixed(1) : null;
  const minAll = tabRows.length ? Math.min(...tabRows.map((d) => d.min_tat_days ?? Infinity)) : null;
  const maxAll = tabRows.length ? Math.max(...tabRows.map((d) => d.max_tat_days ?? -Infinity)) : null;
  const bestMonth = minAll != null ? tabRows.find((d) => d.min_tat_days === minAll)?.month : null;
  const worstMonth = maxAll != null ? tabRows.find((d) => d.max_tat_days === maxAll)?.month : null;
  const passCount = tabRows.filter((d) => d.avg_tat_days != null && activeTimeline != null && d.avg_tat_days <= activeTimeline).length;
  const passRate = tabRows.length ? +((passCount / tabRows.length) * 100).toFixed(1) : null;
  const exceededCount = tabRows.filter((d) => d.avg_tat_days != null && activeTimeline != null && d.avg_tat_days > activeTimeline).length;

  const now = new Date();
  const currentMonthShort = now.toLocaleString("default", { month: "short" });
  const currentYear = String(now.getFullYear());
  const currentMonthRow = tabRows.find((d) => d.month?.includes(currentMonthShort) && d.month?.includes(currentYear));

  const totalPages = Math.ceil(tabRows.length / pageSize);
  const paginatedRows = tabRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const TOTAL_SECTIONS = 11;
  const hasData = !loading && !error;
  const revealedCount = useProgressiveReveal(hasData, TOTAL_SECTIONS, 130);
  const revealed = (n) => revealedCount >= n;

  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  const selectStyle = { background: ui.inputBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 7, padding: "6px 10px", fontSize: "0.8rem", color: ui.textPrimary, outline: "none", colorScheme: darkMode ? "dark" : "light", fontFamily: font, cursor: "pointer" };
  const yearBtnStyle = (active) => ({ padding: "5px 12px", fontSize: "0.78rem", fontWeight: active ? 700 : 500, fontFamily: font, border: `1px solid ${active ? FB : ui.cardBorder}`, borderRadius: 6, cursor: "pointer", background: active ? (darkMode ? "#1a2744" : "#e7f0fd") : ui.inputBg, color: active ? FB : ui.textMuted, transition: "all 0.15s", outline: "none" });

  return (
    <div style={{ fontFamily: font }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: 700, color: ui.textPrimary }}>FRP &amp; CRP — Turnaround Time Trend</h2>
        <p style={{ margin: 0, fontSize: "0.78rem", color: ui.textMuted }}>Processing time from date received (Central) to date released · grouped by Citizen's Charter timeline</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: ui.textMuted }}>Filters:</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={clearYears} style={yearBtnStyle(selectedYears.length === 0)}>All</button>
          {loading ? [1, 2, 3].map((i) => <div key={i} style={{ width: 52, height: 28, borderRadius: 6, background: ui.inputBg, opacity: 0.5 }} />) : years.map((y) => <button key={y} onClick={() => toggleYear(y)} style={yearBtnStyle(selectedYears.includes(y))}>{y}</button>)}
        </div>
        <select value={month} onChange={(e) => { setMonth(e.target.value); setCurrentPage(1); }} style={selectStyle}>
          {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {(selectedYears.length > 0 || month !== "All") && (
          <button onClick={() => { clearYears(); setMonth("All"); }} style={{ ...selectStyle, color: ui.textMuted, background: "transparent" }}>Reset</button>
        )}
      </div>

      {/* Error */}
      {error && <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: darkMode ? "#2e0a0a" : "#fef2f2", border: `1px solid ${darkMode ? "#7f1d1d" : "#fecaca"}`, color: darkMode ? "#f87171" : "#b91c1c", fontSize: "0.82rem" }}>⚠️ {error}</div>}

      {/* Timeline tabs */}
      {!error && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", borderBottom: `1px solid ${ui.cardBorder}` }}>
          {loading ? [1, 2, 3].map((i) => <div key={i} style={{ width: 100, height: 34, borderRadius: "6px 6px 0 0", background: ui.inputBg, opacity: 0.5 }} />) : timelineTabs.map((tl) => {
            const isActive = tl === activeTimeline;
            return <button key={tl} onClick={() => setActiveTimeline(tl)} style={{ padding: "7px 18px", fontSize: "0.8rem", fontWeight: isActive ? 700 : 500, fontFamily: font, border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer", transition: "background 0.15s, color 0.15s", background: isActive ? ui.cardBg : "transparent", color: isActive ? FB : ui.textMuted, borderBottom: isActive ? `2px solid ${FB}` : "2px solid transparent", outline: "none" }}>{tl != null ? `${tl}-Day Track` : "Unknown"}</button>;
          })}
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {loading ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ flex: 1, minWidth: 130 }}><SkeletonBox ui={ui} /></div>) : (
          <>
            <FadeIn visible={revealed(1)}><MetricCard label="Total applications" ui={ui} value={totalApps} sub={`${tabRows.length} month${tabRows.length !== 1 ? "s" : ""}`} /></FadeIn>
            <FadeIn visible={revealed(2)}><MetricCard label="Overall avg TAT" ui={ui} value={avgAll != null ? `${avgAll} days` : "—"} sub={avgAll != null && activeTimeline ? avgAll <= activeTimeline ? "↓ Within target" : "↑ Exceeds target" : undefined} subColor={avgAll != null && activeTimeline ? avgAll <= activeTimeline ? "#15803d" : "#b91c1c" : undefined} /></FadeIn>
            <FadeIn visible={revealed(3)}><MetricCard label="Best TAT (min)" ui={ui} value={minAll != null && minAll !== Infinity ? `${minAll} days` : "—"} sub={bestMonth} /></FadeIn>
            <FadeIn visible={revealed(4)}><MetricCard label="Longest TAT (max)" ui={ui} value={maxAll != null && maxAll !== -Infinity ? `${maxAll} days` : "—"} sub={worstMonth} subColor="#b91c1c" /></FadeIn>
            <FadeIn visible={revealed(5)}><MetricCard label="Pass rate" ui={ui} value={passRate != null ? `${passRate}%` : "—"} sub={`${passCount} of ${tabRows.length} months on target`} subColor={passRate != null ? passRate >= 80 ? "#15803d" : passRate >= 50 ? "#a16207" : "#b91c1c" : undefined} /></FadeIn>
            <FadeIn visible={revealed(6)}><MetricCard label="Months exceeded" ui={ui} value={exceededCount} sub={`out of ${tabRows.length} months`} subColor={exceededCount > 0 ? "#b91c1c" : "#15803d"} /></FadeIn>
          </>
        )}
      </div>

      {/* Current Month Highlight */}
      {!error && !loading && currentMonthRow && (
        <FadeIn visible={revealed(7)}>
          <div style={{ background: darkMode ? "#1a2744" : "#e7f0fd", border: `1px solid ${darkMode ? "#2a3f6f" : "#bfd4f9"}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: FB, whiteSpace: "nowrap" }}>📅 Current Month — {currentMonthRow.month}</span>
            <span style={{ fontSize: "0.8rem", color: ui.textPrimary }}>Avg TAT: <strong>{(+currentMonthRow.avg_tat_days).toFixed(1)} days</strong></span>
            <span style={{ fontSize: "0.8rem", color: ui.textSub }}>Min: <strong>{currentMonthRow.min_tat_days} days</strong></span>
            <span style={{ fontSize: "0.8rem", color: ui.textSub }}>Max: <strong>{currentMonthRow.max_tat_days} days</strong></span>
            <span style={{ fontSize: "0.8rem", color: ui.textSub }}>Applications: <strong>{currentMonthRow.total_applications}</strong></span>
            <StatusPill avgTat={currentMonthRow.avg_tat_days} target={activeTimeline} />
          </div>
        </FadeIn>
      )}

      {/* Existing Charts */}
      {!error && <ChartPanel rows={[...tabRows].reverse()} darkMode={darkMode} ui={ui} loading={loading} revealed={revealed} />}

      {/* Additional Charts */}
      {!error && <AdditionalChartsPanel rows={tabRows} activeTimeline={activeTimeline} darkMode={darkMode} ui={ui} loading={loading} revealed={revealed} />}

      {/* Monthly table */}
      {!error && (
        <FadeIn visible={loading || revealed(11)}>
          <div style={{ background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${ui.cardBorder}`, background: colHdr, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: ui.textPrimary }}>
                  Monthly breakdown
                  {activeTimeline && <span style={{ marginLeft: 8, fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: darkMode ? "#1a2744" : "#e7f0fd", color: FB }}>Target: {activeTimeline} days</span>}
                </p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: ui.textMuted }}>Detailed TAT stats per calendar month</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>Rows per page:</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ ...selectStyle, padding: "4px 8px" }}>
                  {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                <thead>
                  <tr style={{ background: colHdr }}>
                    {["Month", "Received Applications", "Avg TAT", "Min TAT", "Max TAT", "vs Target", "Status"].map((h) => (
                      <th key={h} style={{ fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: ui.textMuted, padding: "9px 14px", textAlign: ["Month", "Applications"].includes(h) ? "left" : "center", borderBottom: `1px solid ${ui.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <SkeletonTableRows ui={ui} rows={3} /> : !paginatedRows.length ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: ui.textMuted, fontSize: "0.84rem" }}>No FRP &amp; CRP data found for the selected filters.</td></tr>
                  ) : paginatedRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < paginatedRows.length - 1 ? `1px solid ${ui.cardBorder}` : "none", transition: "background 0.12s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = ui.hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "10px 14px", fontSize: "0.82rem", fontWeight: 700, color: ui.textPrimary }}>{row.month}</td>
                      <td style={{ padding: "10px 14px", fontSize: "0.8rem", color: ui.textSub }}>{row.total_applications}</td>
                      <td style={{ padding: "10px 14px", fontSize: "0.8rem", color: ui.textPrimary, textAlign: "center", fontWeight: 600 }}>{row.avg_tat_days != null ? `${(+row.avg_tat_days).toFixed(1)} days` : "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: "0.8rem", color: ui.textSub, textAlign: "center" }}>{row.min_tat_days != null ? `${row.min_tat_days} days` : "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: "0.8rem", color: ui.textSub, textAlign: "center" }}>{row.max_tat_days != null ? `${row.max_tat_days} days` : "—"}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {row.avg_tat_days != null && activeTimeline != null ? (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: row.avg_tat_days <= activeTimeline ? "#15803d" : "#b91c1c" }}>
                            {row.avg_tat_days - activeTimeline > 0 ? `+${(row.avg_tat_days - activeTimeline).toFixed(1)}` : (row.avg_tat_days - activeTimeline).toFixed(1)} days
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}><StatusPill avgTat={row.avg_tat_days} target={activeTimeline} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div style={{ padding: "10px 16px", borderTop: `1px solid ${ui.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: "0.75rem", color: ui.textMuted }}>Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, tabRows.length)} of {tabRows.length} months</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...selectStyle, padding: "4px 8px", opacity: currentPage === 1 ? 0.4 : 1 }}>«</button>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ ...selectStyle, padding: "4px 10px", opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, []).map((p, idx) =>
                    p === "..." ? <span key={`e-${idx}`} style={{ fontSize: "0.78rem", color: ui.textMuted, padding: "0 4px" }}>…</span> :
                      <button key={p} onClick={() => setCurrentPage(p)} style={{ ...selectStyle, padding: "4px 10px", background: p === currentPage ? FB : ui.inputBg, color: p === currentPage ? "#fff" : ui.textPrimary, fontWeight: p === currentPage ? 700 : 400 }}>{p}</button>
                  )}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ ...selectStyle, padding: "4px 10px", opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...selectStyle, padding: "4px 8px", opacity: currentPage === totalPages ? 0.4 : 1 }}>»</button>
                </div>
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}