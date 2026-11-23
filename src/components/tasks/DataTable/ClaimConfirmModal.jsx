/* ================================================================== */
/*  ClaimConfirmModal                                                  */
/*  Confirm -> claiming -> result, all in one modal.                   */
/* ================================================================== */
export function ClaimConfirmModal({
  dtns,
  colors,
  claiming,
  result,
  onConfirm,
  onClose,
}) {
  const count = dtns.length;
  const plural = count > 1 ? "s" : "";
  const hasFailures = !!result && result.failures.length > 0;
  const allFailed = !!result && result.success === 0;

  const icon = !result ? "🙋" : allFailed ? "❌" : hasFailures ? "⚠️" : "✅";
  const title = !result
    ? `Claim ${count} task${plural}?`
    : allFailed
      ? "Claim failed"
      : hasFailures
        ? "Partially claimed"
        : `Task${plural} claimed`;
  const accent = !result
    ? "#f59e0b"
    : allFailed
      ? "#ef4444"
      : hasFailures
        ? "#f59e0b"
        : "#10b981";

  const primaryBtn = {
    flex: 1,
    padding: "0.65rem 1rem",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg,#f59e0b,#d97706)",
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: claiming ? "not-allowed" : "pointer",
    opacity: claiming ? 0.7 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  };

  return (
    <div
      onClick={() => !claiming && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderTop: `3px solid ${accent}`,
          borderRadius: 14,
          padding: "1.75rem",
          width: 400,
          maxWidth: "90%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            fontSize: "2rem",
            marginBottom: "0.6rem",
            textAlign: "center",
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            margin: "0 0 0.4rem",
            color: colors.textPrimary,
            fontSize: "1.05rem",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {title}
        </h3>

        {/* ── Confirm view ── */}
        {!result && (
          <>
            <p
              style={{
                margin: "0 0 1rem",
                color: colors.textSecondary,
                fontSize: "0.82rem",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Once claimed, the task{plural} will be assigned to you and moved
              to <strong>My Tasks</strong>.
            </p>

            <div
              style={{
                maxHeight: 150,
                overflowY: "auto",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 8,
                background: colors.badgeBg,
                padding: "0.4rem 0.6rem",
                marginBottom: "1.25rem",
              }}
            >
              {dtns.map((dtn, i) => (
                <div
                  key={`${dtn}-${i}`}
                  style={{
                    padding: "0.3rem 0",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    borderBottom:
                      i < dtns.length - 1
                        ? `1px solid ${colors.tableBorder}`
                        : "none",
                  }}
                >
                  {dtn}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                onClick={onClose}
                disabled={claiming}
                style={{
                  flex: 1,
                  padding: "0.65rem 1rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: claiming ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={claiming}
                style={primaryBtn}
              >
                {claiming ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 13,
                        height: 13,
                        border: "2px solid #ffffff40",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    Claiming...
                  </>
                ) : (
                  `Claim ${count} task${plural}`
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Result view ── */}
        {result && (
          <>
            <p
              style={{
                margin: "0 0 1rem",
                color: colors.textSecondary,
                fontSize: "0.82rem",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {allFailed
                ? "None of the selected tasks could be claimed."
                : hasFailures
                  ? `${result.success} of ${count} claimed. The rest could not be claimed.`
                  : `${result.success} task${result.success > 1 ? "s are" : " is"} now in your My Tasks.`}
            </p>

            {hasFailures && (
              <div
                style={{
                  maxHeight: 150,
                  overflowY: "auto",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.08)",
                  padding: "0.5rem 0.7rem",
                  marginBottom: "1.25rem",
                }}
              >
                {result.failures.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.25rem 0",
                      fontSize: "0.72rem",
                      color: "#ef4444",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex" }}>
              <button onClick={onClose} style={primaryBtn}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
