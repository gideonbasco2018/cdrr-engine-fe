// FILE: src/components/donation/DonationExportColumnsModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";

/* ── "Export" — "Select columns to include" picker, copies the design/
   behavior of GMPExportColumnsModal.jsx (FGMP Queue). Donation's export
   is already client-side and already covers every filtered/sorted row
   (not just the current page), so only the column picker is added here —
   there's no separate backend export endpoint to keep in sync. ── */
export default function DonationExportColumnsModal({ columns, onClose, onConfirm, colors, darkMode }) {
  const [selected, setSelected] = useState(new Set(columns.map((c) => c.key)));

  const toggle = (key) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(columns.map((c) => c.key)));
  const selectNone = () => setSelected(new Set());

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: "1.5rem",
          width: 520,
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", color: colors.textPrimary }}>
            Select columns to include
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: colors.textTertiary }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.75rem", color: colors.textSecondary, margin: 0 }}>
          Fewer columns means a faster export. {selected.size} / {columns.length} selected.
        </p>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={selectAll}
            style={{
              fontSize: "0.7rem",
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            style={{
              fontSize: "0.7rem",
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Clear All
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px", paddingLeft: 4 }}>
            {columns.map((c) => (
              <label
                key={c.key}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: colors.textPrimary, cursor: "pointer" }}
              >
                <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: "0.5rem", borderTop: `1px solid ${colors.cardBorder}` }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
              fontSize: "0.78rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: selected.size === 0 ? colors.cardBorder : "linear-gradient(135deg,#10B981,#059669)",
              color: "#fff",
              cursor: selected.size === 0 ? "not-allowed" : "pointer",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            Export ({selected.size} columns)
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
