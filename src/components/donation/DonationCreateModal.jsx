// FILE: src/components/donation/DonationCreateModal.jsx
import { useState } from "react";
import ModalShell from "./ModalShell";
import { INFO_FIELDS, EMPTY_DONATION_FORM, LETTER_DTN_RE } from "./constants";

export default function DonationCreateModal({ onClose, onSave, saving, existingLetterDtns, colors, darkMode }) {
  const [form, setForm] = useState(EMPTY_DONATION_FORM);
  // Holds the message to show under Letter DTN — null means no error.
  // Letter DTN is optional; these only fire when a value IS typed in.
  const [dtnError, setDtnError] = useState(null);

  const handleSave = () => {
    const dtn = form.letterDtn?.trim();
    if (dtn) {
      if (!LETTER_DTN_RE.test(dtn)) {
        setDtnError("Letter DTN must be a 14-digit number.");
        return;
      }
      if (existingLetterDtns.has(dtn)) {
        setDtnError("This Letter DTN already exists in the database. Choose a different one.");
        return;
      }
    }
    setDtnError(null);
    onSave(form);
  };

  // Field design copied from EField/EDateField (WorkflowModal.jsx, FGMP) —
  // uppercase micro-label + a borderless, tinted input — minus that
  // component's outer card wrapper (padding/background/shadow), per request.
  const fieldLabelStyle = {
    fontSize: "0.58rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: colors.textTertiary,
  };
  const inputStyle = {
    width: "100%",
    padding: "0.35rem 0.5rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    background: darkMode ? "rgba(255,255,255,0.09)" : "#f6faf8",
    border: "none",
    borderRadius: 8,
    color: colors.textPrimary,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <ModalShell
      onClose={onClose}
      icon="➕"
      title="New Donation"
      width={820}
      colors={colors}
      footer={
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 8,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.78rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.4rem 1.1rem",
              borderRadius: 8,
              border: "none",
              background: saving ? "#999" : "#4CAF50",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Creating..." : "Create Donation"}
          </button>
        </div>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
          marginBottom: "0.5rem",
        }}
      >
        {INFO_FIELDS.filter((f) => f.key !== "status").map((f) => (
          <label
            key={f.key}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
              gridColumn:
                f.key === "productName" || f.key === "remarks" ? "1 / -1" : undefined,
            }}
          >
            <span style={fieldLabelStyle}>{f.label}</span>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => {
                setForm((p) => ({ ...p, [f.key]: e.target.value }));
                if (f.key === "letterDtn") setDtnError(null);
              }}
              style={{
                ...inputStyle,
                ...(f.key === "letterDtn" && dtnError
                  ? { border: "1px solid #ef4444", background: darkMode ? "rgba(239,68,68,0.08)" : "#fef2f2" }
                  : {}),
              }}
            />
            {f.key === "letterDtn" && dtnError && (
              <span style={{ fontSize: "0.68rem", fontWeight: 500, color: "#ef4444" }}>
                {dtnError}
              </span>
            )}
          </label>
        ))}
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
          }}
        >
          <span style={fieldLabelStyle}>Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="Approved">Approved</option>
            <option value="Disapproved">Disapproved</option>
            <option value="For Evaluation">For Evaluation</option>
          </select>
        </label>
      </div>
    </ModalShell>
  );
}
