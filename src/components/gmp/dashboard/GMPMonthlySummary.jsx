// src/components/gmp/dashboard/GMPMonthlySummary.jsx
// Month-by-month table for the Analytics tab. One row per month: what came in,
// how much of it has been released / disapproved / is still open, the release
// rate, the average turnaround, and "Output" — records actually released that
// month regardless of when they were received (the real monthly throughput).
import { useMemo, useState } from "react";
import { SkeletonBox, EmptyChart } from "./gmpAnalyticsShared";

const ACCENT = "#0f8a72";
const BLUE = "#2f6fed";
const AMBER = "#b9740f";
const RED = "#c8384f";
const VIOLET = "#7c5cff";

const COLS = "minmax(96px, 1.1fr) minmax(150px, 2fr) 84px 84px 96px 84px 100px 84px";

const COLUMNS = [
  { key: "period", label: "Month", title: "Sort by month" },
  { key: "received", label: "Received", title: "Sort by records received" },
  { key: "released", label: "Released", right: true, title: "Of the records received that month, how many have since been released" },
  { key: "released_in_month", label: "Output", right: true, title: "Records released that month, whenever they were received" },
  { key: "disapproved", label: "Disapproved", right: true, title: "Sort by disapproved" },
  { key: "on_process", label: "On process", right: true, title: "Sort by on process" },
  { key: "release_rate", label: "Release rate", right: true, title: "Sort by release rate" },
  { key: "avg_tat_days", label: "Avg TAT", right: true, title: "Sort by average turnaround" },
];

export default function GMPMonthlySummary({ data, ui, loading }) {
  const [sort, setSort] = useState({ key: "period", dir: "asc" });
  const [hov, setHov] = useState(null);

  const rows = useMemo(() => {
    const list = [...(data ?? [])];
    const { key, dir } = sort;
    // Months with no value (e.g. no TAT yet) always sink to the bottom.
    list.sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const c = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return dir === "asc" ? c : -c;
    });
    return list;
  }, [data, sort]);

  if (loading) return <SkeletonBox height={220} ui={ui} />;
  if (!rows.length) return <EmptyChart label="No monthly data for this period" ui={ui} />;

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "period" ? "asc" : "desc" }));

  const maxReceived = Math.max(...rows.map((r) => r.received), 1);
  const tot = rows.reduce(
    (a, r) => ({
      received: a.received + r.received, released: a.released + r.released,
      output: a.output + r.released_in_month, disapproved: a.disapproved + r.disapproved,
      on_process: a.on_process + r.on_process,
    }),
    { received: 0, released: 0, output: 0, disapproved: 0, on_process: 0 },
  );

  const head = { fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: ui.textMuted };
  const num = { textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.8rem" };

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 820 }}>
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "0 10px 8px", borderBottom: `1px solid ${ui.cardBorder}` }}>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <button
                  key={c.key} type="button" onClick={() => onSort(c.key)} title={c.title}
                  style={{
                    ...head, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit",
                    textAlign: c.right ? "right" : "left", color: active ? ui.textPrimary : ui.textMuted,
                  }}
                >
                  {c.label}{active ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                </button>
              );
            })}
          </div>

          <div style={{ maxHeight: 440, overflowY: "auto" }}>
            {rows.map((r, i) => (
              <div
                key={r.period}
                className="gmp-rise"
                onMouseEnter={() => setHov(r.period)}
                onMouseLeave={() => setHov(null)}
                style={{
                  display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "center",
                  padding: "10px 10px", borderBottom: `1px solid ${ui.divider}`, animationDelay: `${Math.min(i, 12) * 30}ms`,
                  background: hov === r.period ? ui.hoverBg : "transparent", borderRadius: 8, transition: "background 0.12s",
                }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: ui.textPrimary }}>{r.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: ui.progressBg, overflow: "hidden" }}>
                    <div className="gmp-grow" style={{ width: `${(r.received / maxReceived) * 100}%`, height: "100%", borderRadius: 4, background: BLUE }} />
                  </div>
                  <span style={{ ...num, minWidth: 34, fontWeight: 700, color: ui.textPrimary }}>{r.received.toLocaleString()}</span>
                </div>
                <span style={{ ...num, color: r.released ? ACCENT : ui.textMuted, fontWeight: r.released ? 700 : 400 }}>{r.released.toLocaleString()}</span>
                <span style={{ ...num, color: r.released_in_month ? ACCENT : ui.textMuted, fontWeight: r.released_in_month ? 700 : 400 }}>{r.released_in_month.toLocaleString()}</span>
                <span style={{ ...num, color: r.disapproved ? RED : ui.textMuted, fontWeight: r.disapproved ? 700 : 400 }}>{r.disapproved.toLocaleString()}</span>
                <span style={{ ...num, color: r.on_process ? AMBER : ui.textMuted }}>{r.on_process.toLocaleString()}</span>
                <span style={{ ...num, color: ui.textPrimary }}>{r.received ? `${r.release_rate}%` : "—"}</span>
                <span style={{ ...num, color: r.avg_tat_days != null ? VIOLET : ui.textMuted }}>{r.avg_tat_days != null ? `${r.avg_tat_days}d` : "—"}</span>
              </div>
            ))}
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "center", padding: "12px 10px 4px",
            fontWeight: 700, color: ui.textPrimary,
          }}>
            <span style={{ fontSize: "0.8rem" }}>Total</span>
            <span style={{ ...num, textAlign: "left" }}>{tot.received.toLocaleString()}</span>
            <span style={num}>{tot.released.toLocaleString()}</span>
            <span style={num}>{tot.output.toLocaleString()}</span>
            <span style={num}>{tot.disapproved.toLocaleString()}</span>
            <span style={num}>{tot.on_process.toLocaleString()}</span>
            <span style={num}>{tot.received ? `${((tot.released / tot.received) * 100).toFixed(1)}%` : "—"}</span>
            <span style={num}>—</span>
          </div>
        </div>
      </div>
      <p style={{ margin: "12px 0 0", fontSize: "0.7rem", color: ui.textMuted, lineHeight: 1.6 }}>
        <b style={{ color: ui.textSub }}>Released</b> counts the records received that month that have since been released.{" "}
        <b style={{ color: ui.textSub }}>Output</b> counts the records released that month, whenever they were received.
        Release rate = Released ÷ Received. Avg TAT is working days, received → released.
      </p>
    </div>
  );
}
