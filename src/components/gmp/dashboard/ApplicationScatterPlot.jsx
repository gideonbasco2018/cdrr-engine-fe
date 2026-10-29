// src/components/gmp/dashboard/ApplicationScatterPlot.jsx
// Canvas-rendered scatter of every matching GMP application at once —
// received date (x) vs. processing time in days (y), colored by outcome.
// Canvas (not SVG/DOM rows) so it stays smooth even at a few thousand points.
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getGMPRecords } from "../../../api/gmp";
import { GMP_STEP_MAP } from "../shared/constants";

const FETCH_CAP = 1000; // backend caps page_size at 1000 for GET /gmp/ (see gmp_record.py get_gmp_queue)
const PAD = { left: 44, right: 16, top: 16, bottom: 30 };
const HEIGHT = 340;
const DAY = 86_400_000;

// Released and completed are the same outcome (the backend counts both as
// "released"); open = anything not finished, including blank-status records.
const GROUPS = {
  released:    { label: "Released",    color: "#22c55e" },
  open:        { label: "In progress", color: "#3b82f6" },
  disapproved: { label: "Disapproved", color: "#ef4444" },
};
const GROUP_ORDER = ["released", "open", "disapproved"];

const RANGES = [
  { key: "3M", label: "3M", days: 92 },
  { key: "6M", label: "6M", days: 183 },
  { key: "1Y", label: "1Y", days: 366 },
  { key: "All", label: "All", days: null },
];

function groupOf(status) {
  const s = (status || "").toUpperCase();
  if (s === "RELEASED" || s === "COMPLETED") return "released";
  if (s === "DISAPPROVED") return "disapproved";
  if (s.startsWith("CANCEL")) return null;
  return "open";
}

function niceStep(top) {
  // Four equal steps that reach just past `top`.
  const raw = Math.max(top, 8) / 4;
  const mag = Math.max(1, Math.pow(10, Math.floor(Math.log10(raw))));
  for (const s of [1, 2, 3, 5, 10]) {
    if (s * mag >= raw) return s * mag;
  }
  return 10 * mag;
}

function fmtDay(ms) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtFullDay(ms) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtDays(n) {
  const d = Math.round(n);
  return d < 1 ? "under a day" : `${d.toLocaleString()} day${d === 1 ? "" : "s"}`;
}

// Axis ticks: whole months when the span is long, days/weeks when short, so
// labels always carry a year and never repeat ("Sep 1 … Sep 1").
function makeXTicks(xMin, xMax, plotW) {
  const spanDays = (xMax - xMin) / DAY;
  const ticks = [];
  if (spanDays <= 62) {
    const stepDays = spanDays <= 14 ? 2 : 7;
    const t = new Date(xMin);
    t.setHours(0, 0, 0, 0);
    for (let ms = t.getTime(); ms <= xMax; ms += stepDays * DAY) {
      if (ms >= xMin) ticks.push({ ms, label: fmtDay(ms) });
    }
  } else {
    const stepM = spanDays <= 200 ? 1 : spanDays <= 400 ? 2 : spanDays <= 800 ? 3 : spanDays <= 1600 ? 6 : 12;
    const d = new Date(xMin);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - (d.getMonth() % stepM));
    while (d.getTime() <= xMax) {
      if (d.getTime() >= xMin) {
        ticks.push({
          ms: d.getTime(),
          label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        });
      }
      d.setMonth(d.getMonth() + stepM);
    }
  }
  // Drop labels that would touch their neighbour.
  const perMs = plotW / Math.max(1, xMax - xMin);
  const out = [];
  let lastPx = -Infinity;
  for (const t of ticks) {
    const px = t.ms * perMs;
    if (px - lastPx >= 64) {
      out.push(t);
      lastPx = px;
    }
  }
  return out;
}

