// FILE: src/components/clinicalTrial/AuditLogEntry.jsx
import { API_FIELD_LABELS } from "./constants";

const ACTION_COLORS = {
  CREATE: "#059669",
  UPDATE: "#6366f1",
};

/* ── AuditLogEntry — one row in the Change History tab ── */
function AuditLogEntry({ log, colors }) {
  let changes = {};
  try {
    changes = JSON.parse(log.changed_fields || "{}");
  } catch {
    changes = {};
  }

  return (
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        padding: "0.6rem 0.75rem",
        marginBottom: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.62rem",
          color: colors.textTertiary,
          marginBottom: "0.4rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 99,
              background: `${ACTION_COLORS[log.action] || "#6b7280"}22`,
              color: ACTION_COLORS[log.action] || "#6b7280",
              fontWeight: 700,
              fontSize: "0.58rem",
            }}
          >
            {log.action}
          </span>
          <span>
            {log.changed_by ? `User #${log.changed_by}` : "Unknown user"}
          </span>
        </div>
        <span>
          {log.changed_at ? new Date(log.changed_at).toLocaleString() : "—"}
        </span>
      </div>

      {Object.keys(changes).length === 0 ? (
        <div style={{ fontSize: "0.68rem", color: colors.textTertiary }}>
          No field-level changes recorded.
        </div>
      ) : (
        Object.entries(changes).map(([field, diff]) => (
          <div
            key={field}
            style={{ fontSize: "0.68rem", marginBottom: "0.25rem" }}
          >
            <strong style={{ color: colors.textPrimary }}>
              {API_FIELD_LABELS[field] || field}:
            </strong>{" "}
            <span style={{ color: "#ef4444", textDecoration: "line-through" }}>
              {diff.old ?? "—"}
            </span>{" "}
            <span style={{ color: colors.textTertiary }}>→</span>{" "}
            <span style={{ color: "#10B981" }}>{diff.new ?? "—"}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default AuditLogEntry;
