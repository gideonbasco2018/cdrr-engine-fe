// src/components/gmp/dashboard/GMPTrendOverview.jsx
// FGMP's Trend Overview — same smooth-line look as CPR's, with its own Year and
// Month pickers. The lines have one point per DAY (the records received that
// day, split by where they stand now); the hover works per MONTH — a shaded
// band over the month and a tooltip with its totals. With a single month
// picked there is nothing to group, so the hover goes back to day by day.
// Interactive:
//   • hover         — the month under the cursor: band + tooltip of its totals
//   • legend        — click a name to hide / show that line (the scale re-fits)
//   • click a month — zooms in: All years → that year, a year → that month
import { useEffect, useMemo, useRef, useState } from "react";
import { getGMPAnalyticsSparklines } from "../../../api/gmpAnalytics";
import { SkeletonBox, EmptyChart, selectStyle, MONTH_OPTIONS } from "./gmpAnalyticsShared";
import { GMPSectionCard } from "./GMPSectionCard";

const SERIES = [
  { key: "received", label: "Received", color: "#2f6fed" },
  { key: "released", label: "Released", color: "#0f8a72" },
  { key: "on_process", label: "In progress", color: "#f59e0b" },
  { key: "disapproved", label: "Disapproved", color: "#c8384f" },
];

const W = 680, H = 240;
const PAD = { top: 20, right: 20, bottom: 30, left: 44 };
const cW = W - PAD.left - PAD.right;
const cH = H - PAD.top - PAD.bottom;

