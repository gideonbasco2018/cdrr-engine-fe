// src/components/gmp/dashboard/ApplicationScatterPlot.jsx
// Canvas-rendered scatter of every matching GMP application at once —
// received date (x) vs. processing time in days (y), colored by status.
// Canvas (not SVG/DOM rows) so it stays smooth even at a few thousand points.
import { useState, useEffect, useRef, useCallback } from "react";
import { getGMPRecords } from "../../../api/gmp";
import { GMP_STATUS_COLORS } from "../shared/constants";

const TERMINAL_STATUSES = new Set(["COMPLETED", "DISAPPROVED"]);
const FETCH_CAP = 1000; // backend caps page_size at 1000 for GET /gmp/ (see gmp_record.py get_gmp_queue)
const PAD = { left: 48, right: 16, top: 14, bottom: 30 };
const DEFAULT_COLOR = "#9ca3af";

function niceCeil(n) {
  if (n <= 10) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    const v = s * mag;
    if (v >= n) return v;
  }
  return Math.ceil(n / mag) * mag;
}

function formatShortDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ApplicationScatterPlot({ ui, darkMode, search, status }) {
  const [points, setPoints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null); // { point, clientX, clientY }

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const geomRef = useRef({ points: [], xMin: 0, xMax: 1, yMax: 10, width: 0, height: 320 });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    getGMPRecords({
      page: 1,
      page_size: FETCH_CAP,
      search: search || undefined,
      app_status: status !== "All" ? status : undefined,
      sort_by: "GMP_DATE_RECEIVED",
      sort_order: "desc",
    })
      .then((res) => {
        setTotal(res.total || 0);
        const now = Date.now();
        const pts = [];
        for (const r of res.data || []) {
          if (!r.GMP_DATE_RECEIVED) continue;
          const x = new Date(r.GMP_DATE_RECEIVED).getTime();
          if (Number.isNaN(x)) continue;
          const isTerminal = TERMINAL_STATUSES.has(r.GMP_APP_STATUS);
          let y;
          if (isTerminal) {
            const endStr = r.GMP_RELEASED_DATE || r.GMP_END_DATE;
            if (!endStr) continue;
            const end = new Date(endStr).getTime();
            if (Number.isNaN(end)) continue;
            y = (end - x) / 86_400_000;
          } else {
            y = (now - x) / 86_400_000;
          }
          if (y < 0) y = 0;
          pts.push({
            x,
            y,
            status: r.GMP_APP_STATUS,
            dtn: r.GMP_DTN,
            establishment: r.GMP_LTO_COMPANY,
            step: r.GMP_CURRENT_STEP,
            terminal: isTerminal,
          });
        }
        setPoints(pts);
      })
      .catch(() => setError("Failed to load applications. Please try again."))
      .finally(() => setLoading(false));
  }, [search, status]);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!points.length) {
      geomRef.current = { points: [], xMin: 0, xMax: 1, yMax: 10, width, height };
      return;
    }

    const xs = points.map((p) => p.x);
    const xMin = Math.min(...xs);
    const xMaxRaw = Math.max(...xs);
    const xMax = xMin === xMaxRaw ? xMin + 86_400_000 : xMaxRaw;
    const yMax = niceCeil(Math.max(...points.map((p) => p.y), 1));

    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;
    const toPx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * plotW;
    const toPy = (y) => PAD.top + plotH - (Math.min(y, yMax) / yMax) * plotH;

    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";

    // Horizontal gridlines + y ticks
    ctx.font = "10px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif";
    ctx.fillStyle = tickCol;
    ctx.strokeStyle = gridCol;
    ctx.lineWidth = 1;
    for (let f = 0; f <= 1; f += 0.25) {
      const val = Math.round(yMax * f);
      const py = toPy(val);
      ctx.beginPath();
      ctx.moveTo(PAD.left, py);
      ctx.lineTo(width - PAD.right, py);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`${val}d`, PAD.left - 6, py);
    }

    // X ticks
    const tickCount = width < 480 ? 3 : 5;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= tickCount; i++) {
      const x = xMin + ((xMax - xMin) * i) / tickCount;
      ctx.fillText(formatShortDate(x), toPx(x), height - PAD.bottom + 6);
    }

    // Points
    for (const p of points) {
      const color = GMP_STATUS_COLORS[p.status]?.color || DEFAULT_COLOR;
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toPx(p.x), toPy(p.y), 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    geomRef.current = { points, xMin, xMax, yMax, width, height, toPx, toPy };
  }, [points, darkMode]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // ── Hover / hit-test ─────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const { points: pts, toPx, toPy } = geomRef.current;
    if (!pts || !pts.length || !toPx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let nearest = null;
    let nearestD = 36; // px^2 radius threshold (6px)
    for (const p of pts) {
      const dx = toPx(p.x) - mx;
      const dy = toPy(p.y) - my;
      const d = dx * dx + dy * dy;
      if (d < nearestD) {
        nearestD = d;
        nearest = p;
      }
    }
    setHover(nearest ? { point: nearest, clientX: e.clientX, clientY: e.clientY } : null);
  };

  const legendStatuses = [...new Set(points.map((p) => p.status))].filter(Boolean);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {error && (
        <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: 10 }}>{error}</div>
      )}

      {loading ? (
        <div
          style={{
            height: 320,
            borderRadius: 10,
            background: ui.inputBg,
            opacity: 0.6,
          }}
        />
      ) : !points.length ? (
        <div
          style={{
            height: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: ui.textMuted,
            fontSize: "0.8rem",
          }}
        >
          No applications with a valid received date to plot
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          style={{ display: "block", cursor: "crosshair" }}
        />
      )}

      {!loading && points.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {legendStatuses.map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: GMP_STATUS_COLORS[s]?.color || DEFAULT_COLOR,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>{s}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
            {total > FETCH_CAP
              ? `Plotting most recent ${FETCH_CAP.toLocaleString()} of ${total.toLocaleString()} applications`
              : `${points.length.toLocaleString()} application${points.length === 1 ? "" : "s"} plotted · x = date received, y = days to complete / days pending`}
          </span>
        </div>
      )}

      {hover && (
        <div
          style={{
            position: "fixed",
            left: hover.clientX + 14,
            top: hover.clientY + 14,
            background: ui.cardBg || (darkMode ? "#1a1a1a" : "#ffffff"),
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            padding: "8px 10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            zIndex: 20,
            minWidth: 170,
          }}
        >
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: ui.textPrimary }}>{hover.point.dtn || "—"}</div>
          <div style={{ fontSize: "0.7rem", color: ui.textMuted, marginTop: 2, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hover.point.establishment || "—"}
          </div>
          <div style={{ fontSize: "0.7rem", color: GMP_STATUS_COLORS[hover.point.status]?.color || DEFAULT_COLOR, fontWeight: 700, marginTop: 4 }}>
            {hover.point.status || "—"}
          </div>
          <div style={{ fontSize: "0.68rem", color: ui.textMuted, marginTop: 2 }}>
            {hover.point.terminal ? "Completed in" : "Pending"} {Math.round(hover.point.y)}d · received {formatShortDate(hover.point.x)}
          </div>
        </div>
      )}
    </div>
  );
}
