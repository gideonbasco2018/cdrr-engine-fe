// FILE: src/components/donation/badges.jsx
import { STATUS_MAP, ACCENT } from "./constants";

export function StatusBadge({ status }) {
  const c = STATUS_MAP[status] || { bg: "#f1f5f9", color: "#64748b", icon: "•" };
  return (
    <span
      style={{
        padding: "3px 9px",
        background: c.bg,
        color: c.color,
        borderRadius: 99,
        fontSize: "0.63rem",
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{c.icon}</span>
      {status}
    </span>
  );
}

export function DTNBadge({ dtn }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "ui-monospace,monospace",
        padding: "3px 9px",
        background: `${ACCENT}15`,
        color: ACCENT,
        borderRadius: 6,
        fontSize: "0.71rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {dtn}
    </span>
  );
}
