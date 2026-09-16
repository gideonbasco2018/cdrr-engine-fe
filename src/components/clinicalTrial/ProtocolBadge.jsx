// FILE: src/components/clinicalTrial/ProtocolBadge.jsx

function ProtocolBadge({ value }) {
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
      {value}
    </span>
  );
}

export default ProtocolBadge;
