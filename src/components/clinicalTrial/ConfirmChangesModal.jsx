// FILE: src/components/clinicalTrial/ConfirmChangesModal.jsx

function ConfirmChangesModal({ changes, isSaving, onBack, onConfirm, colors }) {
  if (!changes) return null;

  return (
    <div
      onClick={onBack}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
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
          maxWidth: "560px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.9rem 1.1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Confirm Changes
          </h3>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.68rem",
              color: colors.textTertiary,
            }}
          >
            Review the {changes.length} field{changes.length > 1 ? "s" : ""}{" "}
            you're about to update.
          </p>
        </div>

        <div
          style={{
            padding: "0.75rem 1.1rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          {changes.map((change) => (
            <div
              key={change.key}
              style={{
                borderBottom: `1px solid ${colors.cardBorder}`,
                paddingBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: colors.textTertiary,
                  marginBottom: "0.3rem",
                }}
              >
                {change.label}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  fontSize: "0.7rem",
                }}
              >
                <span
                  style={{
                    color: "#ef4444",
                    textDecoration: "line-through",
                    flex: 1,
                    wordBreak: "break-word",
                  }}
                >
                  {change.oldValue}
                </span>
                <span style={{ color: colors.textTertiary }}>→</span>
                <span
                  style={{
                    color: "#10B981",
                    fontWeight: 600,
                    flex: 1,
                    wordBreak: "break-word",
                  }}
                >
                  {change.newValue}
                </span>
              </div>
            </div>
          ))}
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
            onClick={onBack}
            disabled={isSaving}
            style={{
              padding: "0.4rem 0.9rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              color: colors.textPrimary,
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            style={{
              padding: "0.4rem 0.9rem",
              background: "linear-gradient(135deg,#10B981,#059669)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: isSaving ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? "Saving…" : "Confirm & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmChangesModal;
