// FILE: src/components/clinicalTrial/ViewDetailsModal.jsx
import { useState, useEffect, useCallback } from "react";
import { getClinicalTrialAuditLogs } from "../../api/clinicalTrials.js";
import { TRIAL_FIELD_GROUPS } from "./constants";
import ProtocolBadge from "./ProtocolBadge";
import PhaseBadge from "./PhaseBadge";
import AuditLogEntry from "./AuditLogEntry";

function ViewDetailsModal({ trial, onClose, onUpdate, colors, darkMode }) {
  const [activeTab, setActiveTab] = useState("details");
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

  useEffect(() => {
    setActiveTab("details");
    setAuditLogs([]);
  }, [trial?.id]);

  const fetchAuditLogs = useCallback(async () => {
    if (!trial) return;
    setIsLoadingAuditLogs(true);
    try {
      const { data } = await getClinicalTrialAuditLogs(trial.id);
      setAuditLogs(data || []);
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingAuditLogs(false);
    }
  }, [trial]);

  const handleOpenHistoryTab = () => {
    setActiveTab("history");
    fetchAuditLogs();
  };

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
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.9rem 1.1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Trial Details
            </h3>
            <ProtocolBadge value={trial.protocolNo} />
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1rem",
              cursor: "pointer",
              color: colors.textTertiary,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "flex",
            padding: "0 1.1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <button
            onClick={() => setActiveTab("details")}
            style={{
              padding: "0.5rem 0.1rem",
              marginRight: "1rem",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === "details"
                  ? "2px solid #6366f1"
                  : "2px solid transparent",
              color:
                activeTab === "details"
                  ? colors.textPrimary
                  : colors.textTertiary,
              fontWeight: activeTab === "details" ? 600 : 400,
              fontSize: "0.7rem",
              cursor: "pointer",
            }}
          >
            Details
          </button>
          <button
            onClick={handleOpenHistoryTab}
            style={{
              padding: "0.5rem 0.1rem",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === "history"
                  ? "2px solid #6366f1"
                  : "2px solid transparent",
              color:
                activeTab === "history"
                  ? colors.textPrimary
                  : colors.textTertiary,
              fontWeight: activeTab === "history" ? 600 : 400,
              fontSize: "0.7rem",
              cursor: "pointer",
            }}
          >
            Change History
          </button>
        </div>

        <div style={{ padding: "1rem 1.1rem", overflowY: "auto" }}>
          {activeTab === "details" &&
            TRIAL_FIELD_GROUPS.map((group) => (
              <div key={group.title} style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: colors.textTertiary,
                    marginBottom: "0.4rem",
                  }}
                >
                  {group.title}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.6rem 1rem",
                  }}
                >
                  {group.fields.map((field) => (
                    <div
                      key={field.key}
                      style={
                        field.type === "textarea"
                          ? { gridColumn: "1 / -1" }
                          : undefined
                      }
                    >
                      <div
                        style={{
                          fontSize: "0.6rem",
                          color: colors.textTertiary,
                          marginBottom: "0.15rem",
                        }}
                      >
                        {field.label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: colors.textPrimary,
                        }}
                      >
                        {field.key === "phase" ? (
                          trial.phase ? (
                            <PhaseBadge phase={trial.phase} />
                          ) : (
                            "—"
                          )
                        ) : field.key === "totalQtyApprove" ? (
                          (trial.totalQtyApprove ?? 0).toLocaleString()
                        ) : (
                          trial[field.key] || "—"
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {activeTab === "history" && (
            <div>
              {isLoadingAuditLogs ? (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: colors.textTertiary,
                    padding: "1rem 0",
                    textAlign: "center",
                  }}
                >
                  Loading change history…
                </div>
              ) : auditLogs.length === 0 ? (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: colors.textTertiary,
                    padding: "1rem 0",
                    textAlign: "center",
                  }}
                >
                  No changes have been recorded for this trial yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <AuditLogEntry key={log.id} log={log} colors={colors} />
                ))
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "0.75rem 1.1rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() => onUpdate(trial)}
            style={{
              padding: "0.4rem 0.9rem",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Update
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0.4rem 0.9rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              color: colors.textPrimary,
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewDetailsModal;
