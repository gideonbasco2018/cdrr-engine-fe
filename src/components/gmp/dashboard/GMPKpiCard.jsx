// src/components/gmp/dashboard/GMPKpiCard.jsx
// KPI tile for FGMP Monitoring & Analytics — flat card (no left accent bar,
// no neumorphic shadow) matching GMPSectionCard's chrome, so a tile and a
// chart card read as the same surface. Color lives in the number and the
// optional sparkline/delta, not in the card itself.
import { useState, useEffect, useRef } from "react";
import { FadeSlideIn } from "../../monitoring/analytics/KpiCard";

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
function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const w = 100, h = 26, pad = 2;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(pad + i * step).toFixed(1)},${(h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 22, display: "block", marginTop: 6 }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function GMPKpiCard({ icon, label, value, color, sub, sparkline, delta, ui, animDelay = 0 }) {
  const animated = useFormattedCountUp(value);
  const [hov, setHov] = useState(false);
  // A sparkline array is still a truthy reference even with 0-1 points (not
  // enough to draw a line) — check length explicitly so a tile with a short
  // series correctly falls back to its `sub` caption instead of rendering
  // nothing where that caption would have been.
  const showSparkline = Array.isArray(sparkline) && sparkline.length >= 2;

  return (
    <FadeSlideIn delay={animDelay}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 11,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          height: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
          transform: hov ? "translateY(-2px)" : "none",
          transition: "transform 0.15s ease",
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
        {showSparkline ? (
          <Sparkline points={sparkline} color={color} />
        ) : sub ? (
          <div
            style={{
              fontSize: "0.64rem", color: ui.textMuted, lineHeight: 1.3, overflow: "hidden",
              textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
              marginTop: delta ? 0 : 2,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </FadeSlideIn>
  );
}
