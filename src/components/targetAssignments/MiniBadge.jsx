import React from "react";

export function MiniBadge({ label, value, colors, tone }) {
  const toneStyles = {
    neutral: {
      bg: colors.rowHover,
      border: colors.cardBorder,
      color: colors.textSecondary,
    },
    green: { bg: "rgba(34,197,94,0.12)", border: "#22c55e", color: "#22c55e" },
    blue: { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", color: "#3b82f6" },
    red: { bg: "rgba(239,68,68,0.12)", border: "#ef4444", color: "#ef4444" },
    target: {
      bg: colors.targetBg,
      border: colors.targetBorder,
      color: colors.targetBorder,
    },
  };
  const s = toneStyles[tone] || toneStyles.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.66rem",
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: "9999px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      <span style={{ fontWeight: 800, fontSize: "0.78rem" }}>{value}</span>
      <span>{label}</span>
    </span>
  );
}

export default MiniBadge;
