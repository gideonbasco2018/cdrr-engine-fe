// src/components/gmp/queue/AssignModal.jsx
import React, { useState } from "react";
import { FONT } from "../shared/constants";

const ACCENT = "#6366f1";
const MODAL_CSS = `
@keyframes gmpModalIn {
  from { opacity:0; transform:scale(0.95) translateY(10px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes gmpBackdropIn {
  from { opacity:0; }
  to   { opacity:1; }
}`;

export default function AssignModal({ record, onClose, onSuccess, colors, darkMode }) {
  const [evaluatorName, setEvaluatorName] = useState(record?.evaluator ?? "");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!evaluatorName.trim()) {
      setError("Please enter an evaluator name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSuccess(evaluatorName.trim(), remarks.trim());
    } catch (err) {
      setError("Failed to assign evaluator. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: FONT,
        animation: "gmpBackdropIn 0.2s ease forwards",
      }}>
      <style>{MODAL_CSS}</style>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? "#18191a" : "#ffffff", borderRadius: 16,
          width: "100%", maxWidth: 480, display: "flex", flexDirection: "column",
          overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.3rem" }}>👤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>
                Assign Evaluator
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: colors.textTertiary }}>
                DTN:{" "}
                <span style={{
                  fontFamily: "ui-monospace,monospace", fontWeight: 700, color: ACCENT,
                }}>
                  {record?.dtn || "—"}
                </span>
                {" · "}{record?.lto_company || ""}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
              fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Evaluator name input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{
              fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: colors.textTertiary,
            }}>
              👤 Evaluator Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              placeholder="Enter evaluator username…"
              style={{
                padding: "7px 10px", fontSize: "0.78rem", fontFamily: FONT,
                borderRadius: 7, border: `1px solid ${colors.cardBorder}`,
                background: darkMode ? "rgba(255,255,255,0.05)" : "#f8fafc",
                color: colors.textPrimary, outline: "none",
              }}
            />
          </div>
          {/* Remarks */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{
              fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: colors.textTertiary,
            }}>
              📝 Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add decking remarks…"
              rows={2}
              style={{
                padding: "9px 12px", fontSize: "0.8rem", fontFamily: FONT,
                borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
                background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
                color: colors.textPrimary, outline: "none", resize: "vertical",
                width: "100%", boxSizing: "border-box",
              }}
            />
          </div>
          {error && (
            <p style={{
              margin: 0, fontSize: "0.76rem", color: "#ef4444",
              background: "#fef2f2", padding: "8px 12px", borderRadius: 7,
              border: "1px solid #fecaca",
            }}>
              ⚠️ {error}
            </p>
          )}
        </div>
        {/* Footer */}
        <div style={{
          padding: "14px 22px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 8, flexShrink: 0,
        }}>
          <button onClick={onClose} disabled={saving}
            style={{
              padding: "8px 20px", fontSize: "0.8rem", fontWeight: 600, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
            }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !evaluatorName.trim()}
            style={{
              padding: "8px 24px", fontSize: "0.8rem", fontWeight: 700, fontFamily: FONT,
              borderRadius: 8, border: "none",
              background: (!saving && evaluatorName.trim()) ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0"),
              color: (!saving && evaluatorName.trim()) ? "#fff" : colors.textTertiary,
              cursor: (!saving && evaluatorName.trim()) ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: (!saving && evaluatorName.trim()) ? `0 2px 8px ${ACCENT}44` : "none",
              transition: "all 0.15s",
            }}>
            {saving ? "⏳ Assigning…" : "✅ Assign & Deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
