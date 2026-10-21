// FILE: src/components/dashboard/InsightsSection.jsx
// Shared Monitoring-style layout used by both Main and FGMP dashboards:
//   [ 4 stat cards in a row ]
//   [ Trend chart card ........ | Breakdown donut card ]
//   [ Data table card ]
import { Card } from "./CardPrimitives";
import AreaChart from "./AreaChart";
import DataTable from "./DataTable";
import { FB, AVAILABLE_YEARS, MONTHS_BY_YEAR } from "./constants";

const CARD_COLORS = ["#1877F2", "#36a420", "#f59e0b", "#8b5cf6"];
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : (n ?? "—"));

// ── Stat card (colored border, like Monitoring) ──────────────────────────────
function StatCard({
  icon,
  label,
  value,
  hint,
  color,
  active,
  loading,
  onClick,
  ui,
  clickable,
}) {
  return (
    <div
      onClick={onClick}
      title={hint}
      style={{
        flex: 1,
        background: active ? `${color}14` : ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: "8px 12px",
        cursor: clickable ? "pointer" : "default",
        transition: "background 0.12s",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: ui.textMuted,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: "0.8rem" }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: "1.3rem",
          fontWeight: 800,
          color,
          marginTop: 2,
          lineHeight: 1.1,
          animation: loading ? "cdrrPulse 1.2s infinite" : "none",
        }}
      >
        {loading ? "…" : fmt(value)}
      </div>
    </div>
  );
}

// ── Donut breakdown card ─────────────────────────────────────────────────────
function BreakdownCard({ totals, ui }) {
  const { received = 0, completed = 0, onProcess = 0 } = totals;
  const base = Math.max(received, completed + onProcess, 1);
  const rows = [
    { label: "Completed", value: completed, color: "#36a420" },
    { label: "On Process", value: onProcess, color: "#f59e0b" },
  ];
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const rate = received > 0 ? ((completed / received) * 100).toFixed(1) : "0.0";

  return (
    <Card ui={ui}>
      <div style={{ padding: "14px 16px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Status Breakdown
        </h3>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.72rem",
            color: ui.textMuted,
          }}
        >
          Completed vs On Process share of received
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "18px 0 14px",
          }}
        >
          <svg width="150" height="150" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={ui.progressBg}
              strokeWidth="16"
            />
            {rows.map((r) => {
              const len = (r.value / base) * C;
              const el = (
                <circle
                  key={r.label}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={r.color}
                  strokeWidth="16"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              );
              offset += len;
              return el;
            })}
            <text
              x="70"
              y="68"
              textAnchor="middle"
              fontSize="20"
              fontWeight="800"
              fill={ui.textPrimary}
            >
              {fmt(received)}
            </text>
            <text
              x="70"
              y="82"
              textAnchor="middle"
              fontSize="7"
              fill={ui.textMuted}
            >
              RECEIVED
            </text>
            <text
              x="70"
              y="94"
              textAnchor="middle"
              fontSize="8"
              fontWeight="700"
              fill="#36a420"
            >
              {rate}%
            </text>
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => {
            const pct = ((r.value / base) * 100).toFixed(1);
            return (
              <div key={r.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.78rem",
                  }}
                >
                  <span style={{ color: r.color, fontWeight: 700 }}>
                    {r.label}
                  </span>
                  <span style={{ color: ui.textPrimary, fontWeight: 700 }}>
                    {fmt(r.value)}{" "}
                    <span style={{ color: ui.textMuted, fontWeight: 400 }}>
                      ({pct}%)
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 99,
                    background: ui.progressBg,
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      borderRadius: 99,
                      background: r.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ── Error toasts ─────────────────────────────────────────────────────────────
function Toast({ text, onRetry }) {
  return (
    <div
      style={{
        background: "#e02020",
        color: "#fff",
        padding: "10px 16px",
        borderRadius: 8,
        fontSize: "0.8rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 320,
      }}
    >
      <span>⚠️ {text}</span>
      <button
        onClick={onRetry}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "#fff",
          padding: "3px 10px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: "0.76rem",
          fontWeight: 700,
          fontFamily: "inherit",
        }}
      >
        Retry
      </button>
    </div>
  );
}

