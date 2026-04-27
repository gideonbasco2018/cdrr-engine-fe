// FILE: src/components/tasks/DataTable/BulkCompleteModal.jsx

import { useState } from "react";

export function BulkCompleteModal({
  selectedCount,
  selectedDtns,
  colors,
  darkMode,
  onClose,
  onConfirm,
  onDone,
}) {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, failed }
  const [reason, setReason] = useState("");
  const REASONS = [
    "Task fulfilled",
    "Document verified and approved",
    "Released to applicant",
    "Other",
  ];

  const handleConfirm = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      const res = await onConfirm({ remarks, reason }); // ← dagdag ang reason
      setResult(res);
    } catch (e) {
      console.error("Bulk complete error:", e);
      setResult({ success: 0, failed: selectedCount });
    } finally {
      setLoading(false);
    }
  };
  const handleDone = async () => {
    if (onDone) await onDone();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={!loading ? onClose : undefined}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10000,
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          width: "min(520px, 92vw)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <span style={{ fontSize: "1.5rem" }}>✅</span>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                Mark as Completed
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                }}
              >
                {selectedCount} record{selectedCount > 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
          {!loading && !result && (
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textSecondary,
                cursor: "pointer",
                fontSize: "1rem",
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
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {/* Result view */}
          {result ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem 0",
              }}
            >
              <div style={{ fontSize: "3rem" }}>
                {result.failed === 0 ? "🎉" : "⚠️"}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {result.failed === 0
                  ? "All records completed!"
                  : "Completed with some errors"}
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                {result.success > 0 && (
                  <span
                    style={{
                      padding: "0.4rem 1rem",
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: 8,
                      fontSize: "0.82rem",
                      color: "#10b981",
                      fontWeight: 700,
                    }}
                  >
                    ✅ {result.success} succeeded
                  </span>
                )}
                {result.failed > 0 && (
                  <span
                    style={{
                      padding: "0.4rem 1rem",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 8,
                      fontSize: "0.82rem",
                      color: "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    ❌ {result.failed} failed
                  </span>
                )}
              </div>
              <button
                onClick={handleDone}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.65rem 2rem",
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* DTN list */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: darkMode
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(16,185,129,0.05)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  borderRadius: 10,
                  marginBottom: "1.25rem",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#10b981",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  📋 Records to Complete
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    maxHeight: 120,
                    overflowY: "auto",
                  }}
                >
                  {selectedDtns.map((dtn, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "0.2rem 0.6rem",
                        background: darkMode ? "rgba(16,185,129,0.15)" : "#fff",
                        border: "1px solid rgba(16,185,129,0.3)",
                        borderRadius: 6,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: colors.textPrimary,
                      }}
                    >
                      {dtn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: darkMode
                    ? "rgba(33,150,243,0.08)"
                    : "rgba(33,150,243,0.05)",
                  border: "1px solid rgba(33,150,243,0.2)",
                  borderRadius: 10,
                  marginBottom: "1.25rem",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>ℹ️</span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    What happens when you mark as completed?
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    {[
                      "The task will be marked as COMPLETED and can no longer be modified.",
                      "The record will be removed from your active task list.",
                      "The action will be recorded in the audit log for transparency.",
                    ].map((note, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: "0.75rem",
                          color: colors.textTertiary,
                          lineHeight: 1.5,
                        }}
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Reason */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  marginBottom: "1rem",
                }}
              >
                <label
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Reason <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    padding: "0.6rem 0.8rem",
                    background: colors.inputBg,
                    border: `1px solid ${reason ? "#10b981" : colors.inputBorder}`,
                    borderRadius: 8,
                    color: reason ? colors.textPrimary : colors.textTertiary,
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    paddingRight: "2rem",
                  }}
                >
                  <option value="" disabled>
                    Select a reason...
                  </option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  marginBottom: "1.5rem",
                }}
              >
                <label
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Remarks{" "}
                  <span style={{ fontWeight: 400, textTransform: "none" }}>
                    (optional)
                  </span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add completion remarks..."
                  style={{
                    padding: "0.6rem 0.8rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: 8,
                    color: colors.textPrimary,
                    fontSize: "0.82rem",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#10b981")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = colors.inputBorder)
                  }
                />
              </div>

              {/* Warning */}
              <div
                style={{
                  padding: "0.65rem 0.9rem",
                  background: darkMode
                    ? "rgba(245,158,11,0.08)"
                    : "rgba(245,158,11,0.05)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                  marginBottom: "1.5rem",
                }}
              >
                ⚠️ This will mark{" "}
                <strong style={{ color: "#f59e0b" }}>
                  {selectedCount} record{selectedCount > 1 ? "s" : ""}
                </strong>{" "}
                as <strong style={{ color: "#10b981" }}>COMPLETED</strong>. This
                action cannot be undone.
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    padding: "0.6rem 1.25rem",
                    background: "transparent",
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 8,
                    color: colors.textSecondary,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || !reason}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background:
                      loading || !reason
                        ? "rgba(16,185,129,0.4)"
                        : "linear-gradient(135deg,#10b981,#059669)",
                    cursor: loading || !reason ? "not-allowed" : "pointer",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: "0.875rem",
                    fontWeight: 700,

                    boxShadow: loading
                      ? "none"
                      : "0 2px 8px rgba(16,185,129,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Processing...
                    </>
                  ) : (
                    <>✅ Mark as Completed</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
