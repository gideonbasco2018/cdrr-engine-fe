import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getHiringImpactSeries, IS_MOCK } from "../../../api/hiringImpact";

// All user-facing wording lives here so it is easy to change in one place.
const LABELS = {
  title: "Capacity Impact",
  subtitle: "Received, released and backlog, before and after added capacity",
  markInput: "Capacity added in",
  markChart: "Capacity added",
  sinceMark: "Since capacity was added",
  backlogBefore: "in progress before change",
  pickMonth:
    "Select the month the capacity was added (it must have data before and after it) to see the comparison.",
};

const FB = "#1877F2";
const GREEN = "#36a420";
const RED = "#e02020";
const ORANGE = "#f97316";
const PURPLE = "#8b5cf6";
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
// Kept as is so previously saved selections still work.
const STORAGE_KEY = "hiringImpact.hireMonth";

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}
function avg(list) {
  return list.length ? list.reduce((s, n) => s + n, 0) / list.length : 0;
}
function sum(list) {
  return list.reduce((s, n) => s + n, 0);
}
function pctChange(from, to) {
  return from ? Math.round(((to - from) / from) * 100) : null;
}
function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return step * p;
}
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Measures the real width of an element so the chart is drawn 1:1
// (no stretched text) and redraws when the container resizes.
function useWidth(fallback = 560) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(Math.max(el.clientWidth, 280));
    const ro = new ResizeObserver(([entry]) => {
      setW(Math.max(entry.contentRect.width, 280));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ── SVG chart (grouped bars or line) with a draggable marker and tooltip ─────
// series: [{ key, color, label }]
function Chart({ points, series, type, markIdx, onMarkChange, ui }) {
  const [wrapRef, W] = useWidth();
  const svgRef = useRef(null);
  const [hover, setHover] = useState(-1);
  const [dragging, setDragging] = useState(false);
  const gid = useId().replace(/:/g, "");

  const H = 230,
    L = 46,
    R = 12,
    T = 26,
    B = 28;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = points.length;
  const max = niceMax(
    Math.max(...points.flatMap((p) => series.map((s) => p[s.key])), 0),
  );
  const step = innerW / Math.max(n, 1);
  const cx = (i) => L + step * i + step / 2;
  const y = (v) => T + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const labelEvery = Math.max(
    1,
    Math.ceil(n / Math.max(Math.floor(innerW / 52), 1)),
  );

  const groupW = Math.min(step * 0.78, 30);
  const barW = Math.max((groupW - (series.length - 1) * 2) / series.length, 2);

  const first = series[0];
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${cx(i)},${y(p[first.key])}`)
    .join(" ");
  const areaPath = n
    ? `${linePath} L${cx(n - 1)},${y(0)} L${cx(0)},${y(0)} Z`
    : "";

  const markX = markIdx >= 0 && markIdx < n ? cx(markIdx) - step / 2 : null;
  const pillW = LABELS.markChart.length * 5.8 + 16;
  const pillX = markX == null ? 0 : Math.min(markX + 4, W - R - pillW);

  const localX = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return e.clientX - rect.left;
  };

  // Hover tooltip
  const onMove = (e) => {
    if (dragging) return;
    const i = Math.floor((localX(e) - L) / step);
    setHover(i >= 0 && i < n ? i : -1);
  };

  // Click on the chart places the marker only when none is set yet
  const onPlace = (e) => {
    if (markIdx >= 0 || !onMarkChange) return;
    const i = Math.floor((localX(e) - L) / step);
    if (i >= 1 && i < n) onMarkChange(points[i].month);
  };

  // Dragging the marker (it snaps to the nearest month edge).
  // Index 0 is not allowed because the comparison needs data before it.
  const startDrag = (e) => {
    if (!onMarkChange) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setHover(-1);
  };
  const doDrag = (e) => {
    if (!dragging) return;
    const raw = Math.round((localX(e) - L) / step);
    const i = Math.min(Math.max(raw, 1), n - 1);
    if (i !== markIdx && points[i]) onMarkChange(points[i].month);
  };
  const endDrag = () => setDragging(false);

  const hp = hover >= 0 ? points[hover] : null;
  const tipLeft = hover >= 0 ? Math.min(Math.max(cx(hover), 80), W - 80) : 0;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{
          display: "block",
          userSelect: "none",
          cursor: dragging ? "ew-resize" : undefined,
        }}
      >
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={first.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={first.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* shaded "after" region */}
        {markX != null && (
          <rect
            x={markX}
            y={T}
            width={Math.max(W - R - markX, 0)}
            height={innerH}
            fill={ORANGE}
            opacity="0.06"
          />
        )}

        {/* grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={L}
              x2={W - R}
              y1={y(t)}
              y2={y(t)}
              stroke={ui.gridLine}
              strokeDasharray={t === 0 ? undefined : "3 4"}
            />
            <text
              x={L - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill={ui.textMuted}
            >
              {t.toLocaleString()}
            </text>
          </g>
        ))}

        {/* hover highlight */}
        {hover >= 0 && (
          <rect
            x={cx(hover) - step / 2}
            y={T}
            width={step}
            height={innerH}
            fill={ui.textMuted}
            opacity="0.12"
          />
        )}

        {/* bars */}
        {type === "bars" &&
          points.map((p, i) => (
            <g key={p.month} opacity={hover >= 0 && hover !== i ? 0.55 : 1}>
              {series.map((s, k) => (
                <rect
                  key={s.key}
                  x={cx(i) - groupW / 2 + k * (barW + 2)}
                  y={y(p[s.key])}
                  width={barW}
                  height={Math.max(y(0) - y(p[s.key]), 0)}
                  rx="2"
                  fill={s.color}
                />
              ))}
            </g>
          ))}

        {/* line + area */}
        {type === "line" && n > 0 && (
          <>
            <path d={areaPath} fill={`url(#area-${gid})`} />
            <path
              d={linePath}
              fill="none"
              stroke={first.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle
              cx={cx(n - 1)}
              cy={y(points[n - 1][first.key])}
              r="3.5"
              fill={first.color}
            />
            {hover >= 0 && (
              <circle
                cx={cx(hover)}
                cy={y(points[hover][first.key])}
                r="5"
                fill={ui.cardBg}
                stroke={first.color}
                strokeWidth="2.5"
              />
            )}
          </>
        )}

        {/* x labels */}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={p.month}
              x={cx(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill={ui.textMuted}
            >
              {monthLabel(p.month)}
            </text>
          ) : null,
        )}

        {/* hover / click capture layer (below the marker so the marker wins) */}
        <rect
          x={L}
          y={T}
          width={innerW}
          height={innerH}
          fill="transparent"
          style={{ cursor: markIdx < 0 ? "pointer" : undefined }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(-1)}
          onClick={onPlace}
        />

        {/* draggable marker */}
        {markX != null && (
          <g
            onPointerDown={startDrag}
            onPointerMove={doDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              cursor: onMarkChange ? "ew-resize" : "default",
              touchAction: "none",
            }}
          >
            {/* wide invisible hit area so the line is easy to grab */}
            <rect
              x={markX - 8}
              y={T - 4}
              width={16}
              height={innerH + 4}
              fill="transparent"
            />
            <line
              x1={markX}
              x2={markX}
              y1={T - 4}
              y2={T + innerH}
              stroke={ORANGE}
              strokeWidth={dragging ? 2 : 1.4}
              strokeDasharray="4 3"
            />
            <rect
              x={pillX}
              y={3}
              width={pillW}
              height={17}
              rx="8.5"
              fill={ORANGE}
            />
            <text
              x={pillX + pillW / 2}
              y={15}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#fff"
              style={{ pointerEvents: "none" }}
            >
              {LABELS.markChart}
            </text>
            {/* grip handle */}
            <circle
              cx={markX}
              cy={T + innerH / 2}
              r="6"
              fill={ORANGE}
              stroke={ui.cardBg}
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {hp && !dragging && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: tipLeft,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            padding: "6px 10px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            fontSize: "0.72rem",
            color: ui.textPrimary,
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 3 }}>
            {monthLabel(hp.month)}
          </div>
          {series.map((s) => (
            <div
              key={s.key}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <i
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: s.color,
                  display: "inline-block",
                }}
              />
              <span style={{ color: ui.textSub }}>{s.label}</span>
              <b style={{ marginLeft: "auto", paddingLeft: 10 }}>
                {hp[s.key].toLocaleString()}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// tone: "good" (green), "bad" (red), "neutral" (blue)
function StatCard({
  ui,
  title,
  fromValue,
  fromLabel,
  toValue,
  toLabel,
  badge,
  tone,
}) {
  const color =
    badge == null
      ? ui.textMuted
      : tone === "good"
        ? GREEN
        : tone === "bad"
          ? RED
          : FB;
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 12,
        padding: "12px 14px",
        flex: 1,
        minWidth: 240,
      }}
    >
      <div style={{ fontSize: "0.78rem", color: ui.textSub, marginBottom: 8 }}>
        {title}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            {fromValue}
          </div>
          <div style={{ fontSize: "0.68rem", color: ui.textMuted }}>
            {fromLabel}
          </div>
        </div>
        <span style={{ color: ui.textMuted }}>→</span>
        <div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            {toValue}
          </div>
          <div style={{ fontSize: "0.68rem", color: ui.textMuted }}>
            {toLabel}
          </div>
        </div>
        {badge != null && (
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "2px 9px",
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
        padding: "12px 14px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: "flex",
            gap: 10,
            fontSize: "0.68rem",
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
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <i
        style={{
          width: 9,
          height: 9,
          borderRadius: 2,
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

// ── Monthly table: one row per month, rows since the marker are tinted ───────
function MonthlyTable({ ui, points, markIdx }) {
  const [newestFirst, setNewestFirst] = useState(true);
  const [showHow, setShowHow] = useState(false);
  const [tip, setTip] = useState(null); // { row, x, y } for the backlog tooltip

  const rows = useMemo(() => {
    const list = points.map((p, i) => ({
      ...p,
      idx: i,
      net: p.received - p.released,
      delta: i > 0 ? p.backlog - points[i - 1].backlog : null,
    }));
    return newestFirst ? [...list].reverse() : list;
  }, [points, newestFirst]);

  const totals = useMemo(
    () => ({
      received: sum(points.map((p) => p.received)),
      released: sum(points.map((p) => p.released)),
      backlog: points.length ? points[points.length - 1].backlog : 0,
    }),
    [points],
  );

  if (!points.length) return null;

  // Red = backlog grows, green = backlog shrinks
  const signColor = (v) => (v > 0 ? RED : v < 0 ? GREEN : ui.textMuted);
  const signed = (v) => (v > 0 ? "+" : "") + v.toLocaleString();

  const th = {
    position: "sticky",
    top: 0,
    zIndex: 1,
    background: ui.cardBg,
    borderBottom: `1px solid ${ui.cardBorder}`,
    padding: "8px 12px",
    fontSize: "0.67rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    textAlign: "right",
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "7px 12px",
    fontSize: "0.78rem",
    color: ui.textPrimary,
    textAlign: "right",
    borderBottom: `1px solid ${ui.gridLine}`,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };
  const smallBtn = (active) => ({
    background: active ? `${FB}22` : "transparent",
    border: `1px solid ${active ? FB : ui.cardBorder}`,
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: "0.7rem",
    color: active ? FB : ui.textSub,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 12,
        padding: "12px 14px",
        marginTop: 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Monthly breakdown
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowHow((v) => !v)}
            style={smallBtn(showHow)}
          >
            ⓘ How is this computed?
          </button>
          <button
            onClick={() => setNewestFirst((v) => !v)}
            style={smallBtn(false)}
          >
            {newestFirst ? "Newest first ↓" : "Oldest first ↑"}
          </button>
        </div>
      </div>

      {showHow && (
        <div
          style={{
            background: ui.inputBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 10,
            fontSize: "0.74rem",
            color: ui.textSub,
            lineHeight: 1.55,
          }}
        >
          {(() => {
            const last = points[points.length - 1];
            const prev = points.length > 1 ? points[points.length - 2] : null;
            const code = {
              color: ui.textPrimary,
              fontWeight: 700,
              fontFamily: "monospace",
            };
            return (
              <>
                <div style={{ marginBottom: 6 }}>
                  <b style={{ color: ui.textPrimary }}>Net</b> ={" "}
                  <span style={code}>Received − Released</span> (same month).
                  Positive means more came in than went out.
                  <br />
                  <i>
                    Example, {monthLabel(last.month)}:{" "}
                    {last.received.toLocaleString()} −{" "}
                    {last.released.toLocaleString()} ={" "}
                    {signed(last.received - last.released)}
                  </i>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <b style={{ color: ui.textPrimary }}>Backlog</b> =
                  applications received on or before the end of that month and{" "}
                  <span style={code}>not yet released</span> by that time. It is
                  a snapshot at month end, so it is not summed in the Total row.
                  <br />
                  <i>
                    Example, {monthLabel(last.month)}:{" "}
                    {last.backlog.toLocaleString()} applications were received
                    on or before the end of {monthLabel(last.month)} and still
                    not released at that time.
                  </i>
                  {prev && (
                    <>
                      <br />
                      <i>
                        Rough check: {monthLabel(prev.month)} backlog{" "}
                        {prev.backlog.toLocaleString()} + received{" "}
                        {last.received.toLocaleString()} − released{" "}
                        {last.released.toLocaleString()} ={" "}
                        {(
                          prev.backlog +
                          last.received -
                          last.released
                        ).toLocaleString()}
                        {prev.backlog + last.received - last.released ===
                        last.backlog
                          ? " (matches)."
                          : `, vs. actual ${last.backlog.toLocaleString()}. The small difference comes from records that are counted in Received or Released but not in the backlog (for example a missing or invalid date).`}
                      </i>
                    </>
                  )}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <b style={{ color: ui.textPrimary }}>Backlog change</b> ={" "}
                  <span style={code}>
                    Backlog this month − Backlog last month
                  </span>
                  . The first month in the range has no previous month, so it
                  shows "—".
                  {prev && (
                    <>
                      <br />
                      <i>
                        Example, {monthLabel(last.month)}:{" "}
                        {last.backlog.toLocaleString()} −{" "}
                        {prev.backlog.toLocaleString()} ={" "}
                        {signed(last.backlog - prev.backlog)}
                      </i>
                    </>
                  )}
                </div>
                <div style={{ color: ui.textMuted }}>
                  Note: Net and Backlog change can differ. Net only counts
                  documents released in that month, while Backlog is rebuilt
                  from received and released dates (the database keeps only the
                  current status, not monthly snapshots).
                </div>
              </>
            );
          })()}
        </div>
      )}

      <div style={{ maxHeight: 380, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Month</th>
              <th style={th}>Received</th>
              <th style={th}>Released</th>
              <th style={th} title="Received − Released">
                Net
              </th>
              <th
                style={th}
                title="Received on or before month end and not yet released by then"
              >
                Backlog
              </th>
              <th style={th} title="Backlog this month − Backlog last month">
                Backlog change
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const after = markIdx >= 0 && r.idx >= markIdx;
              const isMark = r.idx === markIdx;
              return (
                <tr
                  key={r.month}
                  style={{ background: after ? `${ORANGE}12` : "transparent" }}
                >
                  <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>
                    {monthLabel(r.month)}
                    {isMark && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          padding: "1px 7px",
                          borderRadius: 99,
                          background: ORANGE,
                          color: "#fff",
                        }}
                      >
                        {LABELS.markChart}
                      </span>
                    )}
                  </td>
                  <td style={td}>{r.received.toLocaleString()}</td>
                  <td style={td}>{r.released.toLocaleString()}</td>
                  <td
                    style={{ ...td, color: signColor(r.net), fontWeight: 600 }}
                  >
                    {signed(r.net)}
                  </td>
                  <td
                    style={{ ...td, cursor: "help" }}
                    onMouseEnter={(e) => {
                      const b = e.currentTarget.getBoundingClientRect();
                      setTip({ row: r, x: b.left, y: b.top + b.height / 2 });
                    }}
                    onMouseLeave={() => setTip(null)}
                  >
                    <span
                      style={{ borderBottom: `1px dotted ${ui.textMuted}` }}
                    >
                      {r.backlog.toLocaleString()}
                    </span>
                  </td>
                  <td
                    style={{
                      ...td,
                      color:
                        r.delta == null ? ui.textMuted : signColor(r.delta),
                      fontWeight: 600,
                    }}
                  >
                    {r.delta == null ? "—" : signed(r.delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td
                style={{
                  ...td,
                  textAlign: "left",
                  fontWeight: 700,
                  borderBottom: "none",
                  borderTop: `1px solid ${ui.cardBorder}`,
                }}
              >
                Total
              </td>
              {[
                totals.received.toLocaleString(),
                totals.released.toLocaleString(),
                signed(totals.received - totals.released),
                totals.backlog.toLocaleString(),
                "",
              ].map((v, i) => (
                <td
                  key={i}
                  style={{
                    ...td,
                    fontWeight: 700,
                    borderBottom: "none",
                    borderTop: `1px solid ${ui.cardBorder}`,
                  }}
                >
                  {v}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {tip &&
        (() => {
          const r = tip.row;
          const prev = r.idx > 0 ? points[r.idx - 1] : null;
          const hasParts = r.backlog_open != null;
          const expected = prev ? prev.backlog + r.received - r.released : null;
          const diff = expected == null ? null : r.backlog - expected;
          const row = {
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
          };
          return (
            <div
              style={{
                position: "fixed",
                left: tip.x - 10,
                top: tip.y,
                transform: "translate(-100%, -50%)",
                pointerEvents: "none",
                zIndex: 50,
                background: ui.cardBg,
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 8,
                padding: "8px 12px",
                boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                fontSize: "0.72rem",
                color: ui.textSub,
                lineHeight: 1.6,
                minWidth: 260,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: ui.textPrimary,
                  marginBottom: 4,
                }}
              >
                Backlog at end of {monthLabel(r.month)}
              </div>

              {hasParts && (
                <>
                  <div style={row}>
                    <span>In progress now (received by then)</span>
                    <b style={{ color: ui.textPrimary }}>
                      {r.backlog_open.toLocaleString()}
                    </b>
                  </div>
                  <div style={row}>
                    <span>Released after {monthLabel(r.month)}</span>
                    <b style={{ color: ui.textPrimary }}>
                      + {r.backlog_released_later.toLocaleString()}
                    </b>
                  </div>
                  <div
                    style={{
                      ...row,
                      borderTop: `1px solid ${ui.cardBorder}`,
                      marginTop: 3,
                      paddingTop: 3,
                    }}
                  >
                    <span>Backlog</span>
                    <b style={{ color: ui.textPrimary }}>
                      = {r.backlog.toLocaleString()}
                    </b>
                  </div>
                </>
              )}

              {prev && (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: `1px solid ${ui.cardBorder}`,
                  }}
                >
                  <div style={{ color: ui.textMuted }}>
                    Check vs {monthLabel(prev.month)}
                  </div>
                  <div style={row}>
                    <span>{monthLabel(prev.month)} backlog</span>
                    <b style={{ color: ui.textPrimary }}>
                      {prev.backlog.toLocaleString()}
                    </b>
                  </div>
                  <div style={row}>
                    <span>+ Received</span>
                    <b style={{ color: ui.textPrimary }}>
                      {r.received.toLocaleString()}
                    </b>
                  </div>
                  <div style={row}>
                    <span>− Released</span>
                    <b style={{ color: ui.textPrimary }}>
                      {r.released.toLocaleString()}
                    </b>
                  </div>
                  <div style={row}>
                    <span>= Expected</span>
                    <b style={{ color: ui.textPrimary }}>
                      {expected.toLocaleString()}
                    </b>
                  </div>
                  <div style={row}>
                    <span>Difference</span>
                    <b style={{ color: diff === 0 ? GREEN : ORANGE }}>
                      {diff === 0 ? "0 (matches)" : signed(diff)}
                    </b>
                  </div>
                  {diff !== 0 && (
                    <div style={{ color: ui.textMuted, marginTop: 2 }}>
                      Records counted in Received or Released but not in the
                      backlog (for example a missing or invalid date).
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}

function HiringImpactView({ ui, darkMode }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const [from, setFrom] = useState("2024-01");
  const [to, setTo] = useState(currentMonth());
  const [markMonth, setMarkMonth] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "",
  );
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, markMonth);
  }, [markMonth]);

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

  const markIdx = useMemo(
    () => (markMonth ? series.findIndex((p) => p.month >= markMonth) : -1),
    [series, markMonth],
  );

  const stats = useMemo(() => {
    if (markIdx < 1) return null;
    const before = series.slice(Math.max(0, markIdx - 12), markIdx);
    const after = series.slice(markIdx);
    if (!before.length || !after.length) return null;

    const receivedBefore = Math.round(avg(before.map((p) => p.received)));
    const receivedAfter = Math.round(avg(after.map((p) => p.received)));
    const releasedBefore = Math.round(avg(before.map((p) => p.released)));
    const releasedAfter = Math.round(avg(after.map((p) => p.released)));
    const backlogBefore = series[markIdx - 1].backlog;
    const backlogNow = series[series.length - 1].backlog;

    return {
      receivedBefore,
      receivedAfter,
      receivedPct: pctChange(receivedBefore, receivedAfter),
      releasedBefore,
      releasedAfter,
      releasedPct: pctChange(releasedBefore, releasedAfter),
      backlogBefore,
      backlogNow,
      backlogPct: pctChange(backlogBefore, backlogNow),
      sinceReceived: sum(after.map((p) => p.received)),
      sinceReleased: sum(after.map((p) => p.released)),
    };
  }, [series, markIdx]);

  const insight = useMemo(() => {
    if (!stats) return "";
    const net = stats.sinceReceived - stats.sinceReleased;
    const base =
      `${LABELS.sinceMark}: ${stats.sinceReceived.toLocaleString()} received, ` +
      `${stats.sinceReleased.toLocaleString()} released ` +
      `(${net >= 0 ? "+" : ""}${net.toLocaleString()} net). `;
    if (stats.backlogPct > 0 && stats.receivedPct > stats.releasedPct)
      return (
        base +
        "Incoming applications grew faster than releases, so the backlog kept growing."
      );
    if (stats.backlogPct > 0)
      return (
        base +
        "Releases grew more than incoming applications, but the backlog from before the change is not cleared yet."
      );
    return (
      base +
      "Releases outpaced incoming applications, so the backlog went down."
    );
  }, [stats]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Loaded on demand so jsPDF is not part of the initial bundle
      const { exportHiringImpactPdf } = await import("./exportHiringImpactPdf");
      exportHiringImpactPdf({
        series,
        stats,
        insight,
        markIdx,
        labels: LABELS,
      });
    } catch (e) {
      setError(e.message || "Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

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

  const RECEIVED = { key: "received", color: FB, label: "Received" };
  const RELEASED = { key: "released", color: GREEN, label: "Released" };
  const BACKLOG = { key: "backlog", color: PURPLE, label: "Backlog" };

  const exportDisabled = loading || exporting || !series.length;

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
          {LABELS.title}
        </h2>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.76rem",
            color: ui.textMuted,
          }}
        >
          {LABELS.subtitle}
        </p>
      </div>

      {IS_MOCK && (
        <div
          style={{
            marginBottom: 14,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #f59e0b55",
            background: darkMode ? "#2a2000" : "#fef9c3",
            color: darkMode ? "#fde68a" : "#a16207",
            fontSize: "0.76rem",
          }}
        >
          Sample data only. Not connected to the database yet.
        </div>
      )}

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
          <label style={labelStyle}>{LABELS.markInput}</label>
          <input
            type="month"
            value={markMonth}
            min={from}
            max={to}
            onChange={(e) => setMarkMonth(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={handleExport}
            disabled={exportDisabled}
            style={{
              background: exportDisabled ? ui.inputBg : FB,
              color: exportDisabled ? ui.textMuted : "#fff",
              border: "none",
              borderRadius: 7,
              padding: "7px 16px",
              fontSize: "0.8rem",
              fontWeight: 700,
              fontFamily: font,
              cursor: exportDisabled ? "not-allowed" : "pointer",
            }}
          >
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
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
              marginBottom: 10,
            }}
          >
            <StatCard
              ui={ui}
              title="Did more documents come in?"
              fromValue={stats ? stats.receivedBefore.toLocaleString() : "—"}
              fromLabel="received per month, before"
              toValue={stats ? stats.receivedAfter.toLocaleString() : "—"}
              toLabel="received per month, after"
              badge={stats ? stats.receivedPct : null}
              tone="neutral"
            />
            <StatCard
              ui={ui}
              title="Did we release more documents?"
              fromValue={stats ? stats.releasedBefore.toLocaleString() : "—"}
              fromLabel="released per month, before"
              toValue={stats ? stats.releasedAfter.toLocaleString() : "—"}
              toLabel="released per month, after"
              badge={stats ? stats.releasedPct : null}
              tone={stats && stats.releasedPct >= 0 ? "good" : "bad"}
            />
            <StatCard
              ui={ui}
              title="Did the backlog go down?"
              fromValue={stats ? stats.backlogBefore.toLocaleString() : "—"}
              fromLabel={LABELS.backlogBefore}
              toValue={stats ? stats.backlogNow.toLocaleString() : "—"}
              toLabel="in progress now"
              badge={stats ? stats.backlogPct : null}
              tone={stats && stats.backlogPct <= 0 ? "good" : "bad"}
            />
          </div>

          {stats ? (
            <p
              style={{
                fontSize: "0.78rem",
                color: ui.textSub,
                margin: "0 0 14px",
              }}
            >
              {insight}
            </p>
          ) : (
            <p
              style={{
                fontSize: "0.78rem",
                color: ui.textMuted,
                margin: "0 0 14px",
              }}
            >
              {LABELS.pickMonth}
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
              gap: 12,
            }}
          >
            <ChartCard
              ui={ui}
              title="Received vs released per month"
              legend={
                <>
                  <Swatch color={FB} label="Received" />
                  <Swatch color={GREEN} label="Released" />
                </>
              }
            >
              <Chart
                points={series}
                series={[RECEIVED, RELEASED]}
                type="bars"
                markIdx={markIdx}
                onMarkChange={setMarkMonth}
                ui={ui}
              />
            </ChartCard>

            <ChartCard
              ui={ui}
              title="Backlog (still in progress) at end of month"
              legend={<Swatch color={BACKLOG.color} label="Backlog" />}
            >
              <Chart
                points={series}
                series={[BACKLOG]}
                type="line"
                markIdx={markIdx}
                onMarkChange={setMarkMonth}
                ui={ui}
              />
            </ChartCard>
          </div>

          <MonthlyTable ui={ui} points={series} markIdx={markIdx} />
        </>
      )}
    </div>
  );
}

export default HiringImpactView;