export function ErrorToasts({
  statsError,
  chartError,
  onRetryStats,
  onRetryChart,
}) {
  if (!statsError && !chartError) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {statsError && (
        <Toast text={`Stats: ${statsError}`} onRetry={onRetryStats} />
      )}
      {chartError && (
        <Toast text={`Chart: ${chartError}`} onRetry={onRetryChart} />
      )}
    </div>
  );
}

// ── Main shared section ──────────────────────────────────────────────────────
export default function InsightsSection({
  ui,
  isMobile,
  title,
  subtitle,
  subtitleExtra,
  metrics,
  activeMetric,
  onMetricClick,
  statsLoading,
  breakdown,
  setBreakdown,
  selYear,
  setSelYear,
  selMonth,
  setSelMonth,
  chartData,
  chartTotals,
  donutTotals,
  chartSubtitle,
  chartLoading,
}) {
  const selectStyle = {
    padding: "4px 24px 4px 10px",
    borderRadius: 7,
    border: `1px solid ${ui.cardBorder}`,
    background: ui.inputBg,
    color: ui.textPrimary,
    fontSize: "0.76rem",
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2365676b' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Row 1 — compact stat cards (left) | Insights chart (middle) | breakdown donut (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "170px minmax(0,1fr) 300px",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: isMobile ? "grid" : "flex",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : undefined,
            flexDirection: "column",
            gap: 10,
          }}
        >
          {metrics.map((m, i) => (
            <StatCard
              key={m.label}
              icon={m.icon}
              label={m.label}
              value={m.value}
              hint={m.isLive ? "Click for details" : "Target"}
              color={CARD_COLORS[i % CARD_COLORS.length]}
              active={activeMetric === i}
              loading={m.isLive ? statsLoading : false}
              clickable={!!m.metricKey}
              onClick={() => onMetricClick(i, m)}
              ui={ui}
            />
          ))}
        </div>

        <Card ui={ui}>
          <div style={{ padding: "14px 16px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: ui.textPrimary,
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: ui.textSub,
                    margin: "2px 0 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {subtitle}
                  {subtitleExtra}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 2,
                    padding: 3,
                    borderRadius: 8,
                    background: ui.inputBg,
                    border: `1px solid ${ui.cardBorder}`,
                  }}
                >
                  {[
                    { key: "day", label: "Daily" },
                    { key: "month", label: "Monthly" },
                    { key: "year", label: "Yearly" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setBreakdown(opt.key)}
                      style={{
                        padding: "4px 11px",
                        borderRadius: 6,
                        border: "none",
                        background: breakdown === opt.key ? FB : "transparent",
                        color: breakdown === opt.key ? "#fff" : ui.textSub,
                        fontSize: "0.76rem",
                        fontWeight: breakdown === opt.key ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {(breakdown === "day" || breakdown === "month") && (
                  <select
                    value={selYear}
                    onChange={(e) => {
                      setSelYear(e.target.value);
                      if (breakdown === "day") {
                        const months = MONTHS_BY_YEAR[e.target.value] || [];
                        if (!months.includes(selMonth))
                          setSelMonth(months[months.length - 1] || "Jan");
                      }
                    }}
                    style={selectStyle}
                  >
                    {AVAILABLE_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                )}
                {breakdown === "day" && (
                  <select
                    value={selMonth}
                    onChange={(e) => setSelMonth(e.target.value)}
                    style={selectStyle}
                  >
                    {(MONTHS_BY_YEAR[selYear] || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: "0 16px 12px", position: "relative" }}>
            {chartLoading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `${ui.cardBg}cc`,
                  zIndex: 2,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: "0.82rem", color: ui.textMuted }}>
                  ⏳ Loading chart…
                </span>
              </div>
            )}
            <AreaChart data={chartData} subtitle={chartSubtitle} ui={ui} />
          </div>
        </Card>

        <BreakdownCard totals={donutTotals ?? chartTotals} ui={ui} />
      </div>

      {/* Row 3 — data table */}
      <Card ui={ui}>
        <DataTable
          chartData={chartData}
          chartTotals={chartTotals}
          breakdown={breakdown}
          chartSubtitle={chartSubtitle}
          chartLoading={chartLoading}
          ui={ui}
        />
      </Card>
    </div>
  );
}
