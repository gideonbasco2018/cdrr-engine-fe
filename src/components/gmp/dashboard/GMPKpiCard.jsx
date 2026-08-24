// src/components/gmp/dashboard/GMPKpiCard.jsx
// Compact KPI card for the GMP analytics view — smaller than the shared
// monitoring/analytics KpiCard, with a tinted icon chip and left accent bar
// instead of a top border.
import { useState } from "react";
import { FadeSlideIn, useCountUp } from "../../monitoring/analytics/KpiCard";
import { neuCardBg, neuShadow } from "../../monitoring/analytics/analyticsHelpers";

export function GMPKpiCard({ icon, label, value, color, sub, darkMode, ui, animDelay = 0 }) {
  const animated = useCountUp(value);
  const [hov, setHov] = useState(false);

  return (
    <FadeSlideIn delay={animDelay}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: "relative",
          background: neuCardBg(darkMode),
          borderRadius: 12,
          padding: "10px 12px 10px 14px",
          boxShadow: neuShadow(darkMode),
          display: "flex",
          flexDirection: "column",
          gap: 5,
          height: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
          transform: hov ? "translateY(-2px)" : "none",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: color,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 22,
              height: 22,
              flexShrink: 0,
              borderRadius: 7,
              background: `${color}1c`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: ui.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontSize: "1.35rem",
            fontWeight: 800,
            color,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {animated}
        </div>
        {sub && (
          <div
            style={{
              fontSize: "0.64rem",
              color: ui.textMuted,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </FadeSlideIn>
  );
}
