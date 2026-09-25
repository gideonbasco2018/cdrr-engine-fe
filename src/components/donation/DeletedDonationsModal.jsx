// FILE: src/components/donation/DeletedDonationsModal.jsx
import ModalShell from "./ModalShell";

/* ── "Deleted" — soft-deleted records with a Restore action ── */
export default function DeletedDonationsModal({ records, loading, restoringId, onRestore, onClose, colors, darkMode }) {
  return (
    <ModalShell
      onClose={onClose}
      icon="🗑️"
      title="Deleted Donations"
      width={560}
      colors={colors}
      footer={
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.4rem 1.1rem",
              borderRadius: 8,
              border: "none",
              background: "#4CAF50",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      }
    >
      {loading ? (
        <p style={{ textAlign: "center", color: colors.textTertiary, fontSize: "0.82rem", margin: "0 0 1.25rem" }}>
          Loading...
        </p>
      ) : records.length === 0 ? (
        <p style={{ textAlign: "center", color: colors.textTertiary, fontSize: "0.82rem", margin: "0 0 1.25rem" }}>
          No deleted records.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {records.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.6rem 0.85rem",
                fontSize: "0.78rem",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: colors.textPrimary }}>{r.letterDtn}</div>
                <div style={{ color: colors.textTertiary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.donor} — {r.productName}
                </div>
              </div>
              <button
                onClick={() => onRestore(r.id)}
                disabled={restoringId === r.id}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 7,
                  border: "none",
                  background: restoringId === r.id ? "#999" : "#4CAF50",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: restoringId === r.id ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >
                {restoringId === r.id ? "Restoring..." : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
