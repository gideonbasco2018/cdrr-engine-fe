// src/components/fda/FDADeleteConfirmModal.jsx
function FDADeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  drugName,
  darkMode,
  loading,
}) {
  const colors = darkMode
    ? {
        cardBg: "#0f0f0f",
        textPrimary: "#fff",
        textSecondary: "#999",
        inputBorder: "#2a2a2a",
        tableBorder: "#1a1a1a",
      }
    : {
        cardBg: "#ffffff",
        textPrimary: "#000",
        textSecondary: "#666",
        inputBorder: "#e5e5e5",
        tableBorder: "#e5e5e5",
      };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          animation: "fadeIn 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: colors.cardBg,
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          zIndex: 9999,
          maxWidth: "500px",
          width: "90%",
          animation: "scaleIn 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "2rem" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(244, 67, 54, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🗑️</span>
          </div>

          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: colors.textPrimary,
              textAlign: "center",
              marginBottom: "0.5rem",
            }}
          >
            Delete Drug Registration?
          </h2>

          <p
            style={{
              fontSize: "0.95rem",
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: "2rem",
            }}
          >
            Are you sure you want to delete <strong>"{drugName}"</strong>? This
            action cannot be undone.
          </p>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "0.75rem",
                background: "transparent",
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "8px",
                color: colors.textPrimary,
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: "0.75rem",
                background: loading ? "#999" : "#f44336",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  );
}

export default FDADeleteConfirmModal;
