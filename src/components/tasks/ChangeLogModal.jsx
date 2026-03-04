// src/components/modals/ChangeLogModal.jsx
import { useState, useEffect } from "react";
import { getFieldAuditHistory } from "../../api/field-audit-logs";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */
const formatDateTime = (iso) => {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const stepColors = {
  "Quality Evaluation": {
    bg: "rgba(99,102,241,0.12)",
    text: "#6366f1",
    border: "rgba(99,102,241,0.3)",
  },
  Compliance: {
    bg: "rgba(245,158,11,0.12)",
    text: "#d97706",
    border: "rgba(245,158,11,0.3)",
  },
  Checking: {
    bg: "rgba(59,130,246,0.12)",
    text: "#2563eb",
    border: "rgba(59,130,246,0.3)",
  },
  Supervisor: {
    bg: "rgba(16,185,129,0.12)",
    text: "#059669",
    border: "rgba(16,185,129,0.3)",
  },
  QA: {
    bg: "rgba(236,72,153,0.12)",
    text: "#db2777",
    border: "rgba(236,72,153,0.3)",
  },
  "Director Signature": {
    bg: "rgba(239,68,68,0.12)",
    text: "#dc2626",
    border: "rgba(239,68,68,0.3)",
  },
  Releasing: {
    bg: "rgba(107,114,128,0.12)",
    text: "#4b5563",
    border: "rgba(107,114,128,0.3)",
  },
};

const getStepStyle = (step) =>
  stepColors[step] ?? {
    bg: "rgba(107,114,128,0.1)",
    text: "#6b7280",
    border: "rgba(107,114,128,0.25)",
  };

/* ================================================================== */
/*  ChangeLogModal                                                      */
/* ================================================================== */
function ChangeLogModal({ record, onClose, colors }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({}); // session_id → bool

  useEffect(() => {
    if (!record?.mainDbId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getFieldAuditHistory(record.mainDbId);
        setSessions(data ?? []);
        // Auto-expand first session
        if (data?.length > 0) {
          setExpanded({ [data[0].session_id]: true });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [record?.mainDbId]);

  const toggleSession = (sessionId) =>
    setExpanded((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(780px, 95vw)",
          maxHeight: "88vh",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: colors.textPrimary,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              📋 Change Log
              {sessions.length > 0 && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    background: "rgba(33,150,243,0.12)",
                    color: "#2196F3",
                    borderRadius: 6,
                  }}
                >
                  {sessions.length} session{sessions.length > 1 ? "s" : ""}
                </span>
              )}
            </h2>
            <p
              style={{
                fontSize: "0.78rem",
                color: colors.textTertiary,
                margin: "0.2rem 0 0",
              }}
            >
              DTN:{" "}
              <strong style={{ color: "#2196F3" }}>
                {record?.dtn ?? "N/A"}
              </strong>
              {" · "}
              {record?.prodBrName ?? ""}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              flexShrink: 0,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ef444415";
              e.currentTarget.style.borderColor = "#ef4444";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = colors.cardBorder;
              e.currentTarget.style.color = colors.textSecondary;
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Content ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            minHeight: 0,
          }}
        >
          {/* Loading */}
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                gap: "1rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 32,
                  height: 32,
                  border: "3px solid rgba(33,150,243,0.2)",
                  borderTopColor: "#2196F3",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              <span style={{ color: colors.textTertiary, fontSize: "0.88rem" }}>
                Loading change history...
              </span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div
              style={{
                padding: "1.25rem",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10,
                color: "#ef4444",
                fontSize: "0.88rem",
                textAlign: "center",
              }}
            >
              ❌ Failed to load: {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && sessions.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <p
                style={{
                  color: colors.textTertiary,
                  fontSize: "0.9rem",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                No changes recorded yet
              </p>
              <p
                style={{
                  color: colors.textTertiary,
                  fontSize: "0.8rem",
                  margin: 0,
                }}
              >
                Field edits will appear here after submission.
              </p>
            </div>
          )}

          {/* Sessions timeline */}
          {!loading && !error && sessions.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {sessions.map((session, idx) => {
                const isOpen = !!expanded[session.session_id];
                const stepStyle = getStepStyle(session.step_context);

                return (
                  <div
                    key={session.session_id}
                    style={{
                      border: `1px solid ${isOpen ? stepStyle.border : colors.cardBorder}`,
                      borderRadius: 10,
                      overflow: "hidden",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {/* Session header — clickable */}
                    <button
                      onClick={() => toggleSession(session.session_id)}
                      style={{
                        width: "100%",
                        padding: "0.9rem 1.1rem",
                        background: isOpen ? `${stepStyle.bg}` : colors.inputBg,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        textAlign: "left",
                        transition: "background 0.2s",
                      }}
                    >
                      {/* Index badge */}
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: isOpen
                            ? stepStyle.text
                            : colors.cardBorder,
                          color: isOpen ? "#fff" : colors.textTertiary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                        }}
                      >
                        {sessions.length - idx}
                      </span>

                      {/* Step badge */}
                      <span
                        style={{
                          padding: "0.2rem 0.65rem",
                          borderRadius: 6,
                          background: stepStyle.bg,
                          color: stepStyle.text,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          border: `1px solid ${stepStyle.border}`,
                          flexShrink: 0,
                        }}
                      >
                        {session.step_context || "Unknown Step"}
                      </span>

                      {/* Meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: colors.textPrimary,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>👤 {session.changed_by}</span>
                          <span
                            style={{
                              color: colors.textTertiary,
                              fontWeight: 400,
                            }}
                          >
                            ·
                          </span>
                          <span
                            style={{
                              color: colors.textTertiary,
                              fontWeight: 400,
                              fontSize: "0.78rem",
                            }}
                          >
                            🕐 {formatDateTime(session.changed_at)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.73rem",
                            color: colors.textTertiary,
                            marginTop: "0.15rem",
                          }}
                        >
                          {session.changes?.length ?? 0} field
                          {(session.changes?.length ?? 0) !== 1 ? "s" : ""}{" "}
                          changed
                        </div>
                      </div>

                      {/* Expand chevron */}
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: colors.textTertiary,
                          flexShrink: 0,
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      >
                        ▼
                      </span>
                    </button>

                    {/* Changes table */}
                    {isOpen && (
                      <div
                        style={{ borderTop: `1px solid ${stepStyle.border}` }}
                      >
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr style={{ background: colors.tableBg }}>
                              {["Field", "Before", "", "After"].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    padding: "0.55rem 0.85rem",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    color: colors.textTertiary,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    textAlign: "left",
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(session.changes ?? []).map((change, ci) => (
                              <tr
                                key={ci}
                                style={{
                                  background:
                                    ci % 2 === 0
                                      ? colors.tableRowEven
                                      : colors.tableRowOdd,
                                }}
                              >
                                {/* Field label */}
                                <td
                                  style={{
                                    padding: "0.6rem 0.85rem",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: colors.textPrimary,
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {change.field_label || change.field_name}
                                </td>

                                {/* Old value */}
                                <td
                                  style={{
                                    padding: "0.6rem 0.85rem",
                                    fontSize: "0.78rem",
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                    maxWidth: 180,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {change.old_value ? (
                                    <span
                                      style={{
                                        color: "#ef4444",
                                        background: "rgba(239,68,68,0.08)",
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: 4,
                                        display: "inline-block",
                                      }}
                                    >
                                      {change.old_value}
                                    </span>
                                  ) : (
                                    <em
                                      style={{
                                        color: colors.textTertiary,
                                        fontSize: "0.75rem",
                                      }}
                                    >
                                      empty
                                    </em>
                                  )}
                                </td>

                                {/* Arrow */}
                                <td
                                  style={{
                                    padding: "0.6rem 0.4rem",
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                    color: colors.textTertiary,
                                    fontSize: "0.85rem",
                                    textAlign: "center",
                                  }}
                                >
                                  →
                                </td>

                                {/* New value */}
                                <td
                                  style={{
                                    padding: "0.6rem 0.85rem",
                                    fontSize: "0.78rem",
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                    maxWidth: 180,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {change.new_value ? (
                                    <span
                                      style={{
                                        color: "#10b981",
                                        background: "rgba(16,185,129,0.08)",
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: 4,
                                        display: "inline-block",
                                      }}
                                    >
                                      {change.new_value}
                                    </span>
                                  ) : (
                                    <em
                                      style={{
                                        color: colors.textTertiary,
                                        fontSize: "0.75rem",
                                      }}
                                    >
                                      empty
                                    </em>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "0.85rem 1.75rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
            background: colors.cardBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
            {sessions.length > 0
              ? `Total: ${sessions.reduce((sum, s) => sum + (s.changes?.length ?? 0), 0)} field change${sessions.reduce((sum, s) => sum + (s.changes?.length ?? 0), 0) !== 1 ? "s" : ""} across ${sessions.length} session${sessions.length !== 1 ? "s" : ""}`
              : "No changes recorded"}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: 8,
              background: colors.inputBg,
              border: `1px solid ${colors.cardBorder}`,
              color: colors.textPrimary,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default ChangeLogModal;
