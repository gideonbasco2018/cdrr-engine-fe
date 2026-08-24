import { useState } from "react";

export function BulkCancelModal({
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
  const [result, setResult] = useState(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const REASONS = [
    "Applicant requested cancellation",
    "Duplicate application",
    "Incomplete requirements",
    "Non-compliance",
    "Superseded by another application",
    "Other",
  ];

  const handleConfirm = async () => {
    if (!reason || !confirmed) return;
    setLoading(true);
    try {
      const res = await onConfirm({
        remarks: remarks || null,
        reason,
      });
      setResult(res);
    } catch (e) {
      console.error("Bulk cancel error:", e);
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
          background: "rgba(0,0,0,0.65)",
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
          border: `2px solid #d97706`,
          borderRadius: 16,
          boxShadow:
            "0 24px 80px rgba(217,119,6,0.25), 0 8px 32px rgba(0,0,0,0.4)",
          width: "min(560px, 92vw)",
          overflow: "hidden",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "1.1rem 1.5rem",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <span style={{ fontSize: "1.5rem" }}>🚫</span>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Cancel Application
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {selectedCount} record{selectedCount > 1 ? "s" : ""} selected —
                this cannot be undone
              </p>
            </div>
          </div>
          {!loading && !result && (
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "1.5rem" }}>
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
                  {result.failed === 0 ? "✅" : "⚠️"}
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
                    ? "All applications cancelled successfully!"
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
                {/* ── WARNING BANNER ── */}
                <div
                  style={{
                    padding: "1rem 1.1rem",
                    background: darkMode
                      ? "rgba(217,119,6,0.12)"
                      : "rgba(217,119,6,0.06)",
                    border: "2px solid rgba(217,119,6,0.4)",
                    borderRadius: 12,
                    marginBottom: "1.1rem",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.6rem",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: "#d97706",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    ⚠️ READ BEFORE PROCEEDING
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    {[
                      {
                        text: "This will PERMANENTLY mark the selected task(s) as CANCELLED. There is NO way to reopen them.",
                        bold: true,
                      },
                      {
                        text: "Use this ONLY when the application itself is being cancelled/withdrawn — not for transfers or endorsements.",
                        bold: false,
                      },
                      {
                        text: "The task will be removed from your active task list.",
                        bold: false,
                      },
                      {
                        text: "This action will be recorded in the audit log.",
                        bold: false,
                      },
                    ].map((item, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: "0.78rem",
                          color: item.bold ? "#d97706" : colors.textSecondary,
                          fontWeight: item.bold ? 700 : 400,
                          lineHeight: 1.55,
                        }}
                      >
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* DTN list */}
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    background: darkMode
                      ? "rgba(217,119,6,0.07)"
                      : "rgba(217,119,6,0.04)",
                    border: "1px solid rgba(217,119,6,0.2)",
                    borderRadius: 10,
                    marginBottom: "1.1rem",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.5rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#d97706",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    🚫 Applications to be Cancelled ({selectedCount})
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.4rem",
                      maxHeight: 90,
                      overflowY: "auto",
                    }}
                  >
                    {selectedDtns.map((dtn, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "0.2rem 0.6rem",
                          background: darkMode
                            ? "rgba(217,119,6,0.15)"
                            : "#fff",
                          border: "1px solid rgba(217,119,6,0.25)",
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
                    Reason for cancellation{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      padding: "0.6rem 0.8rem",
                      background: colors.inputBg,
                      border: `1px solid ${reason ? "#d97706" : colors.inputBorder}`,
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
                    marginBottom: "1.1rem",
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
                    placeholder="Add cancellation remarks..."
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
                      (e.currentTarget.style.borderColor = "#d97706")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = colors.inputBorder)
                    }
                  />
                </div>

                {/* Confirmation checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    padding: "0.85rem 1rem",
                    background: confirmed
                      ? darkMode
                        ? "rgba(217,119,6,0.1)"
                        : "rgba(217,119,6,0.05)"
                      : colors.badgeBg,
                    border: `1px solid ${confirmed ? "rgba(217,119,6,0.4)" : colors.cardBorder}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    marginBottom: "1.1rem",
                    transition: "all 0.2s",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    style={{
                      marginTop: 2,
                      accentColor: "#d97706",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: colors.textSecondary,
                      lineHeight: 1.55,
                    }}
                  >
                    I understand that this will{" "}
                    <strong style={{ color: "#d97706" }}>
                      permanently cancel
                    </strong>{" "}
                    the selected application(s) and this action{" "}
                    <strong style={{ color: "#d97706" }}>
                      cannot be undone
                    </strong>
                    .
                  </span>
                </label>

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
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || !reason || !confirmed}
                    style={{
                      padding: "0.6rem 1.5rem",
                      background:
                        loading || !reason || !confirmed
                          ? "rgba(217,119,6,0.35)"
                          : "linear-gradient(135deg,#f59e0b,#d97706)",
                      cursor:
                        loading || !reason || !confirmed
                          ? "not-allowed"
                          : "pointer",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      boxShadow:
                        loading || !reason || !confirmed
                          ? "none"
                          : "0 2px 10px rgba(217,119,6,0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && reason && confirmed)
                        e.currentTarget.style.boxShadow =
                          "0 4px 14px rgba(217,119,6,0.55)";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && reason && confirmed)
                        e.currentTarget.style.boxShadow =
                          "0 2px 10px rgba(217,119,6,0.4)";
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
                        Cancelling...
                      </>
                    ) : (
                      <>🚫 Yes, Cancel Application</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
