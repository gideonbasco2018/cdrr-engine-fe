// FILE: src/components/groupManagement/ConfirmModal.jsx

function ConfirmModal({ confirmModal, setConfirmModal, colors }) {
  if (!confirmModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: colors.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={() => setConfirmModal(null)}
    >
      <div
        style={{
          background: colors.modalBg,
          border: `1px solid ${colors.modalBorder}`,
          borderRadius: "14px",
          padding: "2rem",
          width: "380px",
          maxWidth: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
          {confirmModal.type === "delete-group" ? "🗑️" : "👤"}
        </div>
        <h3
          style={{
            margin: "0 0 0.5rem",
            color: colors.textPrimary,
            fontSize: "1.1rem",
          }}
        >
          {confirmModal.title}
        </h3>
        <p
          style={{
            margin: "0 0 1.5rem",
            color: colors.textSecondary,
            fontSize: "0.88rem",
            lineHeight: 1.5,
          }}
        >
          {confirmModal.message}
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => setConfirmModal(null)}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: "8px",
              border: `1px solid ${colors.modalBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirmModal.onConfirm}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: "8px",
              border: "none",
              background: colors.btnDanger,
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
