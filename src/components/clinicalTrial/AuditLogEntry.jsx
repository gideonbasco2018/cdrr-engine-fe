// FILE: src/components/clinicalTrial/AuditLogEntry.jsx
import { API_FIELD_LABELS, DRUG_FIELD_API_LABELS } from "./constants";

// Short readable label for one drug object coming from the audit log
// (snake_case keys, as stored by the backend).
function drugSummary(drug) {
  if (!drug) return "—";
  return drug.ip_name || "Unnamed drug";
}

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
            {log.changed_by_name ||
              (log.changed_by ? `User #${log.changed_by}` : "System")}
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
        Object.entries(changes).map(([field, diff]) => {
          if (field === "drugs") {
            const oldDrugs = Array.isArray(diff.old) ? diff.old : [];
            const newDrugs = Array.isArray(diff.new) ? diff.new : [];
            return (
              <div
                key={field}
                style={{ fontSize: "0.68rem", marginBottom: "0.4rem" }}
              >
                <strong style={{ color: colors.textPrimary }}>
                  {API_FIELD_LABELS.drugs}:
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.15rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ color: colors.textTertiary, fontSize: "0.6rem" }}
                    >
                      Before ({oldDrugs.length})
                    </div>
                    <div
                      style={{
                        color: "#ef4444",
                        textDecoration: "line-through",
                      }}
                    >
                      {oldDrugs.length === 0
                        ? "—"
                        : oldDrugs.map(drugSummary).join(", ")}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ color: colors.textTertiary, fontSize: "0.6rem" }}
                    >
                      After ({newDrugs.length})
                    </div>
                    <div style={{ color: "#10B981" }}>
                      {newDrugs.length === 0
                        ? "—"
                        : newDrugs.map(drugSummary).join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={field}
              style={{ fontSize: "0.68rem", marginBottom: "0.25rem" }}
            >
              <strong style={{ color: colors.textPrimary }}>
                {API_FIELD_LABELS[field] || field}:
              </strong>{" "}
              <span
                style={{ color: "#ef4444", textDecoration: "line-through" }}
              >
                {diff.old ?? "—"}
              </span>{" "}
              <span style={{ color: colors.textTertiary }}>→</span>{" "}
              <span style={{ color: "#10B981" }}>{diff.new ?? "—"}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default AuditLogEntry;