export default function ApplicationScatterPlot({ ui, darkMode, search, step, evaluator }) {
  const [points, setPoints] = useState([]);
  const [total, setTotal] = useState(0);
  const [noReleaseDate, setNoReleaseDate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null); // { point, clientX, clientY }
  const [range, setRange] = useState("1Y");
  const [hidden, setHidden] = useState({}); // { released: true, ... }
  const [fit, setFit] = useState(true); // zoom the y-axis to the typical range

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const geomRef = useRef({ points: [], toPx: null, toPy: null });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    getGMPRecords({
      page: 1,
      page_size: FETCH_CAP,
      search: search || undefined,
      current_step: step && step !== "All" ? step : undefined,
      evaluator: evaluator && evaluator !== "All" ? evaluator : undefined,
      sort_by: "GMP_DATE_RECEIVED",
      sort_order: "desc",
    })
      .then((res) => {
        setTotal(res.total || 0);
        const now = Date.now();
        const pts = [];
        let missingEnd = 0;
        for (const r of res.data || []) {
          if (!r.GMP_DATE_RECEIVED) continue;
          const x = new Date(r.GMP_DATE_RECEIVED).getTime();
          if (Number.isNaN(x)) continue;
          const group = groupOf(r.GMP_APP_STATUS);
          if (!group) continue;
          let y;
          let end = null;
          if (group === "open") {
            y = (now - x) / DAY;
          } else {
            const endStr = r.GMP_RELEASED_DATE || r.GMP_END_DATE;
            end = endStr ? new Date(endStr).getTime() : NaN;
            if (Number.isNaN(end)) {
              missingEnd += 1;
              continue;
            }
            y = (end - x) / DAY;
          }
          pts.push({
            id: r.GMP_ID ?? `${r.GMP_DTN}-${x}`,
            x,
            y: Math.max(0, y),
            end,
            group,
            status: r.GMP_APP_STATUS,
            dtn: r.GMP_DTN,
            establishment: r.GMP_LTO_COMPANY,
            step: r.GMP_CURRENT_STEP,
          });
        }
        setPoints(pts);
        setNoReleaseDate(missingEnd);
      })
      .catch(() => setError("Failed to load applications. Please try again."))
      .finally(() => setLoading(false));
  }, [search, step, evaluator]);

  // ── What is on screen ─────────────────────────────────────────────────────
  const { inRange, visible, xMin, xMax, outsideRange } = useMemo(() => {
    const now = Date.now();
    const days = RANGES.find((r) => r.key === range)?.days;
    const cut = days ? now - days * DAY : -Infinity;
    const inR = points.filter((p) => p.x >= cut);
    const vis = inR.filter((p) => !hidden[p.group]);
    const lo = inR.length ? Math.min(...inR.map((p) => p.x)) : now - DAY;
    const hi = Math.max(now, inR.length ? Math.max(...inR.map((p) => p.x)) : now);
    const pad = (hi - lo) * 0.02 || DAY;
    return { inRange: inR, visible: vis, xMin: lo - pad, xMax: hi + pad, outsideRange: points.length - inR.length };
  }, [points, range, hidden]);

  const stats = useMemo(() => {
    const s = {};
    for (const g of GROUP_ORDER) s[g] = { n: 0, ys: [] };
    for (const p of inRange) {
      s[p.group].n += 1;
      s[p.group].ys.push(p.y);
    }
    const median = (arr) => {
      if (!arr.length) return null;
      const a = [...arr].sort((m, n) => m - n);
      const mid = Math.floor(a.length / 2);
      return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
    };
    s.released.median = median(s.released.ys);
    s.open.oldest = s.open.ys.length ? Math.max(...s.open.ys) : null;
    return s;
  }, [inRange]);

  // Typical range for the y-axis: outliers above it are pinned to the top edge.
  const yInfo = useMemo(() => {
    if (!visible.length) return { yMax: 40, step: 10, clipped: 0 };
    const ys = visible.map((p) => p.y).sort((a, b) => a - b);
    const maxY = ys[ys.length - 1];
    const p95 = ys[Math.floor(0.95 * (ys.length - 1))];
    const top = fit && maxY > p95 * 1.6 ? p95 * 1.15 : maxY;
    const st = niceStep(top);
    const yMax = st * 4;
    return { yMax, step: st, clipped: visible.filter((p) => p.y > yMax).length };
  }, [visible, fit]);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(
    (progress = 1) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const width = container.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = HEIGHT * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, HEIGHT);

      const plotW = width - PAD.left - PAD.right;
      const plotH = HEIGHT - PAD.top - PAD.bottom;
      const { yMax, step: yStep } = yInfo;
      const toPx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * plotW;
      const toPy = (y) => PAD.top + plotH - (Math.min(y, yMax) / yMax) * plotH;

      const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
      const tickCol = darkMode ? "#b0b3b8" : "#65676b";
      const font = "10px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif";

      // Horizontal gridlines + y labels
      ctx.font = font;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const val = i * yStep;
        const py = toPy(val);
        ctx.strokeStyle = gridCol;
        ctx.beginPath();
        ctx.moveTo(PAD.left, py);
        ctx.lineTo(width - PAD.right, py);
        ctx.stroke();
        ctx.fillStyle = tickCol;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${val}d`, PAD.left - 8, py);
      }

      // X ticks with light vertical guides
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const t of makeXTicks(xMin, xMax, plotW)) {
        const px = toPx(t.ms);
        if (px < PAD.left - 1 || px > width - PAD.right + 1) continue;
        ctx.strokeStyle = gridCol;
        ctx.beginPath();
        ctx.moveTo(px, PAD.top);
        ctx.lineTo(px, HEIGHT - PAD.bottom);
        ctx.stroke();
        ctx.fillStyle = tickCol;
        ctx.fillText(t.label, px, HEIGHT - PAD.bottom + 8);
      }

      // Median line for released applications
      const med = stats.released.median;
      if (med != null && !hidden.released && stats.released.n >= 3) {
        const py = toPy(med);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = GROUPS.released.color;
        ctx.globalAlpha = 0.85 * progress;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(PAD.left, py);
        ctx.lineTo(width - PAD.right, py);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = progress;
        ctx.fillStyle = GROUPS.released.color;
        ctx.font = "600 10px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(`median ${Math.round(med)}d`, width - PAD.right - 2, py - 3);
        ctx.globalAlpha = 1;
        ctx.font = font;
      }

      // Points — released/disapproved solid, in progress as rings
      const ease = 1 - Math.pow(1 - progress, 3);
      const drawPoint = (p, big) => {
        const px = toPx(p.x);
        const clipped = p.y > yMax;
        const py = clipped ? PAD.top + 5 : toPy(p.y);
        const color = GROUPS[p.group].color;
        const r = (big ? 5.5 : 3.2) * ease;
        ctx.globalAlpha = (big ? 1 : 0.8) * ease;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.beginPath();
        if (clipped) {
          ctx.moveTo(px, py - 4.5);
          ctx.lineTo(px + 4.5, py + 3.5);
          ctx.lineTo(px - 4.5, py + 3.5);
          ctx.closePath();
          ctx.fill();
        } else if (p.group === "open") {
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.lineWidth = 1.7;
          ctx.stroke();
          ctx.globalAlpha *= 0.18;
          ctx.fill();
        } else {
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
      for (const p of visible) {
        if (hover && hover.point.id === p.id) continue;
        drawPoint(p, false);
      }

      // Hovered point: guide lines + larger marker
      if (hover && visible.some((p) => p.id === hover.point.id)) {
        const p = hover.point;
        const px = toPx(p.x);
        const py = p.y > yMax ? PAD.top + 5 : toPy(p.y);
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = GROUPS[p.group].color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, HEIGHT - PAD.bottom);
        ctx.moveTo(PAD.left, py);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.restore();
        drawPoint(p, true);
        ctx.strokeStyle = darkMode ? "#fff" : "#111";
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      geomRef.current = { points: visible, toPx, toPy, yMax };
    },
    [visible, yInfo, xMin, xMax, darkMode, stats, hidden, hover]
  );

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    draw(1);
  }, [draw]);

  // Points grow in whenever the data or the time range changes.
  useEffect(() => {
    if (loading || !points.length) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf;
    let t0;
    const tick = (t) => {
      if (t0 == null) t0 = t;
      const p = Math.min(1, (t - t0) / 550);
      drawRef.current(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [points, range, loading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => drawRef.current(1));
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Hover / hit-test ─────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const { points: pts, toPx, toPy, yMax } = geomRef.current;
    if (!pts || !pts.length || !toPx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let nearest = null;
    let nearestD = 100; // 10px radius, squared
    for (const p of pts) {
      const dx = toPx(p.x) - mx;
      const dy = (p.y > yMax ? PAD.top + 5 : toPy(p.y)) - my;
      const d = dx * dx + dy * dy;
      if (d < nearestD) {
        nearestD = d;
        nearest = p;
      }
    }
    setHover((prev) => {
      if (!nearest) return prev ? null : prev;
      if (prev && prev.point.id === nearest.id) return { ...prev, clientX: e.clientX, clientY: e.clientY };
      return { point: nearest, clientX: e.clientX, clientY: e.clientY };
    });
  };

  const toggleGroup = (g) => setHidden((h) => ({ ...h, [g]: !h[g] }));

  // ── Bits of UI ────────────────────────────────────────────────────────────
  const chipNote = (g) => {
    if (g === "released" && stats.released.median != null) return `median ${Math.round(stats.released.median)}d`;
    if (g === "open" && stats.open.oldest != null) return `oldest ${Math.round(stats.open.oldest)}d`;
    return null;
  };

  const tip = hover?.point;
  const tipW = 236;
  const tipLeft = hover ? (hover.clientX + 16 + tipW > window.innerWidth ? hover.clientX - 16 - tipW : hover.clientX + 16) : 0;
  const tipTop = hover ? (hover.clientY + 150 > window.innerHeight ? hover.clientY - 140 : hover.clientY + 16) : 0;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {error && <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: 10 }}>{error}</div>}

      {!loading && points.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GROUP_ORDER.filter((g) => stats[g].n > 0).map((g) => {
              const off = !!hidden[g];
              const note = chipNote(g);
              return (
                <button
                  key={g}
                  onClick={() => toggleGroup(g)}
                  title={off ? "Click to show" : "Click to hide"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${off ? ui.cardBorder : GROUPS[g].color + "66"}`,
                    background: off ? "transparent" : GROUPS[g].color + "14",
                    color: off ? ui.textMuted : ui.textPrimary,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: off ? 0.6 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      boxSizing: "border-box",
                      background: g === "open" ? "transparent" : GROUPS[g].color,
                      border: g === "open" ? `2px solid ${GROUPS[g].color}` : "none",
                    }}
                  />
                  {GROUPS[g].label} {stats[g].n.toLocaleString()}
                  {note && <span style={{ color: ui.textMuted, fontWeight: 500 }}>· {note}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: "inline-flex", border: `1px solid ${ui.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 11px",
                  fontSize: "0.72rem",
                  fontWeight: range === r.key ? 700 : 500,
                  color: range === r.key ? "#fff" : ui.textMuted,
                  background: range === r.key ? "#1877F2" : "transparent",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ height: HEIGHT, borderRadius: 10, background: ui.inputBg, opacity: 0.6 }} />
      ) : !points.length ? (
        <div style={{ height: HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", color: ui.textMuted, fontSize: "0.8rem" }}>
          No applications with a valid received date to plot
        </div>
      ) : !inRange.length ? (
        <div style={{ height: HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", color: ui.textMuted, fontSize: "0.8rem" }}>
          No applications received in this period — try a longer range
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          style={{ display: "block", cursor: hover ? "pointer" : "crosshair" }}
        />
      )}

      {!loading && points.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: "0.7rem", color: ui.textMuted, lineHeight: 1.5 }}>
            {total > FETCH_CAP
              ? `Plotting the most recent ${FETCH_CAP.toLocaleString()} of ${total.toLocaleString()} applications · `
              : `${inRange.length.toLocaleString()} application${inRange.length === 1 ? "" : "s"} shown · `}
            across = date received, up = days to release (open ones: days waiting so far)
            {outsideRange > 0 && ` · ${outsideRange.toLocaleString()} older not in this range`}
            {noReleaseDate > 0 && ` · ${noReleaseDate.toLocaleString()} released without a release date not plotted`}
          </span>
          {(yInfo.clipped > 0 || !fit) && (
            <button
              onClick={() => setFit((f) => !f)}
              style={{
                border: `1px solid ${ui.cardBorder}`,
                background: "transparent",
                color: ui.textMuted,
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: "0.7rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {fit ? `▲ ${yInfo.clipped} above chart · show to scale` : "Zoom to typical range"}
            </button>
          )}
        </div>
      )}

      {tip && (
        <div
          style={{
            position: "fixed",
            left: tipLeft,
            top: tipTop,
            width: tipW,
            background: ui.cardBg || (darkMode ? "#1a1a1a" : "#ffffff"),
            border: `1px solid ${ui.cardBorder}`,
            borderLeft: `3px solid ${GROUPS[tip.group].color}`,
            borderRadius: 10,
            padding: "10px 12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
            pointerEvents: "none",
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: ui.textPrimary }}>{tip.dtn || "—"}</span>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: GROUPS[tip.group].color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {GROUPS[tip.group].label}
            </span>
          </div>
          <div style={{ fontSize: "0.7rem", color: ui.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tip.establishment || "—"}
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: ui.textPrimary, marginTop: 8 }}>
            {tip.group === "open"
              ? `Waiting ${fmtDays(tip.y)} so far`
              : `${tip.group === "released" ? "Released" : "Disapproved"} in ${fmtDays(tip.y)}`}
          </div>
          <div style={{ fontSize: "0.68rem", color: ui.textMuted, marginTop: 3, lineHeight: 1.5 }}>
            Received {fmtFullDay(tip.x)}
            {tip.end != null && <><br />{tip.group === "released" ? "Released" : "Decided"} {fmtFullDay(tip.end)}</>}
            {tip.group === "open" && tip.step && <><br />Now at {GMP_STEP_MAP[tip.step]?.label || tip.step}</>}
          </div>
        </div>
      )}
    </div>
  );
}
