// FILE: src/components/donation/badges.jsx
import { STATUS_MAP } from "./constants";

export function StatusBadge({ status }) {
  const c = STATUS_MAP[status] || {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    sh: "rgba(107,114,128,0.3)",
    icon: "•",
  };
  return (
    <span
      style={{
        padding: "0.3rem 0.7rem",
        background: c.bg,
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: `0 2px 8px ${c.sh}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
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
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: "0 2px 8px rgba(8,8,8,0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {dtn}
    </span>
  );
}
