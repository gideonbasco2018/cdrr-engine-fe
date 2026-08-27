// src/components/gmp/queue/GMPDocumentsModal.jsx
// Standalone "Documents" action from the GMP Queue's row menu — same
// upload/view logic as WorkflowModal.jsx's Step 2 (StepDocsGMP), just
// reachable directly from a Queue row instead of only via the 4-step
// workflow, so files can be viewed/added without opening the full modal.
import React from "react";
import { FONT } from "../shared/constants";
import ApplicationDocumentsPanel from "../shared/ApplicationDocumentsPanel";

const ACCENT = "#10b981";
const MODAL_CSS = `
@keyframes gmpModalIn {
  from { opacity:0; transform:scale(0.95) translateY(10px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes gmpBackdropIn {
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes gmpSpin { to { transform: rotate(360deg); } }
@keyframes spin { to { transform: rotate(360deg); } }
`;

export default function GMPDocumentsModal({ record, onClose, colors, darkMode }) {
  if (!record) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(4px)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: FONT, animation: "gmpBackdropIn 0.2s ease forwards",
    }}>
      <style>{MODAL_CSS}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: darkMode ? "#18191a" : "#ffffff", borderRadius: 14,
        width: "90%", maxWidth: 1240, height: "94vh", maxHeight: "94vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}>
        {/* Header — slim, single row; the ✕ closes the modal (no separate footer) */}
        <div style={{
          padding: "8px 14px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>📎</span>
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: colors.textPrimary, flexShrink: 0 }}>
            Documents
          </h2>
          <span style={{ fontSize: "0.75rem", color: colors.textTertiary,
            display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            DTN:{" "}
            <span style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: ACCENT }}>
              {record.dtn || "—"}
            </span>
            {record.name_of_establishment && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>· {record.name_of_establishment}</span>}
          </span>
          <button onClick={onClose} style={{
            marginLeft: "auto", width: 30, height: 30, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textTertiary, cursor: "pointer",
            fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            ✕
          </button>
        </div>

        {/* Body — shared with WorkflowModal.jsx's Step 2 (ApplicationDocumentsPanel) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          <ApplicationDocumentsPanel
            dtn={record.dtn}
            dbEntryType="FGMP"
            mainDbId={record.id}
            colors={colors}
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
}
