// FILE: src/components/donation/AdvancedFilterModal.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ADV_FIELDS } from "./constants";

const advInputSt = (colors) => ({
  width: "100%",
  padding: "7px 10px",
  fontSize: "0.76rem",
  borderRadius: 7,
  border: `1px solid ${colors.cardBorder}`,
  background: colors.inputBg,
  color: colors.textPrimary,
  outline: "none",
  boxSizing: "border-box",
});
const advLabelSt = (colors) => ({
  fontSize: "0.62rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: colors.textTertiary,
  marginBottom: 4,
  display: "block",
});

export default function AdvancedFilterModal({ open, draft, onChange, onApply, onCancel, onReset, colors, darkMode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const set = (key, val) => onChange((prev) => ({ ...prev, [key]: val }));

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "64px 20px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 920,
          background: darkMode ? "#1e2022" : "#ffffff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: colors.textPrimary }}>
            🔍 Filters
          </span>
          <button
            onClick={onCancel}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textTertiary,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", maxHeight: "70vh", overflowY: "auto" }}>
          <div
            style={{
              fontSize: "0.62rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: colors.textTertiary,
              marginBottom: 12,
            }}
          >
            Filter by Column
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {ADV_FIELDS.map((f) => (
              <div key={f.key}>
                <label style={advLabelSt(colors)}>{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={draft[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    style={{ ...advInputSt(colors), cursor: "pointer" }}
                  >
                    <option value="all">All {f.label}</option>
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : f.type === "date" ? (
                  <input
                    type="date"
                    value={draft[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    style={{ ...advInputSt(colors), cursor: "pointer" }}
                  />
                ) : (
                  <input
                    type="text"
                    value={draft[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                    style={advInputSt(colors)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${colors.cardBorder}`,
            background: darkMode ? "rgba(255,255,255,0.02)" : "#fafbfc",
          }}
        >
          <button
            onClick={onReset}
            style={{
              padding: "8px 14px",
              fontSize: "0.74rem",
              fontWeight: 600,
              borderRadius: 8,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textTertiary,
              cursor: "pointer",
            }}
          >
            Reset
          </button>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={onCancel}
              style={{
                padding: "9px 16px",
                fontSize: "0.78rem",
                fontWeight: 600,
                borderRadius: 9,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textPrimary,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              style={{
                padding: "9px 20px",
                fontSize: "0.8rem",
                fontWeight: 700,
                borderRadius: 9,
                border: "none",
                background: "linear-gradient(135deg,#4CAF50,#43a047)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 3px 10px rgba(76,175,80,0.4)",
              }}
            >
              🔍 Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
