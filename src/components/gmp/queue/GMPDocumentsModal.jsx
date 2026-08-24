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
      padding: 16, fontFamily: FONT, animation: "gmpBackdropIn 0.2s ease forwards",
    }}>
      <style>{MODAL_CSS}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: darkMode ? "#18191a" : "#ffffff", borderRadius: 16,
        width: "100%", maxWidth: 640, maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: `${ACCENT}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", flexShrink: 0,
          }}>
            📎
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary }}>
              Documents
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "0.76rem", color: colors.textTertiary,
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              DTN:{" "}
              <span style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: ACCENT }}>
                {record.dtn || "—"}
              </span>
              {record.name_of_establishment && <span>· {record.name_of_establishment}</span>}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textTertiary, cursor: "pointer",
            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            ✕
          </button>
        </div>

        {/* Body — shared with WorkflowModal.jsx's Step 2 (ApplicationDocumentsPanel) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <ApplicationDocumentsPanel
            dtn={record.dtn}
            dbEntryType="GMP"
            mainDbId={record.id}
            colors={colors}
            darkMode={darkMode}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          flexShrink: 0, background: darkMode ? "#18191a" : "#fff",
        }}>
          <button onClick={onClose} style={{
            padding: "7px 22px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT,
            borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textPrimary, cursor: "pointer",
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
