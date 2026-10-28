// src/components/gmp/dashboard/gmpAnalyticsShared.jsx
// Shared chart/list primitives + filter controls for GMPMonitoringAnalyticsView's
// two tabs (GMPMonitoringTab / GMPAnalyticsTab).
//
// Palette: ACCENT (emerald) is the one brand/interactive color. Everything
// else is semantic and kept separate from it — BLUE (volume), AMBER
// (attention/in-flight), RED (risk), VIOLET (time-based) — matching
// GMPMonitoringAnalyticsView's KPI palette so a color means the same thing
// everywhere on this page.
import { useEffect, useRef, useState } from "react";
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

// One way to write a duration everywhere (pipeline pop-up, step timing chart).
export const fmtTime = (m) => {
  if (m == null) return "—";
  if (m < 1) return "Instant";
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 1440) {
    const h = Math.floor(m / 60), r = Math.round(m % 60);
    return r ? `${h} hr ${r} min` : `${h} hr`;
  }
  const n = (m / 1440).toFixed(1).replace(/\.0$/, "");
  return `${n} working day${n === "1" ? "" : "s"}`;
};

export function selectStyle(ui) {
  return {
    appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
    background: `transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%238a8d91' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 2px center`,
    color: ui.textPrimary, border: "none", borderBottom: `1px solid ${ui.cardBorder}`,
    borderRadius: 0, padding: "4px 20px 4px 2px", fontSize: "0.8rem", fontWeight: 600, outline: "none", cursor: "pointer",
  };
}

export function KpiViewToggle({ value, onChange, ui }) {
  return (
    <div style={{ display: "inline-flex", gap: 2 }}>
      {KPI_VIEW_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{
              border: "none", cursor: "pointer", padding: "5px 10px", fontSize: "0.78rem", borderRadius: 6,
              fontWeight: active ? 700 : 500, color: active ? ACCENT : ui.textMuted,
              background: active ? `${ACCENT}14` : "transparent", transition: "background 0.15s, color 0.15s",
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

// ── Breakdown list ───────────────────────────────────────────────────────────
// A ranked list: name, count and share of the total on one line, a thin bar
// underneath. Hover a row and the others dim. Long lists fold to the top few
// with a "Show all" button. `variant="split"` (a few parts of one whole, e.g.
// PIC/S vs Non-PIC/S) draws one segmented bar plus a legend instead.
// `singleColor` keeps a card monochrome; `colorForItem(item, i)` colors each
// row on its own (e.g. a workflow step's brand color); with neither, the
// colors cycle BAR_COLORS. `afterLabel(item)` adds a line to the row's tooltip.
export function BreakdownBarChart({ items, ui, emptyLabel, singleColor, colorForItem, afterLabel, variant, limit = 6 }) {
  const [hov, setHov] = useState(null);
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <EmptyChart label={emptyLabel} ui={ui} />;

  const total = items.reduce((a, d) => a + d.count, 0);
  const max = Math.max(...items.map((d) => d.count), 1);
  const colorFor = (item, i) => singleColor || (colorForItem && colorForItem(item, i)) || BAR_COLORS[i % BAR_COLORS.length];
  const share = (n) => (total > 0 ? (n / total) * 100 : 0);
  const shareText = (n) => { const p = share(n); return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`; };
  const tip = (d) => `${d.name}: ${d.count.toLocaleString()} (${share(d.count).toFixed(1)}%)${afterLabel ? `
${afterLabel(d)}` : ""}`;
  const dim = (i) => (hov != null && hov !== i ? 0.4 : 1);

  if (variant === "split") {
    return (
      <div>
        <div style={{ display: "flex", gap: 3, height: 12, marginBottom: 14 }}>
          {items.map((d, i) => d.count > 0 && (
            <div
              key={d.name} title={tip(d)} className="gmp-grow"
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{ flex: d.count, background: colorFor(d, i), borderRadius: 6, opacity: dim(i), transition: "opacity 0.15s", cursor: "default" }}
            />
          ))}
        </div>
        {items.map((d, i) => (
          <div
            key={d.name} title={tip(d)} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, background: hov === i ? ui.hoverBg : "transparent", opacity: dim(i), transition: "opacity 0.15s, background 0.15s" }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 3, background: colorFor(d, i), flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: "0.8rem", color: ui.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: ui.textPrimary, fontVariantNumeric: "tabular-nums" }}>{d.count.toLocaleString()}</span>
            <span style={{ width: 38, textAlign: "right", fontSize: "0.72rem", color: ui.textMuted, fontVariantNumeric: "tabular-nums" }}>{shareText(d.count)}</span>
          </div>
        ))}
      </div>
    );
  }

  const shown = expanded ? items : items.slice(0, limit);
  return (
    <div>
      {shown.map((d, i) => (
        <div
          key={d.name} title={tip(d)} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
          style={{ padding: "7px 8px", borderRadius: 8, background: hov === i ? ui.hoverBg : "transparent", opacity: dim(i), transition: "opacity 0.15s, background 0.15s", cursor: "default" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: "0.8rem", color: ui.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: ui.textPrimary, fontVariantNumeric: "tabular-nums" }}>{d.count.toLocaleString()}</span>
            <span style={{ width: 34, textAlign: "right", fontSize: "0.7rem", color: ui.textMuted, fontVariantNumeric: "tabular-nums" }}>{shareText(d.count)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: ui.progressBg, overflow: "hidden" }}>
            <div
              className="gmp-grow"
              style={{ width: `${(d.count / max) * 100}%`, height: "100%", borderRadius: 99, background: colorFor(d, i), animationDelay: `${Math.min(i, 10) * 40}ms` }}
            />
          </div>
        </div>
      ))}
      {items.length > limit && (
        <button
          type="button" onClick={() => setExpanded((v) => !v)}
          style={{ marginTop: 6, padding: "5px 8px", border: "none", background: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, color: ACCENT }}
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
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
          label: "Avg working days",
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
          tooltip: { mode: "index", intersect: false, callbacks: {
            label: (ctx) => `Average: ${fmtTime(data[ctx.dataIndex].avg_minutes)}`,
            afterLabel: (ctx) => { const d = data[ctx.dataIndex]; return `Based on ${d.total} finished step${d.total === 1 ? "" : "s"}`; },
          } },
        },
        scales: {
          x: { ticks: { color: tickCol, font: { size: 11 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true, title: { display: true, text: "Working days (weekends not counted)", color: tickCol } },
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
