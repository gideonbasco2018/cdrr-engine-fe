// FILE: src/components/clinicalTrial/AuditLogModal.jsx
import { useState, useEffect, useCallback } from "react";
import { getClinicalTrialAuditLogs } from "../../api/clinicalTrials";
import AuditLogEntry from "./AuditLogEntry";

/* ── AuditLogModal — fetches and lists the audit trail for a single trial ── */
function AuditLogModal({ trial, onClose, colors, darkMode }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!trial?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getClinicalTrialAuditLogs(trial.id);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load change logs");
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [trial?.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!trial) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "560px",
          maxWidth: "92vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.85rem 1.1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Change History
            </h3>
            <span style={{ fontSize: "0.65rem", color: colors.textTertiary }}>
              {trial.protocolNo || `Trial #${trial.id}`}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: colors.textTertiary,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "0.85rem 1.1rem", overflowY: "auto", flex: 1 }}>
          {isLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 0",
                fontSize: "0.75rem",
                color: colors.textTertiary,
              }}
            >
              Loading change logs…
            </div>
          ) : error ? (
            <div
              style={{
                background: "#ef444415",
                border: "1px solid #ef444450",
                borderRadius: "8px",
                padding: "0.6rem 0.85rem",
                fontSize: "0.7rem",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 0",
                fontSize: "0.75rem",
                color: colors.textTertiary,
              }}
            >
              No change history yet for this trial.
            </div>
          ) : (
            logs.map((log) => (
              <AuditLogEntry key={log.id} log={log} colors={colors} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditLogModal;
