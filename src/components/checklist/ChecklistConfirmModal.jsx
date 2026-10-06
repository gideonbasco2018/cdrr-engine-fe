// FILE: src/components/checklist/ChecklistConfirmModal.jsx
import { useEffect } from "react";
import ModalShell from "../donation/ModalShell";

/* ── Small confirm modal for Remove (one DTN) and Delete (whole checklist).
   Cancel has the focus when it opens, so a stray Enter (e.g. from the
   barcode reader) can only cancel — never confirm. Esc also cancels. ── */
export default function ChecklistConfirmModal({
  icon,
  title,
  children,
  confirmLabel,
  busyLabel,
  busy,
  onClose,
  onConfirm,
  colors,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <ModalShell
      onClose={busy ? () => {} : onClose}
      icon={icon}
      title={title}
      width={400}
      colors={colors}
      footer={
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            autoFocus
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 8,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.78rem",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: "0.4rem 1.1rem",
              borderRadius: 8,
              border: "none",
              background: busy ? "#999" : "#ef4444",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      }
    >
      <div style={{ textAlign: "center", color: colors.textSecondary, fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
        {children}
      </div>
    </ModalShell>
  );
}