// The top of the scale hugs the data: four equal whole-number steps, the
// smallest tidy step that still fits the highest point (24 -> 0..32 in steps
// of 8, not 0..50). It re-fits whenever the data or the visible lines change,
// so it grows by itself as the numbers grow.
const TICK_STEPS = [1, 2, 3, 4, 5, 6, 8, 10];
function niceStep(max) {
  const raw = Math.max(max, 1) * 1.05 / 4;
  const pow = Math.max(1, 10 ** Math.floor(Math.log10(raw))); // counts: never a fractional step
  for (let p = pow; ; p *= 10) {
    const hit = TICK_STEPS.map((s) => s * p).find((s) => s >= raw);
    if (hit) return hit;
  }
}

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export default function GMPTrendOverview({ ui, darkMode, years, pageYear, pageMonth }) {
  // Starts on the current year (the page's own filter wins if one is picked).
  const [year, setYear] = useState(pageYear && pageYear !== "All" ? pageYear : String(new Date().getFullYear()));
  const [month, setMonth] = useState(pageMonth || "All");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hidden, setHidden] = useState({});
  const [hov, setHov] = useState(null);
  const svgRef = useRef(null);

  // Follow the page's Year / Month filters when they CHANGE (not on first
  // render, so the card keeps its current-year default).
  // (Compares against the last seen value, not a "first run" flag — React's
  // dev double-run of effects would trip a flag and reset the year to "All".)
  const lastPageYear = useRef(pageYear);
  useEffect(() => {
    if (lastPageYear.current === pageYear) return;
    lastPageYear.current = pageYear;
    setYear(pageYear || "All");
  }, [pageYear]);
  const lastPageMonth = useRef(pageMonth);
  useEffect(() => {
    if (lastPageMonth.current === pageMonth) return;
    lastPageMonth.current = pageMonth;
    setMonth(pageMonth || "All");
  }, [pageMonth]);

  // If there are no records for the current year yet, fall back to the latest
  // year that has some, rather than showing an empty chart.
  useEffect(() => {
    if (years.length > 1 && year !== "All" && !years.includes(year)) {
      setYear(years[years.length - 1]);
      setMonth("All");
    }
  }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getGMPAnalyticsSparklines({ year, month })
      .then((res) => { if (alive) setData(res.points || []); })
      .catch(() => { if (alive) setError("Couldn't load the trend."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [year, month]);

  const oneMonth = year !== "All" && month !== "All"; // a single month: hover/label per day

  // Daily points grouped into months (the hover unit). Each group: where it
  // starts/ends on the chart, its label, and the totals of every line.
  const groups = useMemo(() => {
    if (oneMonth || !data.length) return null;
    const multiYear = new Set(data.map((d) => d.date?.slice(0, 4))).size > 1;
    const out = [];
    data.forEach((d, i) => {
      const key = d.date?.slice(0, 7);
      let g = out[out.length - 1];
      if (!g || g.key !== key) {
        const abbr = MONTH_OPTIONS[parseInt(key.slice(5, 7), 10)].label.slice(0, 3);
        g = { key, start: i, end: i, label: multiYear ? `${abbr} ${key.slice(0, 4)}` : abbr, totals: Object.fromEntries(SERIES.map((x) => [x.key, 0])) };
        out.push(g);
      }
      g.end = i;
      SERIES.forEach((x) => { g.totals[x.key] += d[x.key] ?? 0; });
    });
    return out;
  }, [data, oneMonth]);
  const canZoom = !oneMonth && (groups?.length ?? 0) > 1;
  const hovGroup = groups && hov != null ? groups.find((g) => hov >= g.start && hov <= g.end) : null;

  const shown = SERIES.filter((s) => !hidden[s.key]);
  const tickStep = useMemo(
    () => niceStep(Math.max(...data.flatMap((d) => shown.map((s) => d[s.key] ?? 0)), 1)),
    [data, hidden], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const toX = (i) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2);
  const maxVal = tickStep * 4;
  const toY = (v) => PAD.top + cH - (v / maxVal) * cH;
  const yticks = [0, 1, 2, 3, 4].map((i) => i * tickStep);

  const handleMove = (e) => {
    const el = svgRef.current;
    if (!el || !data.length) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx = data.length > 1 ? Math.round(((x - PAD.left) / cW) * (data.length - 1)) : 0;
    setHov(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const toggle = (key) => setHidden((h) => {
    // Never let the last visible line be hidden — an empty chart is useless.
    if (!h[key] && shown.length === 1) return h;
    return { ...h, [key]: !h[key] };
  });

  const onClick = () => {
    if (!hovGroup || !canZoom) return;
    if (year === "All") setYear(hovGroup.key.slice(0, 4));
    else setMonth(String(parseInt(hovGroup.key.slice(5, 7), 10)));
  };

  const select = (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <select
        value={year}
        onChange={(e) => { setYear(e.target.value); setMonth("All"); }}
        title="Filter trend by year"
        style={selectStyle(ui)}
      >
        {years.map((y) => <option key={y} value={y}>{y === "All" ? "All years" : y}</option>)}
      </select>
      <select
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        disabled={year === "All"}
        title={year === "All" ? "Pick a year first" : "Filter trend by month"}
        style={{ ...selectStyle(ui), opacity: year === "All" ? 0.4 : 1, cursor: year === "All" ? "not-allowed" : "pointer" }}
      >
        {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>
  );

  // Where the hover sits: the middle of the month's band, or the day itself.
  const stepX = data.length > 1 ? cW / (data.length - 1) : cW;
  const hovX = hovGroup ? (toX(hovGroup.start) + toX(hovGroup.end)) / 2 : hov != null ? toX(hov) : 0;
  const tip = hovGroup ? { label: hovGroup.label, values: hovGroup.totals } : hov != null && data[hov] ? { label: data[hov].label, values: data[hov] } : null;
  const tipLeft = hovX > W * 0.62;
  const gridCol = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <GMPSectionCard
      title="Trend Overview"
      icon="📈"
      subtitle="Grouped by day"
      action={select}
      ui={ui}
      darkMode={darkMode}
    >
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {SERIES.map((s) => {
            const off = !!hidden[s.key];
            return (
              <button
                key={s.key} type="button" onClick={() => toggle(s.key)}
                aria-pressed={!off} title={off ? `Show ${s.label}` : `Hide ${s.label}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px", borderRadius: 99,
                  border: `1px solid ${off ? ui.cardBorder : s.color + "55"}`, background: off ? "transparent" : `${s.color}12`,
                  cursor: "pointer", opacity: off ? 0.5 : 1, transition: "all 0.15s",
                }}
              >
                <span style={{ width: 16, height: 3, borderRadius: 99, background: s.color }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: off ? ui.textMuted : ui.textSub, textDecoration: off ? "line-through" : "none" }}>{s.label}</span>
              </button>
            );
          })}
          {canZoom && (
            <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: "0.68rem", color: ui.textMuted }}>
              Click a month to zoom into its {year === "All" ? "year" : "days"}
            </span>
          )}
        </div>

        {loading && !data.length ? <SkeletonBox height={220} borderRadius={10} ui={ui} />
          : error ? <div style={{ color: "#c8384f", fontSize: "0.8rem" }}>{error}</div>
          : !data.length ? <EmptyChart label="No trend data available" ui={ui} />
          : (
            <div style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
              <svg
                ref={svgRef} viewBox={`0 0 ${W} ${H}`} onMouseMove={handleMove} onMouseLeave={() => setHov(null)} onClick={onClick}
                style={{ width: "100%", height: "auto", display: "block", overflow: "visible", cursor: canZoom ? "pointer" : "default" }}
              >
                {yticks.map((t, i) => (
                  <g key={i}>
                    <line x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)} stroke={gridCol} strokeWidth={i === 0 ? 1.5 : 0.75} strokeDasharray={i === 0 ? "none" : "3 4"} />
                    <text x={PAD.left - 7} y={toY(t) + 4} textAnchor="end" fill={ui.textMuted} fontSize="9" fontWeight="500">{t}</text>
                  </g>
                ))}

                {shown.map((s) => {
                  const pts = data.map((d, i) => [toX(i), toY(d[s.key] ?? 0)]);
                  return pts.length > 1 ? (
                    <path key={`${s.key}-${year}-${month}`} className="gmp-draw" pathLength={1} d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
                  ) : (
                    <circle key={s.key} cx={pts[0][0]} cy={pts[0][1]} r={4} fill={s.color} />
                  );
                })}

                {groups ? groups.map((g, gi) => {
                  // One label per month, centred under it (thinned out if there are many).
                  const every = Math.ceil(groups.length / 12);
                  if (groups.length > 12 && gi % every !== 0 && hovGroup !== g) return null;
                  const on = hovGroup === g;
                  return (
                    <text key={g.key} x={(toX(g.start) + toX(g.end)) / 2} y={H - 6} textAnchor="middle" fill={on ? ui.textPrimary : ui.textMuted} fontSize={9} fontWeight={on ? 700 : 500}>
                      {g.label}
                    </text>
                  );
                }) : data.map((d, i) => {
                  // One month: label every few days with just the day number.
                  const every = Math.ceil(data.length / 12);
                  if (data.length > 16 && i % every !== 0 && i !== data.length - 1 && hov !== i) return null;
                  return (
                    <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fill={hov === i ? ui.textPrimary : ui.textMuted} fontSize={9} fontWeight={hov === i ? 700 : 500}>
                      {d.label.split(" ")[1]}
                    </text>
                  );
                })}

                {tip && (
                  <g pointerEvents="none">
                    {hovGroup ? (
                      <rect x={toX(hovGroup.start) - stepX / 2} y={PAD.top} width={toX(hovGroup.end) - toX(hovGroup.start) + stepX} height={cH} fill={ui.textMuted} opacity={0.09} rx={4} />
                    ) : (
                      <>
                        <line x1={hovX} y1={PAD.top} x2={hovX} y2={PAD.top + cH} stroke={ui.textMuted} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                        {shown.map((s) => (
                          <circle key={s.key} cx={hovX} cy={toY(tip.values[s.key] ?? 0)} r={4.5} fill={s.color} stroke={ui.cardBg} strokeWidth={2} />
                        ))}
                      </>
                    )}
                    {(() => {
                      const bw = 136, bh = 24 + shown.length * 17;
                      const bx = Math.max(PAD.left, Math.min(W - PAD.right - bw, tipLeft ? hovX - bw - 12 : hovX + 12));
                      return (
                        <g>
                          <rect x={bx} y={PAD.top + 2} width={bw} height={bh} rx={10} fill={ui.cardBg} stroke={ui.cardBorder} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))" }} />
                          <text x={bx + 12} y={PAD.top + 18} fill={ui.textPrimary} fontSize={10} fontWeight={700}>{tip.label}</text>
                          {shown.map((s, si) => (
                            <g key={s.key}>
                              <circle cx={bx + 15} cy={PAD.top + 30 + si * 17} r={3} fill={s.color} />
                              <text x={bx + 23} y={PAD.top + 33 + si * 17} fill={ui.textSub} fontSize={9}>{s.label}</text>
                              <text x={bx + bw - 12} y={PAD.top + 33 + si * 17} textAnchor="end" fill={s.color} fontSize={9.5} fontWeight={700}>{(tip.values[s.key] ?? 0).toLocaleString()}</text>
                            </g>
                          ))}
                        </g>
                      );
                    })()}
                  </g>
                )}
              </svg>
            </div>
          )}
      </div>
    </GMPSectionCard>
  );
}
