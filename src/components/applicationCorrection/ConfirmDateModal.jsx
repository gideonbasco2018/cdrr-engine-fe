import { useState, useEffect } from "react";

/** Normalize a date value to "YYYY-MM-DD" for <input type="date"> */
function toInputDate(value) {
  if (!value) return "";
  // If it already starts with YYYY-MM-DD, take it directly (avoids timezone shifts)
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(value);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ConfirmDateModal({
  open,
  value,
  onConfirm,
  onCancel,
  darkMode,
}) {
  const [date, setDate] = useState(toInputDate(value));

  useEffect(() => {
    if (open) setDate(toInputDate(value));
  }, [open, value]);

  if (!open) return null;

  const c = darkMode
    ? {
        bg: "#1C1A17",
        border: "#2e2e2e",
        text: "#E8E4DF",
        muted: "#9a958f",
        input: "#111",
      }
    : {
        bg: "#fff",
        border: "#d9d4cc",
        text: "#1C1A17",
        muted: "#6b665f",
        input: "#F7F5F2",
      };

  const original = toInputDate(value);
  const changed = date !== original;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "100%",
          padding: 24,
          borderRadius: 12,
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.text,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>
          Confirm Date Received (Central)
        </h3>
        <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.5 }}>
          Are you sure about the <b>Date Received from Central</b>? The saved
          data may be outdated, so you can update it below if needed.
        </p>

        <label style={{ fontSize: 13, color: c.muted }}>
          Date Received Central
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 8,
            background: c.input,
            color: c.text,
            border: `1px solid ${c.border}`,
            fontSize: 14,
            boxSizing: "border-box",
            colorScheme: darkMode ? "dark" : "light",
          }}
        />

        {changed && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#E0A030" }}>
            Original: {original || "N/A"} → will be changed to {date || "N/A"}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 20,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              background: "transparent",
              color: c.text,
              border: `1px solid ${c.border}`,
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            disabled={!date}
            onClick={() => onConfirm(date)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              cursor: date ? "pointer" : "not-allowed",
              background: "#4A90D9",
              color: "#fff",
              border: "none",
              opacity: date ? 1 : 0.5,
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Yes, Continue
          </button>
        </div>
      </div>
    </div>
  );
}
