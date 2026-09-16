// FILE: src/components/clinicalTrial/PhaseBadge.jsx
import { PHASE_COLORS } from "./constants";

function PhaseBadge({ phase }) {
  return (
    <span
      style={{
        padding: "0.25rem 0.6rem",
        background:
          PHASE_COLORS[phase] || "linear-gradient(135deg,#6b7280,#4b5563)",
        color: "#fff",
        borderRadius: "6px",
        fontSize: "0.55rem",
        fontWeight: "600",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      Phase {phase}
    </span>
  );
}

export default PhaseBadge;
