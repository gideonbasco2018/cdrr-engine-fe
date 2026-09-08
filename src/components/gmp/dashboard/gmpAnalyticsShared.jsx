// src/components/gmp/dashboard/gmpAnalyticsShared.jsx
// Shared chart/list primitives + filter controls for GMPMonitoringAnalyticsView's
// two tabs (GMPMonitoringTab / GMPAnalyticsTab).
//
// Palette: ACCENT (emerald) is the one brand/interactive color. Everything
// else is semantic and kept separate from it — BLUE (volume), AMBER
// (attention/in-flight), RED (risk), VIOLET (time-based) — matching
// GMPMonitoringAnalyticsView's KPI palette so a color means the same thing
// everywhere on this page.
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { GMP_STEPS } from "../shared/constants";

Chart.register(...registerables);

export const MONTH_OPTIONS = [
  { value: "All", label: "All months" },
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" }, { value: "4", label: "April" },
  { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" },
  { value: "9", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

export const KPI_VIEW_OPTIONS = [
  { value: "reference", label: "By Reference" },
  { value: "dtn", label: "By DTN" },
  { value: "both", label: "Both" },
];

const ACCENT = "#0f8a72";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// One cycling palette for multi-category breakdown bars — blue/emerald/amber/
// red/violet first (this page's own semantic colors), then a few extras for
// charts with more than 5 categories.
const BAR_COLORS = [
  "#2f6fed", "#0f8a72", "#b9740f", "#c8384f",
  "#7c5cff", "#06b6d4", "#ec4899", "#84cc16",
];

export function selectStyle(ui) {
  return {
    background: ui.inputBg, color: ui.textPrimary, border: `1px solid ${ui.cardBorder}`,
    borderRadius: 8, padding: "6px 10px", fontSize: "0.78rem", outline: "none",
  };
}

export function KpiViewToggle({ value, onChange, ui }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${ui.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
      {KPI_VIEW_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{
              border: "none", cursor: "pointer", padding: "6px 12px", fontSize: "0.78rem",
              fontWeight: active ? 700 : 500, color: active ? "#fff" : ui.textPrimary,
              background: active ? ACCENT : ui.inputBg, transition: "background 0.15s, color 0.15s",
            }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Section heading — plain text label + thin rule, no icon badge (structure
// carries the hierarchy, not decoration). ───────────────────────────────────
export function SectionHeading({ index, icon, title, subtitle, ui, action }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10,
      marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${ui.cardBorder}`,
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: ui.textPrimary, letterSpacing: "-0.005em" }}>
          {title}
        </h3>
        {subtitle && <p style={{ margin: "1px 0 0", fontSize: "0.72rem", color: ui.textMuted }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SkeletonBox({ height = 74, borderRadius = 10, ui }) {
  return (
    <div style={{ height, borderRadius, background: ui.inputBg, opacity: 0.6, overflow: "hidden", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",
        animation: "gmpAnalyticsShimmer 1.4s infinite",
      }} />
      <style>{`@keyframes gmpAnalyticsShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

export function EmptyChart({ label, ui }) {
  return (
    <div style={{ flex: 1, minHeight: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "1.1rem", background: `${ACCENT}12`, color: ui.textMuted,
      }}>
        📭
      </div>
      <span style={{ color: ui.textMuted, fontSize: "0.78rem", maxWidth: 200 }}>{label}</span>
    </div>
  );
}

// ── Trend chart (received / released / disapproved) ─────────────────────────
export function TrendChartPanel({ data, darkMode, ui, loading }) {
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
          { label: "Received", data: data.map((d) => d.received), borderColor: "#2f6fed", backgroundColor: "rgba(47,111,237,0.08)", borderWidth: 2.5, pointBackgroundColor: "#2f6fed", pointRadius: 4, pointHoverRadius: 6, tension: 0.35, fill: true },
          { label: "Released", data: data.map((d) => d.released), borderColor: ACCENT, backgroundColor: `${ACCENT}14`, borderWidth: 2.5, pointBackgroundColor: ACCENT, pointRadius: 4, pointHoverRadius: 6, tension: 0.35, fill: true },
          { label: "Disapproved", data: data.map((d) => d.disapproved), borderColor: "#c8384f", backgroundColor: "rgba(200,56,79,0.08)", borderWidth: 2, pointBackgroundColor: "#c8384f", pointRadius: 3, pointHoverRadius: 5, tension: 0.35, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "top", labels: { color: tickCol, font: { size: 12, family: FONT }, usePointStyle: true, pointStyle: "circle" } },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          x: { ticks: { color: tickCol, font: { size: 11 }, maxRotation: 45 }, grid: { color: gridCol }, border: { display: false } },
          y: { ticks: { color: tickCol, font: { size: 11 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data, darkMode, loading]);

  return (
    <div style={{ position: "relative", height: 300 }}>
      {loading ? <SkeletonBox height={300} borderRadius={8} ui={ui} />
        : !data.length ? <EmptyChart label="No data" ui={ui} />
        : <canvas ref={ref} />}
    </div>
  );
}

// ── Generic horizontal breakdown bar chart ───────────────────────────────────
// `singleColor` keeps a section monochrome (a semantic color, e.g. red for
// aging); `colorForItem(item, i)` gives each bar a specific, meaningful color
// (e.g. each workflow step's own brand color); omitting both cycles
// BAR_COLORS across the bars.
export function BreakdownBarChart({ items, ui, darkMode, emptyLabel, singleColor, colorForItem, afterLabel }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    chartRef.current?.destroy();
    if (!ref.current || !items.length) return;

    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    const colorFor = (i) => singleColor || (colorForItem && colorForItem(items[i], i)) || BAR_COLORS[i % BAR_COLORS.length];

    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: items.map((d) => d.name),
        datasets: [{
          label: "Count",
          data: items.map((d) => d.count),
          backgroundColor: items.map((_, i) => colorFor(i) + "cc"),
          borderColor: items.map((_, i) => colorFor(i)),
          borderWidth: 1.5,
          borderRadius: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false, callbacks: afterLabel ? { afterLabel: (ctx) => afterLabel(items[ctx.dataIndex]) } : undefined },
        },
        scales: {
          x: { ticks: { color: tickCol, font: { size: 11 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true },
          y: {
            ticks: {
              color: tickCol, font: { size: 11 },
              callback: (val, i) => { const lbl = items[i]?.name || ""; return lbl.length > 30 ? lbl.slice(0, 28) + "…" : lbl; },
            },
            grid: { display: false }, border: { display: false },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [items, darkMode]);

  const height = Math.max(140, items.length * 34);
  return (
    <div style={{ position: "relative", height }}>
      {!items.length ? <EmptyChart label={emptyLabel} ui={ui} /> : <canvas ref={ref} />}
    </div>
  );
}

// ── Evaluator workload — same horizontal bar chart; avg TAT (a second metric
// that can't cleanly show as a bar length) rides in the tooltip instead. ────
export function WorkloadBarChart({ items, ui, darkMode, emptyLabel }) {
  const mapped = items.map((i) => ({ name: i.evaluator, count: i.open_count, avg_tat_days: i.avg_tat_days }));
  return (
    <BreakdownBarChart
      items={mapped}
      ui={ui}
      darkMode={darkMode}
      emptyLabel={emptyLabel}
      singleColor="#b9740f"
      afterLabel={(item) => item.avg_tat_days != null ? `Avg TAT: ${item.avg_tat_days}d (working days)` : "Avg TAT: —"}
    />
  );
}

// ── Applications by current step — same horizontal bar chart, each bar in
// that step's own brand color (matches the color every other FGMP screen —
// Queue, Tasks — already uses for that step) instead of an arbitrary cycling
// palette. Steps with zero open applications still appear, at 0, so the
// pipeline reads as complete rather than only showing where work exists. ───
export function ByStepBarChart({ items, ui, darkMode, emptyLabel }) {
  const mapped = items.map((i) => ({ name: i.step, count: i.count }));
  return (
    <BreakdownBarChart
      items={mapped}
      ui={ui}
      darkMode={darkMode}
      emptyLabel={emptyLabel}
      colorForItem={(item) => GMP_STEPS.find((s) => s.id === item.name)?.color ?? ACCENT}
    />
  );
}

// ── Step timing bar chart — same horizontal-bar treatment, step-specific
// colors kept (more meaningful here than a generic cycling palette). ────────
export function StepTimingChart({ data, darkMode, ui, loading }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const stepColor = (step) => GMP_STEPS.find((s) => s.id === step)?.color ?? ACCENT;

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
        datasets: [{
          label: "Avg calendar days",
          data: data.map((d) => d.avg_days ?? 0),
          backgroundColor: data.map((d) => stepColor(d.step) + "cc"),
          borderColor: data.map((d) => stepColor(d.step)),
          borderWidth: 1.5,
          borderRadius: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false, callbacks: { afterLabel: (ctx) => { const d = data[ctx.dataIndex]; return `Based on ${d.total} completed application${d.total === 1 ? "" : "s"}`; } } },
        },
        scales: {
          x: { ticks: { color: tickCol, font: { size: 11 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true, title: { display: true, text: "Calendar days", color: tickCol } },
          y: { ticks: { color: tickCol, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data, darkMode, loading]);

  return (
    <div style={{ position: "relative", height: 280 }}>
      {loading ? <SkeletonBox height={280} borderRadius={8} ui={ui} />
        : !data.length ? <EmptyChart label="No completed workflow steps yet" ui={ui} />
        : <canvas ref={ref} />}
    </div>
  );
}

// ── PIC/S classification mismatch rows ────────────────────────────────────────
export function MismatchList({ items, totalCount, ui, darkMode, emptyLabel }) {
  if (!items.length) return <EmptyChart label={emptyLabel} ui={ui} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((m) => (
        <div key={m.gmp_id} style={{ padding: "8px 10px", borderRadius: 8, background: ui.inputBg, border: `1px solid ${ui.cardBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: ui.textPrimary }}>{m.company || "—"}</span>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: darkMode ? "rgba(200,56,79,0.18)" : "rgba(200,56,79,0.1)", color: "#c8384f", flexShrink: 0 }}>
              {m.declared}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: ui.textMuted, marginTop: 2 }}>
            {m.foreign_manufacturer || "—"}{m.dtn ? ` · DTN ${m.dtn}` : ""}
          </div>
          <div style={{ fontSize: "0.72rem", color: ui.textMuted, marginTop: 2 }}>{m.reason}</div>
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
