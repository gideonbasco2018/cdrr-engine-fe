// src/components/monitoring/evaluatorAppTypes/UnitDailyActivity.jsx
import { useEffect, useMemo, useState } from "react";
import { getEvaluatorDailyActivity } from "../../../api/evaluatorAppTypes";

const USE_MOCK = false;

const C_IN = "#1877F2";
const C_DONE = "#36a420";
const C_WARN = "#f59e0b";

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
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad2 = (n) => String(n).padStart(2, "0");
const toKey = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromKey = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (n) => Number(n || 0).toLocaleString();
const rateOf = (r, c) => (r > 0 ? Math.round((c / r) * 100) : 0);
const prettyStep = (s) =>
  s === "S&E" ? s : s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

// ── Sample data (kapareho ng shape na dapat ibalik ng backend) ────────────────
// row = { unit_id, unit_name, user_id, name, date: "YYYY-MM-DD", received, completed }
const MOCK_UNITS = [
  {
    unit_id: 1,
    unit_name: "OTC/HR/TM/HM/MG/MO/ Donation",
    members: [
      ["Gideon Basco", 0.2],
      ["Joseph Aldrin Ferre", 0.6],
      ["Klea Mykah Pagunaling", 0.4],
      ["Jamie Paola Sevilla", 1.2],
      ["Louise Charmaine Su", 0.9],
      ["Sienna Antoinette Tortor", 1.4],
      ["Mark Anthony Cruz", 0.7],
    ],
  },
  {
    unit_id: 2,
    unit_name: "FRP and CRP",
    members: [
      ["Sample Member 1", 1.0],
      ["Sample Member 2", 0.8],
      ["Sample Member 3", 0.5],
    ],
  },
];

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mockFetch({ date_from, date_to }) {
  const from = date_from ? fromKey(date_from) : new Date(2024, 0, 1);
  const to = date_to ? fromKey(date_to) : new Date();
  const rows = [];
  MOCK_UNITS.forEach((u) =>
    u.members.forEach(([name, f], mi) => {
      const rand = rng(u.unit_id * 1000 + mi * 37 + 5);
      for (let d = new Date(2024, 0, 1); d <= to; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        const received =
          dow === 0 || dow === 6 ? 0 : Math.round(rand() * 8 * f);
        const completed =
          dow === 0 || dow === 6 ? 0 : Math.round(rand() * 8 * f);
        if (d < from) continue;
        rows.push({
          unit_id: u.unit_id,
          unit_name: u.unit_name,
          user_id: `${u.unit_id}-${mi}`,
          name,
          date: toKey(d),
          received,
          completed,
        });
      }
    }),
  );
  return Promise.resolve(rows);
}

// ── Buckets ───────────────────────────────────────────────────────────────────
function makeBuckets(mode, period, years, activeDates) {
  if (mode === "day") {
    const [y, m] = period.split("-").map(Number);
    const n = new Date(y, m, 0).getDate();
    return Array.from({ length: n }, (_, i) => {
      const key = `${period}-${pad2(i + 1)}`;
      const dow = new Date(y, m - 1, i + 1).getDay();
      return {
        key,
        label: String(i + 1),
        sub: DOW[dow],
        full: `${DOW[dow]}, ${MONTHS[m - 1]} ${i + 1}, ${y}`,
        weekend: dow === 0 || dow === 6,
      };
    }).filter((b) => !(b.weekend && !activeDates.has(b.key)));
  }
  if (mode === "month") {
    return MONTHS.map((mn, i) => ({
      key: `${period}-${pad2(i + 1)}`,
      label: mn,
      sub: "",
      full: `${mn} ${period}`,
    }));
  }
  return years.map((y) => ({
    key: String(y),
    label: String(y),
    sub: "",
    full: String(y),
  }));
}

function fillBuckets(rows, mode, base) {
  const out = base.map((b) => ({ ...b, received: 0, completed: 0 }));
  const idx = new Map(out.map((b, i) => [b.key, i]));
  const len = mode === "day" ? 10 : mode === "month" ? 7 : 4;
  rows.forEach((r) => {
    const i = idx.get(String(r.date).slice(0, len));
    if (i === undefined) return;
    out[i].received += Number(r.received) || 0;
    out[i].completed += Number(r.completed) || 0;
  });
  return out;
}

