import { useEffect, useMemo, useState } from "react";
import { getHiringImpactSeries } from "../../../api/hiringImpact";

const FB = "#1877F2";
const GREEN = "#36a420";
const RED = "#e02020";
const ORANGE = "#f97316";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const STORAGE_KEY = "hiringImpact.hireMonth";

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}
function avg(list) {
  return list.length ? list.reduce((s, n) => s + n, 0) / list.length : 0;
}
function pctChange(from, to) {
  return from ? Math.round(((to - from) / from) * 100) : null;
}
function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Simple SVG chart (bars or line) with a hire marker ───────────────────────
function Chart({
  points,
  valueKey,
  type,
  hireIdx,
  ui,
  beforeColor,
  afterColor,
  lineColor,
}) {
  const W = 800,
    H = 220,
    L = 44,
    R = 12,
    T = 16,
    B = 28;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = points.length;
  const max = niceMax(Math.max(...points.map((p) => p[valueKey]), 0));
  const step = innerW / Math.max(n, 1);
  const x = (i) => L + step * i + step / 2;
  const y = (v) => T + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const labelEvery = Math.ceil(n / 10);
  const barW = Math.min(14, step * 0.6);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[valueKey])}`)
    .join(" ");
  const areaPath = n
    ? `${linePath} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={ui.gridLine} />
          <text
            x={L - 6}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill={ui.textMuted}
          >
            {t.toLocaleString()}
          </text>
        </g>
      ))}

      {type === "bar" &&
        points.map((p, i) => (
          <rect
            key={p.month}
            x={x(i) - barW / 2}
            y={y(p[valueKey])}
            width={barW}
            height={Math.max(y(0) - y(p[valueKey]), 0)}
            rx="2"
            fill={hireIdx >= 0 && i >= hireIdx ? afterColor : beforeColor}
          >
            <title>{`${monthLabel(p.month)}: ${p[valueKey].toLocaleString()}`}</title>
          </rect>
        ))}

      {type === "line" && n > 0 && (
        <>
          <path d={areaPath} fill={lineColor} opacity="0.12" />
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={p.month}
              cx={x(i)}
              cy={y(p[valueKey])}
              r="6"
              fill="transparent"
            >
              <title>{`${monthLabel(p.month)}: ${p[valueKey].toLocaleString()}`}</title>
            </circle>
          ))}
        </>
      )}

      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text
            key={p.month}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill={ui.textMuted}
          >
            {monthLabel(p.month)}
          </text>
        ) : null,
      )}

      {hireIdx >= 0 && hireIdx < n && (
        <g>
          <line
            x1={x(hireIdx) - step / 2}
            x2={x(hireIdx) - step / 2}
            y1={T}
            y2={T + innerH}
            stroke={ORANGE}
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x={x(hireIdx) - step / 2 + 6}
            y={T + 12}
            fontSize="12"
            fill={ORANGE}
          >
            Hired
          </text>
        </g>
      )}
    </svg>
  );
}

function StatCard({
  ui,
  title,
  fromValue,
  fromLabel,
  toValue,
  toLabel,
  badge,
  good,
}) {
  const color = badge == null ? ui.textMuted : good ? GREEN : RED;
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 12,
        padding: "14px 16px",
        flex: 1,
        minWidth: 260,
      }}
    >
      <div style={{ fontSize: "0.8rem", color: ui.textSub, marginBottom: 10 }}>
        {title}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            {fromValue}
          </div>
          <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
            {fromLabel}
          </div>
        </div>
        <span style={{ color: ui.textMuted, fontSize: "1.1rem" }}>→</span>
        <div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            {toValue}
          </div>
          <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
            {toLabel}
          </div>
        </div>
        {badge != null && (
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 99,
              background: `${color}22`,
              color,
            }}
          >
            {badge > 0 ? "+" : ""}
            {badge}%
          </span>
        )}
      </div>
    </div>
  );
}

function ChartCard({ ui, title, legend, children }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: "flex",
            gap: 12,
            fontSize: "0.72rem",
            color: ui.textSub,
          }}
        >
          {legend}
        </span>
      </div>
      {children}
    </div>
  );
}

