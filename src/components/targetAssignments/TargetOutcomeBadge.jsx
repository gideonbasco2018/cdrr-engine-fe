import React from "react";
import { TARGET_OUTCOME_STYLES } from "./statusHelpers";

export function TargetOutcomeBadge({ outcome }) {
  const s = TARGET_OUTCOME_STYLES[outcome] || TARGET_OUTCOME_STYLES.unknown;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.68rem",
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: "9999px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export default TargetOutcomeBadge;