const totalsOf = (bs) =>
  bs.reduce(
    (t, b) => ({
      received: t.received + b.received,
      completed: t.completed + b.completed,
    }),
    { received: 0, completed: 0 },
  );

const sumUnits = (units, base) =>
  base.map((b, i) => ({
    ...b,
    received: units.reduce((s, u) => s + u.buckets[i].received, 0),
    completed: units.reduce((s, u) => s + u.buckets[i].completed, 0),
  }));

// ── Charts ────────────────────────────────────────────────────────────────────
function Spark({ buckets }) {
  const W = 200;
  const H = 30;
  const n = buckets.length;
  if (n < 2) return <div style={{ height: 30 }} />;
  const max = Math.max(...buckets.flatMap((b) => [b.received, b.completed]), 1);
  const pts = (k) =>
    buckets
      .map((b, i) => `${(i / (n - 1)) * W},${H - 2 - (b[k] / max) * (H - 4)}`)
      .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 30, display: "block" }}
    >
      <polyline
        points={pts("received")}
        fill="none"
        stroke={C_IN}
        strokeWidth={1.6}
      />
      <polyline
        points={pts("completed")}
        fill="none"
        stroke={C_DONE}
        strokeWidth={1.6}
      />
    </svg>
  );
}

function TrendChart({ buckets, ui, darkMode }) {
  const [hover, setHover] = useState(null);
  const W = 880,
    H = 250,
    L = 38,
    R = 12,
    T = 12,
    B = 24;
  const iw = W - L - R;
  const ih = H - T - B;
  const n = buckets.length;
  const grid = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  if (n === 0 || buckets.every((b) => !b.received && !b.completed)) {
    return (
      <div
        style={{
          textAlign: "center",
          color: ui.textMuted,
          fontSize: "0.82rem",
          padding: "70px 0",
        }}
      >
        No records in this period
      </div>
    );
  }
  const yMax = niceMax(
    Math.max(...buckets.flatMap((b) => [b.received, b.completed]), 1),
  );
  const x = (i) => (n === 1 ? L + iw / 2 : L + (i * iw) / (n - 1));
  const y = (v) => T + ih - (v / yMax) * ih;
  const path = (k) =>
    buckets.map((b, i) => `${i ? "L" : "M"}${x(i)},${y(b[k])}`).join(" ");
  const slot = n > 1 ? iw / (n - 1) : iw;
  const every = n > 16 ? 2 : 1;
  const hb = hover !== null ? buckets[hover] : null;

  return (
    <div>
      <div
        style={{
          minHeight: 22,
          marginBottom: 4,
          fontSize: "0.76rem",
          color: ui.textMuted,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {hb ? (
          <>
            <b style={{ color: ui.textPrimary }}>{hb.full}</b>
            <span>
              Decked <b style={{ color: C_IN }}>{fmt(hb.received)}</b>
            </span>
            <span>
              Completed <b style={{ color: C_DONE }}>{fmt(hb.completed)}</b>
            </span>
            <span>
              Net{" "}
              <b
                style={{ color: hb.received > hb.completed ? C_WARN : C_DONE }}
              >
                {hb.received > hb.completed ? "+" : ""}
                {fmt(hb.received - hb.completed)}
              </b>
            </span>
          </>
        ) : (
          <span>Hover the chart to see the counts per date</span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          <linearGradient id="uda-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C_IN} stopOpacity="0.18" />
            <stop offset="100%" stopColor={C_IN} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="uda-done" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C_DONE} stopOpacity="0.18" />
            <stop offset="100%" stopColor={C_DONE} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (yMax * i) / 4;
          return (
            <g key={i}>
              <line
                x1={L}
                x2={W - R}
                y1={y(v)}
                y2={y(v)}
                stroke={grid}
                strokeDasharray={i === 0 ? "0" : "4 4"}
              />
              <text
                x={L - 6}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={10}
                fill={ui.textMuted}
              >
                {Math.round(v).toLocaleString()}
              </text>
            </g>
          );
        })}
        {buckets.map((b, i) =>
          i % every === 0 ? (
            <text
              key={b.key}
              x={x(i)}
              y={H - 7}
              textAnchor="middle"
              fontSize={10}
              fontWeight={hover === i ? 800 : 500}
              fill={hover === i ? ui.textPrimary : ui.textMuted}
            >
              {b.label}
            </text>
          ) : null,
        )}
        {n > 1 && (
          <>
            <path
              d={`${path("received")} L${x(n - 1)},${T + ih} L${x(0)},${T + ih} Z`}
              fill="url(#uda-in)"
            />
            <path
              d={`${path("completed")} L${x(n - 1)},${T + ih} L${x(0)},${T + ih} Z`}
              fill="url(#uda-done)"
            />
          </>
        )}
        <path
          d={path("received")}
          fill="none"
          stroke={C_IN}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <path
          d={path("completed")}
          fill="none"
          stroke={C_DONE}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={T}
              y2={T + ih}
              stroke={ui.textMuted}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <circle cx={x(hover)} cy={y(hb.received)} r={4.5} fill={C_IN} />
            <circle cx={x(hover)} cy={y(hb.completed)} r={4.5} fill={C_DONE} />
          </>
        )}
        {buckets.map((b, i) => (
          <rect
            key={`h-${b.key}`}
            x={x(i) - slot / 2}
            y={T}
            width={slot}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UnitDailyActivity({
  ui,
  darkMode,
  step,
  steps = [],
  allValue,
  onStepChange,
}) {
  const now = new Date();
  const [mode, setMode] = useState("day"); // day | month | year
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`,
  );
  const [year, setYear] = useState(String(now.getFullYear()));
  const [unitName, setUnitName] = useState("All");
  const [focus, setFocus] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Date range na kukunin sa backend ayon sa napiling period
  const range = useMemo(() => {
    if (mode === "day") {
      const [y, m] = month.split("-").map(Number);
      return {
        group_by: "day",
        date_from: `${month}-01`,
        date_to: `${month}-${pad2(new Date(y, m, 0).getDate())}`,
      };
    }
    if (mode === "month")
      return {
        group_by: "month",
        date_from: `${year}-01-01`,
        date_to: `${year}-12-31`,
      };
    return { group_by: "year" };
  }, [mode, month, year]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = { ...range, step: step === allValue ? undefined : step };
    (USE_MOCK ? mockFetch(params) : getEvaluatorDailyActivity(params))
      .then(
        (res) =>
          !cancelled && setRows(Array.isArray(res) ? res : (res?.data ?? [])),
      )
      .catch(
        () => !cancelled && setError("Failed to load data. Please try again."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range, step, allValue]);

  const { unitList, years, activeDates } = useMemo(() => {
    const u = new Map();
    const ys = new Set();
    const act = new Set();
    rows.forEach((r) => {
      ys.add(Number(String(r.date).slice(0, 4)));
      if ((Number(r.received) || 0) + (Number(r.completed) || 0) > 0)
        act.add(r.date);
      if (!u.has(r.unit_name)) u.set(r.unit_name, new Map());
      const m = u.get(r.unit_name);
      if (!m.has(r.user_id)) m.set(r.user_id, { name: r.name, rows: [] });
      m.get(r.user_id).rows.push(r);
    });
    return {
      unitList: [...u.entries()].map(([name, members]) => ({
        name,
        members: [...members.values()],
      })),
      years: [...ys].sort((a, b) => a - b),
      activeDates: act,
    };
  }, [rows]);

  const period = mode === "day" ? month : year;
  const base = useMemo(
    () => makeBuckets(mode, period, years, activeDates),
    [mode, period, years, activeDates],
  );

  const teams = useMemo(
    () =>
      unitList.map((t) => {
        const members = t.members.map((m) => {
          const buckets = fillBuckets(m.rows, mode, base);
          return { name: m.name, buckets, totals: totalsOf(buckets) };
        });
        const buckets = sumUnits(members, base);
        return { name: t.name, members, buckets, totals: totalsOf(buckets) };
      }),
    [unitList, mode, base],
  );

  const allBuckets = useMemo(() => sumUnits(teams, base), [teams, base]);
  const selected =
    unitName === "All"
      ? null
      : (teams.find((t) => t.name === unitName) ?? null);
  const units = selected
    ? selected.members.map((m) => ({ ...m, sub: "" }))
    : teams.map((t) => ({
        name: t.name,
        sub: `${t.members.length} members`,
        buckets: t.buckets,
        totals: t.totals,
      }));
  const focusUnit = units.find((u) => u.name === focus) ?? null;
  const tableBuckets = selected ? selected.buckets : allBuckets;
  const scopeBuckets = focusUnit ? focusUnit.buckets : tableBuckets;
  const scopeTotals = totalsOf(scopeBuckets);
  const tableTotals = totalsOf(tableBuckets);
  const scopeTitle = focusUnit
    ? `${focusUnit.name}${selected ? ` · ${selected.name}` : ""}`
    : selected
      ? selected.name
      : "All units";
  const unitWord = { day: "day", month: "month", year: "year" }[mode];
  const activeCount = scopeBuckets.filter(
    (b) => b.received || b.completed,
  ).length;
  const avg = (n) => (activeCount ? (n / activeCount).toFixed(1) : "0.0");
  const periodLabel =
    mode === "day"
      ? `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`
      : mode === "month"
        ? year
        : "All years";
  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - i,
  );
  if (!yearOptions.includes(Number(year))) yearOptions.push(Number(year));

  const pickUnit = (n) => {
    setUnitName(n);
    setFocus(null);
  };

  // ── styles ──
  const line = ui.cardBorder;
  const panel = {
    background: ui.cardBg,
    border: `1px solid ${line}`,
    borderRadius: 10,
  };
  const seg = (a) => ({
    padding: "5px 12px",
    fontSize: "0.72rem",
    fontWeight: a ? 700 : 500,
    borderRadius: 8,
    border: `1px solid ${a ? C_IN : line}`,
    background: a ? `${C_IN}18` : "transparent",
    color: a ? C_IN : ui.textMuted,
    cursor: "pointer",
  });
  const field = {
    background: ui.inputBg ?? ui.cardBg,
    border: `1px solid ${line}`,
    borderRadius: 7,
    padding: "5px 9px",
    fontSize: "0.76rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
  };
  const th = {
    padding: "8px 10px",
    fontSize: "0.68rem",
    fontWeight: 700,
    color: ui.textMuted,
    textAlign: "center",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${ui.divider ?? line}`,
    background: ui.cardBg,
    position: "sticky",
    top: 0,
    zIndex: 2,
  };
  const td = {
    padding: "7px 10px",
    fontSize: "0.76rem",
    textAlign: "center",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
  };
  const stickyL = {
    position: "sticky",
    left: 0,
    background: ui.cardBg,
    zIndex: 1,
    textAlign: "left",
  };

  const Pair = ({ r, c, bold }) =>
    r || c ? (
      <span style={{ fontWeight: bold ? 800 : 600 }}>
        <span style={{ color: C_IN }}>{fmt(r)}</span>
        <span style={{ color: ui.textMuted }}> / </span>
        <span style={{ color: C_DONE }}>{fmt(c)}</span>
      </span>
    ) : (
      <span style={{ color: ui.textMuted, opacity: 0.5 }}>—</span>
    );

  return (
    <div>
      {USE_MOCK && (
        <div
          style={{
            ...panel,
            padding: "8px 12px",
            marginBottom: 12,
            fontSize: "0.74rem",
            color: C_WARN,
            borderColor: `${C_WARN}55`,
          }}
        >
          Showing <b>sample data</b>. Set <code>USE_MOCK = false</code> in
          UnitDailyActivity.jsx once the daily endpoint is ready.
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <label style={{ fontSize: "0.74rem", color: ui.textMuted }}>
          Step{" "}
          <select
            value={step}
            onChange={(e) => onStepChange(e.target.value)}
            style={{ ...field, fontWeight: 600 }}
          >
            <option value={allValue}>All steps</option>
            {steps.map((s) => (
              <option key={s} value={s}>
                {prettyStep(s)}
              </option>
            ))}
          </select>
        </label>
        {[
          { k: "day", l: "Per Day" },
          { k: "month", l: "Per Month" },
          { k: "year", l: "Per Year" },
        ].map((o) => (
          <button
            key={o.k}
            onClick={() => setMode(o.k)}
            style={seg(mode === o.k)}
          >
            {o.l}
          </button>
        ))}
        {mode === "day" && (
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            style={field}
          />
        )}
        {mode === "month" && (
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={field}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        {loading && (
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            Loading…
          </span>
        )}
      </div>

      {error && (
        <p style={{ color: "#e02020", fontSize: "0.84rem" }}>{error}</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px minmax(0, 1fr)",
          gap: 14,
          alignItems: "start",
          opacity: loading ? 0.55 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {/* Left: units */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              name: "All",
              title: "All units",
              sub: `${teams.length} units`,
              buckets: allBuckets,
            },
            ...teams.map((t) => ({
              name: t.name,
              title: t.name,
              sub: `${t.members.length} members`,
              buckets: t.buckets,
            })),
          ].map((t) => {
            const active = unitName === t.name;
            const tt = totalsOf(t.buckets);
            return (
              <button
                key={t.name}
                onClick={() => pickUnit(t.name)}
                style={{
                  ...panel,
                  textAlign: "left",
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderLeft: `3px solid ${active ? C_IN : "transparent"}`,
                  outline: active ? `1px solid ${C_IN}` : "none",
                  outlineOffset: -1,
                }}
              >
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    color: ui.textPrimary,
                    lineHeight: 1.3,
                  }}
                >
                  {t.title}
                </div>
                <div style={{ fontSize: "0.64rem", color: ui.textMuted }}>
                  {t.sub}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    margin: "6px 0 4px",
                    fontSize: "0.7rem",
                    color: ui.textMuted,
                  }}
                >
                  <span>
                    Decked{" "}
                    <b style={{ color: C_IN, fontSize: "0.86rem" }}>
                      {fmt(tt.received)}
                    </b>
                  </span>
                  <span>
                    Completed{" "}
                    <b style={{ color: C_DONE, fontSize: "0.86rem" }}>
                      {fmt(tt.completed)}
                    </b>
                  </span>
                </div>
                <Spark buckets={t.buckets} />
              </button>
            );
          })}
        </div>

        {/* Right: detail */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 0,
          }}
        >
          <div style={{ ...panel, padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: ui.textPrimary,
                  }}
                >
                  {scopeTitle}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                  }}
                >
                  {periodLabel} ·{" "}
                  {focusUnit ? (
                    <span
                      onClick={() => setFocus(null)}
                      style={{
                        color: C_IN,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      back to {selected ? "whole unit" : "all"}
                    </span>
                  ) : selected ? (
                    "whole unit · click a member below to see only that member"
                  ) : (
                    "click a unit on the left to see its members"
                  )}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { l: "Decked", v: fmt(scopeTotals.received), c: C_IN },
                  { l: "Completed", v: fmt(scopeTotals.completed), c: C_DONE },
                  {
                    l: "Net",
                    v: `${scopeTotals.received > scopeTotals.completed ? "+" : ""}${fmt(scopeTotals.received - scopeTotals.completed)}`,
                    c: C_WARN,
                  },
                  {
                    l: "Rate",
                    v: `${rateOf(scopeTotals.received, scopeTotals.completed)}%`,
                    c: C_DONE,
                  },
                  {
                    l: `Avg decked / ${unitWord}`,
                    v: avg(scopeTotals.received),
                    c: C_IN,
                  },
                  {
                    l: `Avg completed / ${unitWord}`,
                    v: avg(scopeTotals.completed),
                    c: C_DONE,
                  },
                ].map((k) => (
                  <div
                    key={k.l}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      background: `${k.c}12`,
                      border: `1px solid ${k.c}25`,
                      minWidth: 74,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: k.c,
                        lineHeight: 1.1,
                      }}
                    >
                      {k.v}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.58rem",
                        color: k.c,
                      }}
                    >
                      {k.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                fontSize: "0.68rem",
                color: ui.textMuted,
                marginBottom: 6,
              }}
            >
              <span>
                <b style={{ color: C_IN }}>■</b> Decked (received)
              </span>
              <span>
                <b style={{ color: C_DONE }}>■</b> Completed
              </span>
            </div>
            <TrendChart buckets={scopeBuckets} ui={ui} darkMode={darkMode} />
          </div>

          {/* Members / units summary */}
          <div style={{ ...panel, padding: "12px 14px" }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: ui.textPrimary,
              }}
            >
              {selected ? "Members" : "Units"}{" "}
              <span
                style={{
                  fontWeight: 500,
                  color: ui.textMuted,
                  fontSize: "0.72rem",
                }}
              >
                · click a row to filter the chart
              </span>
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "left" }}>
                      {selected ? "Member" : "Unit"}
                    </th>
                    <th style={th}>Decked</th>
                    <th style={th}>Completed</th>
                    <th style={th}>Net</th>
                    <th style={th}>Rate</th>
                    <th style={th}>Avg completed / {unitWord}</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const act = u.buckets.filter(
                      (b) => b.received || b.completed,
                    ).length;
                    const isFocus = focus === u.name;
                    const net = u.totals.received - u.totals.completed;
                    return (
                      <tr
                        key={u.name}
                        onClick={() =>
                          selected
                            ? setFocus(isFocus ? null : u.name)
                            : pickUnit(u.name)
                        }
                        style={{
                          cursor: "pointer",
                          background: isFocus ? `${C_IN}14` : "transparent",
                        }}
                      >
                        <td style={{ ...td, textAlign: "left" }}>
                          <div
                            style={{ fontWeight: 700, color: ui.textPrimary }}
                          >
                            {u.name}
                          </div>
                          {u.sub && (
                            <div
                              style={{
                                fontSize: "0.64rem",
                                color: ui.textMuted,
                              }}
                            >
                              {u.sub}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, color: C_IN, fontWeight: 700 }}>
                          {fmt(u.totals.received)}
                        </td>
                        <td style={{ ...td, color: C_DONE, fontWeight: 700 }}>
                          {fmt(u.totals.completed)}
                        </td>
                        <td
                          style={{
                            ...td,
                            color: net > 0 ? C_WARN : C_DONE,
                            fontWeight: 700,
                          }}
                        >
                          {net > 0 ? "+" : ""}
                          {fmt(net)}
                        </td>
                        <td
                          style={{
                            ...td,
                            color: ui.textPrimary,
                            fontWeight: 700,
                          }}
                        >
                          {rateOf(u.totals.received, u.totals.completed)}%
                        </td>
                        <td style={{ ...td, color: ui.textPrimary }}>
                          {act ? (u.totals.completed / act).toFixed(1) : "0.0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per day / month / year grid */}
          <div style={{ ...panel, padding: "12px 14px" }}>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: ui.textPrimary,
              }}
            >
              Counts per {unitWord}
            </p>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.7rem",
                color: ui.textMuted,
              }}
            >
              Each cell: <b style={{ color: C_IN }}>decked</b> /{" "}
              <b style={{ color: C_DONE }}>completed</b>
              {mode === "day" ? " · weekends with no records are hidden" : ""}
            </p>
            <div style={{ overflow: "auto", maxHeight: 420 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...th, ...stickyL, zIndex: 3 }}>
                      {mode === "day"
                        ? "Date"
                        : mode === "month"
                          ? "Month"
                          : "Year"}
                    </th>
                    <th style={{ ...th, color: ui.textPrimary }}>
                      {selected ? "Whole unit" : "All units"}
                    </th>
                    {units.map((u) => (
                      <th
                        key={u.name}
                        style={{
                          ...th,
                          color: focus === u.name ? C_IN : ui.textMuted,
                        }}
                      >
                        {u.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableBuckets.map((b, i) => (
                    <tr key={b.key}>
                      <td
                        style={{
                          ...td,
                          ...stickyL,
                          color: ui.textPrimary,
                          fontWeight: 600,
                        }}
                      >
                        {b.label}{" "}
                        {b.sub && (
                          <span
                            style={{
                              color: ui.textMuted,
                              fontWeight: 400,
                              fontSize: "0.66rem",
                            }}
                          >
                            {b.sub}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          ...td,
                          background: darkMode
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(0,0,0,0.025)",
                        }}
                      >
                        <Pair r={b.received} c={b.completed} bold />
                      </td>
                      {units.map((u) => (
                        <td
                          key={u.name}
                          style={{
                            ...td,
                            background:
                              focus === u.name ? `${C_IN}10` : "transparent",
                          }}
                        >
                          <Pair
                            r={u.buckets[i].received}
                            c={u.buckets[i].completed}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td
                      style={{
                        ...td,
                        ...stickyL,
                        fontWeight: 800,
                        color: ui.textPrimary,
                        borderTop: `2px solid ${ui.textMuted}`,
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{ ...td, borderTop: `2px solid ${ui.textMuted}` }}
                    >
                      <Pair
                        r={tableTotals.received}
                        c={tableTotals.completed}
                        bold
                      />
                    </td>
                    {units.map((u) => (
                      <td
                        key={u.name}
                        style={{
                          ...td,
                          borderTop: `2px solid ${ui.textMuted}`,
                        }}
                      >
                        <Pair
                          r={u.totals.received}
                          c={u.totals.completed}
                          bold
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
