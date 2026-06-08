import { useState, useEffect, useRef } from "react";
import { neuCardBg, neuShadow } from "./analyticsHelpers";

export function FadeSlideIn({ children, delay = 0, style: extra = {} }) {
  return (
    <div
      style={{
        animation: `analytics-fade-slide-up 0.45s ease both`,
        animationDelay: `${delay}ms`,
        ...extra,
      }}
    >
      {children}
    </div>
  );
}

export function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  useEffect(() => {
    const isPercent = typeof target === "string" && target.endsWith("%");
    const end = parseFloat(target) || 0;
    const start = fromRef.current;
    fromRef.current = end;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startRef.current = null;
    function step(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(isPercent ? `${current}%` : current);
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    }
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return display;
}

export function KpiCard({
  icon,
  label,
  value,
  color,
  sub,
  darkMode,
  ui,
  animDelay = 0,
}) {
  const animated = useCountUp(value);
  return (
    <FadeSlideIn delay={animDelay}>
      <div
        style={{
          background: neuCardBg(darkMode),
          borderRadius: 16,
          padding: "16px 18px",
          boxShadow: neuShadow(darkMode),
          borderTop: `3px solid ${color}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          height: "100%",
          boxSizing: "border-box",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: ui.textMuted,
            }}
          >
            {label}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: neuCardBg(darkMode),
              boxShadow: neuShadow(darkMode),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
            }}
          >
            {icon}
          </div>
        </div>
        <div
          style={{
            fontSize: "1.9rem",
            fontWeight: 800,
            color,
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {animated}
        </div>
        {sub && (
          <div style={{ fontSize: "0.7rem", color: ui.textMuted }}>{sub}</div>
        )}
      </div>
    </FadeSlideIn>
  );
}
