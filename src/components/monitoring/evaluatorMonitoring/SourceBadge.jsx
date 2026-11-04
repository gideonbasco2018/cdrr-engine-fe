// src/components/monitoring/evaluatorMonitoring/SourceBadge.jsx
// A small CPR / FGMP tag. CPR uses the blue tone and FGMP the green tone of the
// page, so the two read apart at a glance.
export const SOURCE_LABEL = { cpr: "CPR", fgmp: "FGMP" };

export function SourceBadge({ source, t }) {
  const fgmp = source === "fgmp";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.1rem 0.5rem",
        borderRadius: 999,
        fontSize: "0.58rem",
        fontWeight: 600,
        letterSpacing: "0.06em",
        color: fgmp ? t.accentText : t.blueText,
        background: fgmp ? t.accentSoft : t.blueSoft,
        border: `1px solid ${fgmp ? t.accentLine : t.blueLine}`,
      }}
    >
      {SOURCE_LABEL[source] || String(source || "").toUpperCase()}
    </span>
  );
}
