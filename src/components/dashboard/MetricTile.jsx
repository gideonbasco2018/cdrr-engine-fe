import { useState } from "react";
import { FB } from "./constants";

export default function MetricTile({
  icon, label, value, change, active,
  onClick, ui, loading = false, isLive = false,
}) {
  const up = change >= 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex:       "1 1 0",
        padding:    "12px 14px",
        borderRadius: 8,
        border:     `1.5px solid ${active ? FB : hovered ? `${FB}80` : ui.metricBorder}`,
        background: active
          ? ui.metricActiveBg
          : hovered
            ? ui.hoverBg
            : "transparent",
        cursor:     "pointer",
        transition: "all 0.15s",
        minWidth:   0,
        position:   "relative",
      }}
    >
      {isLive && !loading && (
        <span
          style={{
            position:     "absolute",
            top:          6,
            right:        8,
            fontSize:     "0.56rem",
            fontWeight:   700,
            color:        "#36a420",
            background:   "#e9f7e6",
            padding:      "1px 5px",
            borderRadius: 99,
            letterSpacing:"0.04em",
          }}
        >
          ● LIVE
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontSize: "0.78rem", color: ui.textSub }}>{label}</span>
      </div>

      {loading ? (
        <div
          style={{
            width:        60,
            height:       22,
            borderRadius: 4,
            background:   ui.progressBg,
            animation:    "cdrrPulse 1.2s ease-in-out infinite",
          }}
        />
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.4rem", fontWeight: 700, color: ui.textPrimary, lineHeight: 1 }}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {change !== null && (
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: up ? "#36a420" : "#e02020" }}>
              {up ? "↑" : "↓"} {Math.abs(change)}%
            </span>
          )}
        </div>
      )}

      {!loading && hovered && (
        <div style={{ marginTop: 4, fontSize: "0.65rem", color: FB, fontWeight: 600 }}>
          View details →
        </div>
      )}
    </div>
  );
}
