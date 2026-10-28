// src/components/gmp/dashboard/GMPKpiCard.jsx
// KPI tile for FGMP Monitoring & Analytics — soft-shadow card (no left accent
// bar) matching GMPSectionCard's chrome, so a tile and a chart card read as
// the same surface. On hover it lifts and glows in its own color. Color lives
// in the number and the optional sparkline/delta, not in the card frame.
import { useState, useEffect, useRef } from "react";
import { FadeSlideIn } from "../../monitoring/analytics/KpiCard";
import { gmpCardShadow, isDarkUI } from "./GMPSectionCard";

// Local count-up — the shared monitoring/analytics useCountUp always ends on
// Math.round(...), so any decimal value (a plain float like 1.6, or a
// formatted string like "18.4d"/"22.4%") permanently loses its decimal once
// the animation finishes, and a non-percent suffix like "d" gets dropped
// entirely (only "%" gets re-appended). FGMP's tiles show averages (Avg TAT,
// Avg NODs/Record, Avg Compliance Turnaround) where that's a real, visible
// bug, not a rounding nicety — so this preserves whatever decimal places and
// suffix the source value actually had, landing exactly on the true target
// instead of a rounded one. Kept local rather than fixing the shared hook,
// to avoid changing behavior for CPR's dashboards that also use it.
function useFormattedCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const str = String(target);
    const match = str.match(/^-?\d+(\.\d+)?/);
    if (!match) {
      // Non-numeric (e.g. "—" for no data yet) — show as-is, no animation.
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      setDisplay(target);
      return;
    }
    const end = parseFloat(match[0]);
    const decimals = match[1] ? match[1].length - 1 : 0;
    const suffix = str.slice(match[0].length);
    const start = fromRef.current;
    fromRef.current = end;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startRef.current = null;

    function step(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      // Land exactly on `end` at progress 1 instead of a rounded value.
      const shown = progress >= 1 ? end : start + (end - start) * eased;
      setDisplay(`${shown.toFixed(decimals)}${suffix}`);
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    }
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

// Tiny inline sparkline — genuine data only (the last few points of whatever
// series the caller already fetched), never a decorative or fabricated
// trend line. Omit `points` when no real series exists for a tile (e.g. a
// single-snapshot metric like Avg TAT) rather than invent one.
function Sparkline({ points, labels, color, unit = "", ui }) {
  const [hov, setHov] = useState(null);
  if (!points || points.length < 2) return null;
  const w = 100, h = 26, pad = 2;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const xOf = (i) => pad + i * step;
  const yOf = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
  // Smooth curve (same easing as the Trend Overview chart): each step bends
  // through the midpoint, so a daily series reads as a wave, not a zig-zag.
  const path = points.reduce((d, v, i) => {
    const x = xOf(i), y = yOf(v);
    if (i === 0) return `M${x.toFixed(2)},${y.toFixed(2)}`;
    const px = xOf(i - 1), py = yOf(points[i - 1]), cx = (px + x) / 2;
    return `${d} C${cx.toFixed(2)},${py.toFixed(2)} ${cx.toFixed(2)},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
  }, "");

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    setHov(Math.max(0, Math.min(points.length - 1, Math.round((x - pad) / step))));
  };

  return (
    <div style={{ position: "relative", marginTop: 6 }} onMouseMove={onMove} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 22, display: "block" }}>
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {hov != null && (
        <>
          {/* HTML dot, not an SVG circle — the SVG is stretched, which would squash a circle. */}
          <span style={{
            position: "absolute", width: 7, height: 7, borderRadius: "50%", background: color, border: `1.5px solid ${ui.cardBg}`,
            left: `${xOf(hov)}%`, top: `${(yOf(points[hov]) / h) * 22}px`, transform: "translate(-50%, -50%)", pointerEvents: "none",
          }} />
          <span style={{
            position: "absolute", right: 0, bottom: 24, fontSize: "0.62rem", fontWeight: 600, whiteSpace: "nowrap",
            color: ui.textSub, background: ui.cardBg, padding: "1px 4px", borderRadius: 4, pointerEvents: "none",
          }}>
            {labels?.[hov] ? `${labels[hov]}: ` : ""}<b style={{ color }}>{points[hov].toLocaleString()}{unit}</b>
          </span>
        </>
      )}
    </div>
  );
}

export function GMPKpiCard({ icon, label, value, color, sub, sparkline, sparkLabels, sparkUnit, delta, ui, animDelay = 0 }) {
  const animated = useFormattedCountUp(value);
  const [hov, setHov] = useState(false);
  // A sparkline array is still a truthy reference even with 0-1 points (not
  // enough to draw a line) — check length explicitly.
  const showSparkline = Array.isArray(sparkline) && sparkline.length >= 2;

  return (
    <FadeSlideIn delay={animDelay}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: ui.cardBg,
          border: isDarkUI(ui) ? `1px solid ${ui.cardBorder}` : "1px solid transparent",
          borderRadius: 16,
          boxShadow: hov
            ? `0 0 0 1px ${color}66, 0 0 22px ${color}73, 0 10px 34px ${color}59, ${gmpCardShadow(isDarkUI(ui))}`
            : gmpCardShadow(isDarkUI(ui)),
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          height: "100%",
          boxSizing: "border-box",
          position: "relative",
          zIndex: hov ? 10 : 1,
          transform: hov ? "translateY(-3px)" : "none",
          transition: "transform 0.2s ease, box-shadow 0.25s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 22, height: 22, flexShrink: 0, borderRadius: 7,
              background: `${color}1c`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.72rem",
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.05em", color: ui.textMuted, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ fontSize: "1.4rem", fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
          {animated}
        </div>
        {delta && (
          <div style={{
            fontSize: "0.66rem", fontWeight: 600,
            color: delta.dir === "up" ? "#0f8a72" : delta.dir === "down" ? "#c8384f" : ui.textMuted,
          }}>
            {delta.dir === "up" ? "▲" : delta.dir === "down" ? "▼" : "—"} {delta.text}
          </div>
        )}
        {showSparkline && <Sparkline points={sparkline} labels={sparkLabels} unit={sparkUnit} color={color} ui={ui} />}
        {/* The explanatory sentence lives in a hover pop-up, so the tile itself
            stays number + trend only. */}
        {sub && hov && (
          <div
            role="tooltip"
            style={{
              position: "absolute", left: 0, bottom: "calc(100% + 8px)", zIndex: 20, width: "max-content", maxWidth: 240,
              padding: "7px 10px", borderRadius: 10, fontSize: "0.72rem", lineHeight: 1.4, fontWeight: 500,
              color: ui.textPrimary, background: ui.cardBg, border: `1px solid ${ui.cardBorder}`,
              boxShadow: "0 6px 18px rgba(0,0,0,0.16)", pointerEvents: "none",
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </FadeSlideIn>
  );
}
