// src/components/monitoring/frpTat/FRPTatView.jsx

import { useState, useEffect, useRef } from "react";
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

// ── Small reusable pieces ─────────────────────────────────────────────────────

function SkeletonBox({ height = 74, borderRadius = 10, ui }) {
  return (
    <div
      style={{
        height,
        borderRadius,
        background: ui.inputBg,
        opacity: 0.6,
      }}
    />
  );
}

function MetricCard({ label, value, sub, subColor, ui }) {
  return (
    <div
      style={{
        background: ui.inputBg,
        borderRadius: 10,
        padding: "14px 16px",
        flex: 1,
        minWidth: 130,
      }}
    >
      <p
        style={{ margin: "0 0 6px", fontSize: "0.72rem", color: ui.textMuted }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "1.2rem",
          fontWeight: 700,
          color: ui.textPrimary,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            margin: "3px 0 0",
            fontSize: "0.7rem",
            color: subColor || ui.textMuted,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function StatusPill({ avgTat, target }) {
  if (avgTat == null || target == null) {
    return <span style={{ color: "#888", fontSize: "0.72rem" }}>—</span>;
  }
  const diff = +(avgTat - target).toFixed(1);
  const isOver = diff > 0;
  const isNear = !isOver && diff > -2;
  const styles = isOver
    ? { bg: "#fef2f2", color: "#b91c1c", label: "Over target" }
    : isNear
      ? { bg: "#fef9c3", color: "#a16207", label: "Near target" }
      : { bg: "#dcfce7", color: "#15803d", label: "On target" };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          padding: "3px 10px",
          borderRadius: 99,
          background: styles.bg,
          color: styles.color,
          whiteSpace: "nowrap",
        }}
      >
        {styles.label}
      </span>
      <span
        style={{ fontSize: "0.68rem", color: styles.color, fontWeight: 600 }}
      >
        {diff > 0 ? `+${diff}` : diff} days
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FRPTatView({ ui, darkMode }) {
  const FB = "#1877F2";
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  // ── State ─────────────────────────────────────────────────────────────────
  const [year, setYear] = useState("All");
  const [month, setMonth] = useState("All");
  const [data, setData] = useState([]);
  const [years, setYears] = useState(["All"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart refs
  const lineCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

  // ── Fetch available years ─────────────────────────────────────────────────
  useEffect(() => {
    getAnalyticsFRPTATTrend({})
      .then((res) => {
        const raw = (res.data || [])
          .map((d) => d.quarter?.split(" ")[1])
          .filter(Boolean);
        const unique = ["All", ...Array.from(new Set(raw)).sort()];
        setYears(unique);
      })
      .catch(() => {});
  }, []);

  // ── Fetch TAT data ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = {};
    if (year !== "All") params.year = year;
    if (month !== "All") params.month = month;

    getAnalyticsFRPTATTrend(params)
      .then((res) => setData(res.data || []))
      .catch(() => setError("Failed to load TAT data. Please try again."))
      .finally(() => setLoading(false));
  }, [year, month]);

  // ── Build / rebuild charts when data changes ──────────────────────────────
  useEffect(() => {
    if (loading || !data.length) return;

    const labels = data.map((d) => d.quarter);
    const avgData = data.map((d) => +(d.avg_tat_days ?? 0).toFixed(2));
    const minData = data.map((d) => d.min_tat_days ?? 0);
    const maxData = data.map((d) => d.max_tat_days ?? 0);
    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";

    const baseScales = {
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
    };

    // Destroy old instances
    lineChartRef.current?.destroy();
    barChartRef.current?.destroy();

    // Line chart — avg TAT trend
    if (lineCanvasRef.current) {
      lineChartRef.current = new Chart(lineCanvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Avg TAT (days)",
              data: avgData,
              borderColor: FB,
              backgroundColor: "rgba(24,119,242,0.08)",
              borderWidth: 2.5,
              pointBackgroundColor: FB,
              pointRadius: 5,
              tension: 0.35,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: baseScales,
        },
      });
    }

    // Bar chart — min / avg / max
    if (barCanvasRef.current) {
      barChartRef.current = new Chart(barCanvasRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Min",
              data: minData,
              backgroundColor: "#9FE1CB",
              borderRadius: 3,
            },
            {
              label: "Avg",
              data: avgData,
              backgroundColor: FB,
              borderRadius: 3,
            },
            {
              label: "Max",
              data: maxData,
              backgroundColor: "#F0997B",
              borderRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: baseScales,
        },
      });
    }

    return () => {
      lineChartRef.current?.destroy();
      barChartRef.current?.destroy();
    };
  }, [data, darkMode, loading]);

  // ── Derived summary (computed from real API data only) ────────────────────
  const totalApps = data.reduce((s, d) => s + (d.total_applications ?? 0), 0);
  const avgAll = data.length
    ? +(
        data.reduce((s, d) => s + (d.avg_tat_days ?? 0), 0) / data.length
      ).toFixed(1)
    : null;
  const minAll = data.length
    ? Math.min(...data.map((d) => d.min_tat_days ?? Infinity))
    : null;
  const maxAll = data.length
    ? Math.max(...data.map((d) => d.max_tat_days ?? -Infinity))
    : null;

  // Target from citizen charter — if all rows share the same value use it,
  // otherwise fall back to null so we don't show a misleading number.

  const bestQuarter =
    minAll != null
      ? data.find((d) => d.min_tat_days === minAll)?.quarter
      : null;
  const worstQuarter =
    maxAll != null
      ? data.find((d) => d.max_tat_days === maxAll)?.quarter
      : null;

  // ── Shared styles ─────────────────────────────────────────────────────────
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  const selectStyle = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "6px 10px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
    cursor: "pointer",
  };
  const legendDot = (color) => (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: 2,
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: font }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: "0 0 2px",
            fontSize: "1rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          FRP &amp; CRP — Turnaround Time Trend
        </h2>
        <p style={{ margin: 0, fontSize: "0.78rem", color: ui.textMuted }}>
          Processing time from date received (Central) to date released
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: ui.textMuted }}>
          Filters:
        </span>

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          style={selectStyle}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y === "All" ? "All years" : y}
            </option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={selectStyle}
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {(year !== "All" || month !== "All") && (
          <button
            onClick={() => {
              setYear("All");
              setMonth("All");
            }}
            style={{
              ...selectStyle,
              color: ui.textMuted,
              background: "transparent",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            background: darkMode ? "#2e0a0a" : "#fef2f2",
            border: `1px solid ${darkMode ? "#7f1d1d" : "#fecaca"}`,
            color: darkMode ? "#f87171" : "#b91c1c",
            fontSize: "0.82rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Metric cards */}
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}
      >
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} style={{ flex: 1, minWidth: 130 }}>
              <SkeletonBox ui={ui} />
            </div>
          ))
        ) : (
          <>
            <MetricCard
              label="Total applications"
              ui={ui}
              value={totalApps}
              sub={`${data.length} quarter${data.length !== 1 ? "s" : ""}`}
            />
            <MetricCard
              label="Overall avg TAT"
              ui={ui}
              value={avgAll != null ? `${avgAll} days` : "—"}
              sub={
                avgAll != null && TARGET_DAYS
                  ? avgAll <= TARGET_DAYS
                    ? "↓ Within target"
                    : "↑ Exceeds target"
                  : undefined
              }
              subColor={
                avgAll != null && TARGET_DAYS
                  ? avgAll <= TARGET_DAYS
                    ? "#15803d"
                    : "#b91c1c"
                  : undefined
              }
            />
            <MetricCard
              label="Best TAT (min)"
              ui={ui}
              value={
                minAll != null && minAll !== Infinity ? `${minAll} days` : "—"
              }
              sub={bestQuarter}
            />
            <MetricCard
              label="Longest TAT (max)"
              ui={ui}
              value={
                maxAll != null && maxAll !== -Infinity ? `${maxAll} days` : "—"
              }
              sub={worstQuarter}
              subColor="#b91c1c"
            />
          </>
        )}
      </div>

      {/* Charts */}
      {!error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {/* Line chart */}
          <div
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Average TAT per quarter
            </p>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Trend over time
            </p>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "0.72rem",
                  color: ui.textMuted,
                }}
              >
                {legendDot(FB)} Avg TAT (days)
              </span>
            </div>
            <div style={{ position: "relative", height: 180 }}>
              {loading ? (
                <SkeletonBox height={180} borderRadius={8} ui={ui} />
              ) : !data.length ? (
                <EmptyChart label="No data" ui={ui} />
              ) : (
                <canvas
                  ref={lineCanvasRef}
                  role="img"
                  aria-label="Line chart of average TAT per quarter"
                />
              )}
            </div>
          </div>

          {/* Bar chart */}
          <div
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              TAT range per quarter
            </p>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Min, avg, and max days
            </p>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {[
                ["#9FE1CB", "Min"],
                [FB, "Avg"],
                ["#F0997B", "Max"],
              ].map(([c, l]) => (
                <span
                  key={l}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                  }}
                >
                  {legendDot(c)} {l}
                </span>
              ))}
            </div>
            <div style={{ position: "relative", height: 180 }}>
              {loading ? (
                <SkeletonBox height={180} borderRadius={8} ui={ui} />
              ) : !data.length ? (
                <EmptyChart label="No data" ui={ui} />
              ) : (
                <canvas
                  ref={barCanvasRef}
                  role="img"
                  aria-label="Bar chart of min, avg, max TAT per quarter"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div
          style={{
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${ui.cardBorder}`,
              background: colHdr,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Quarter breakdown
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: ui.textMuted }}>
              Detailed TAT stats per quarter
              {TARGET_DAYS && ` · target: ${TARGET_DAYS} days`}
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 580,
              }}
            >
              <thead>
                <tr style={{ background: colHdr }}>
                  {[
                    "Quarter",
                    "Applications",
                    "Avg TAT",
                    "Min TAT",
                    "Max TAT",
                    "vs Target",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: "0.67rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: ui.textMuted,
                        padding: "9px 14px",
                        textAlign: ["Quarter", "Applications"].includes(h)
                          ? "left"
                          : "center",
                        borderBottom: `1px solid ${ui.cardBorder}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={{ padding: "10px 14px" }}>
                          <SkeletonBox height={14} borderRadius={4} ui={ui} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !data.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "2.5rem",
                        color: ui.textMuted,
                        fontSize: "0.84rem",
                      }}
                    >
                      No FRP &amp; CRP data found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom:
                          i < data.length - 1
                            ? `1px solid ${ui.cardBorder}`
                            : "none",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = ui.hoverBg)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        {row.quarter}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: "0.8rem",
                          color: ui.textSub,
                        }}
                      >
                        {row.total_applications}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: "0.8rem",
                          color: ui.textPrimary,
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {row.avg_tat_days != null
                          ? `${(+row.avg_tat_days).toFixed(1)} days`
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: "0.8rem",
                          color: ui.textSub,
                          textAlign: "center",
                        }}
                      >
                        {row.min_tat_days != null
                          ? `${row.min_tat_days} days`
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: "0.8rem",
                          color: ui.textSub,
                          textAlign: "center",
                        }}
                      >
                        {row.max_tat_days != null
                          ? `${row.max_tat_days} days`
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {row.avg_tat_days != null && TARGET_DAYS ? (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color:
                                row.avg_tat_days <= TARGET_DAYS
                                  ? "#15803d"
                                  : "#b91c1c",
                            }}
                          >
                            {row.avg_tat_days - TARGET_DAYS > 0
                              ? `+${(row.avg_tat_days - TARGET_DAYS).toFixed(1)}`
                              : (row.avg_tat_days - TARGET_DAYS).toFixed(
                                  1,
                                )}{" "}
                            days
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <StatusPill
                          avgTat={row.avg_tat_days}
                          target={TARGET_DAYS}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty state for charts ────────────────────────────────────────────────────
function EmptyChart({ label, ui }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: ui.textMuted,
        fontSize: "0.8rem",
      }}
    >
      {label}
    </div>
  );
}
