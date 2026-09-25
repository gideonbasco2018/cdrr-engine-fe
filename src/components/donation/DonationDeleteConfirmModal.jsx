// FILE: src/components/donation/DonationDeleteConfirmModal.jsx
import ModalShell from "./ModalShell";

/* ── "Delete" confirm — soft delete only; the row can be brought back
   later via the backend's restore endpoint, it just isn't reachable from
   this screen right now. ── */
export default function DonationDeleteConfirmModal({ record, onClose, onConfirm, deleting, colors }) {
  return (
    <ModalShell
      onClose={onClose}
      icon="🗑️"
      title="Delete this donation?"
      width={420}
      colors={colors}
      footer={
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 8,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.78rem",
              cursor: deleting ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              padding: "0.4rem 1.1rem",
              borderRadius: 8,
              border: "none",
              background: deleting ? "#999" : "#ef4444",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      }
    >
      <p style={{ textAlign: "center", color: colors.textSecondary, fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
        <strong style={{ color: colors.textPrimary }}>{record.letterDtn}</strong>
        {record.donor && record.donor !== "—" ? ` — ${record.donor}` : ""} will be removed from this
        list. This is a soft delete — the record isn't erased and can be restored later.
      </p>
    </ModalShell>
  );
}