function Swatch({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <i
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

function HiringImpactView({ ui, darkMode }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const [from, setFrom] = useState("2024-01");
  const [to, setTo] = useState(currentMonth());
  const [hireMonth, setHireMonth] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "",
  );
  const [rampUp, setRampUp] = useState(2);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, hireMonth);
  }, [hireMonth]);

  useEffect(() => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError("");
    getHiringImpactSeries({ from, to })
      .then((data) => setSeries(data ?? []))
      .catch((e) => {
        setSeries([]);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  const hireIdx = useMemo(
    () => (hireMonth ? series.findIndex((p) => p.month >= hireMonth) : -1),
    [series, hireMonth],
  );

  const stats = useMemo(() => {
    if (hireIdx < 1) return null;
    const before = series.slice(Math.max(0, hireIdx - 12), hireIdx);
    const after = series.slice(hireIdx + rampUp);
    if (!before.length || !after.length) return null;
    const releasedBefore = Math.round(avg(before.map((p) => p.released)));
    const releasedAfter = Math.round(avg(after.map((p) => p.released)));
    const backlogBefore = series[hireIdx - 1].backlog;
    const backlogNow = series[series.length - 1].backlog;
    return {
      releasedBefore,
      releasedAfter,
      releasedPct: pctChange(releasedBefore, releasedAfter),
      backlogBefore,
      backlogNow,
      backlogPct: pctChange(backlogBefore, backlogNow),
    };
  }, [series, hireIdx, rampUp]);

  const inputStyle = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "6px 10px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };
  const labelStyle = {
    fontSize: "0.67rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    display: "block",
    marginBottom: 4,
  };

  return (
    <div style={{ fontFamily: font }}>
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Hiring Impact
        </h2>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.76rem",
            color: ui.textMuted,
          }}
        >
          Released documents and backlog, before and after a hire
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 14,
        }}
      >
        <div>
          <label style={labelStyle}>From</label>
          <input
            type="month"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input
            type="month"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Hired in</label>
          <input
            type="month"
            value={hireMonth}
            min={from}
            max={to}
            onChange={(e) => setHireMonth(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Skip ramp-up</label>
          <select
            value={rampUp}
            onChange={(e) => setRampUp(Number(e.target.value))}
            style={inputStyle}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} month{n !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 14,
            borderRadius: 8,
            color: RED,
            border: `1px solid ${RED}55`,
            fontSize: "0.82rem",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: ui.textMuted,
            fontSize: "0.84rem",
          }}
        >
          Loading…
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <StatCard
              ui={ui}
              title="Did we release more documents?"
              fromValue={stats ? stats.releasedBefore.toLocaleString() : "—"}
              fromLabel="per month, before"
              toValue={stats ? stats.releasedAfter.toLocaleString() : "—"}
              toLabel="per month, after"
              badge={stats ? stats.releasedPct : null}
              good={stats ? stats.releasedPct >= 0 : false}
            />
            <StatCard
              ui={ui}
              title="Did the backlog go down?"
              fromValue={stats ? stats.backlogBefore.toLocaleString() : "—"}
              fromLabel="in progress before hire"
              toValue={stats ? stats.backlogNow.toLocaleString() : "—"}
              toLabel="in progress now"
              badge={stats ? stats.backlogPct : null}
              good={stats ? stats.backlogPct <= 0 : false}
            />
          </div>

          {!stats && (
            <p
              style={{
                fontSize: "0.78rem",
                color: ui.textMuted,
                margin: "0 0 14px",
              }}
            >
              Select the month of the hire (it must have data before and after
              it) to see the comparison.
            </p>
          )}

          <ChartCard
            ui={ui}
            title="Released per month"
            legend={
              <>
                <Swatch color={ui.textMuted} label="Before hire" />
                <Swatch color={GREEN} label="After hire" />
              </>
            }
          >
            <Chart
              points={series}
              valueKey="released"
              type="bar"
              hireIdx={hireIdx}
              ui={ui}
              beforeColor={ui.textMuted}
              afterColor={GREEN}
            />
          </ChartCard>

          <ChartCard
            ui={ui}
            title="Backlog (still in progress) at end of month"
            legend={<Swatch color={FB} label="Backlog" />}
          >
            <Chart
              points={series}
              valueKey="backlog"
              type="line"
              hireIdx={hireIdx}
              ui={ui}
              lineColor={FB}
            />
          </ChartCard>
        </>
      )}
    </div>
  );
}

export default HiringImpactView;
