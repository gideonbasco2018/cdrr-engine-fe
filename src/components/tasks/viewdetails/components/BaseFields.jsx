import { SZ, COUNTRIES } from "../config/constants";

/* ── VDSection ─────────────────────────────────────────────────── */
export function VDSection({ title, children, colors }) {
  return (
    <div style={{ marginBottom: SZ.sectionMb }}>
      <h3
        style={{
          fontSize: SZ.sectionTitleFs,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: "0.6rem",
          paddingBottom: "0.3rem",
          borderBottom: `2px solid ${colors.cardBorder}`,
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ── FieldGrid ─────────────────────────────────────────────────── */
export function FieldGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: SZ.gridGap,
      }}
    >
      {children}
    </div>
  );
}

/* ── DisplayField ──────────────────────────────────────────────── */
export function DisplayField({ label, value, colors, fullWidth = false }) {
  const isNA = value === "N/A";
  return (
    <div
      style={
        fullWidth
          ? { gridColumn: "1 / -1", marginBottom: "0.4rem" }
          : { display: "flex", flexDirection: "column", gap: "0.2rem" }
      }
    >
      <label
        style={{
          fontSize: SZ.labelFs,
          fontWeight: "700",
          color: colors.textTertiary,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <div
        style={{
          padding: SZ.inputPad,
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: "5px",
          color: isNA ? colors.textTertiary : colors.textPrimary,
          fontSize: SZ.valueFs,
          minHeight: fullWidth ? "2.5rem" : SZ.inputMinH,
          whiteSpace: fullWidth ? "pre-wrap" : "normal",
          wordBreak: "break-word",
          display: "flex",
          alignItems: fullWidth ? "flex-start" : "center",
          fontStyle: isNA ? "italic" : "normal",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ── EditableField ─────────────────────────────────────────────── */
export function EditableField({
  label, fieldKey, value, originalValue, onChange,
  colors, fullWidth = false, multiline = false,
}) {
  const isDirty = String(value ?? "") !== String(originalValue ?? "");
  const isEmpty = value === "" || value === null || value === undefined;
  const baseStyle = {
    width: "100%",
    padding: SZ.inputPad,
    background: colors.inputBg,
    border: `1.5px solid ${isDirty ? "#f59e0b" : colors.inputBorder}`,
    borderRadius: "5px",
    color: isEmpty ? colors.textTertiary : colors.textPrimary,
    fontSize: SZ.valueFs,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? "2.5rem" : SZ.inputMinH,
  };
  return (
    <div
      style={
        fullWidth
          ? { gridColumn: "1 / -1", marginBottom: "0.4rem" }
          : { display: "flex", flexDirection: "column", gap: "0.2rem" }
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <label
          style={{
            fontSize: SZ.labelFs, fontWeight: "700",
            color: colors.textTertiary, letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
        {isDirty && (
          <span
            style={{
              fontSize: "0.55rem", fontWeight: "700", color: "#f59e0b",
              background: "rgba(245,158,11,0.12)",
              padding: "0.08rem 0.3rem", borderRadius: "3px",
            }}
          >
            ✎ EDITED
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          rows={2}
          style={baseStyle}
          onFocus={(e) => { e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3"; }}
          onBlur={(e) => { e.target.style.borderColor = isDirty ? "#f59e0b" : colors.inputBorder; }}
        />
      ) : (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          style={baseStyle}
          onFocus={(e) => { e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3"; }}
          onBlur={(e) => { e.target.style.borderColor = isDirty ? "#f59e0b" : colors.inputBorder; }}
        />
      )}
      {isDirty && (
        <div
          style={{
            fontSize: "0.6rem", color: colors.textTertiary, marginTop: "0.1rem",
            display: "flex", gap: "0.25rem", alignItems: "flex-start",
          }}
        >
          <span style={{ flexShrink: 0, color: "#ef4444" }}>Original:</span>
          <span style={{ fontStyle: "italic", wordBreak: "break-word" }}>
            {originalValue || <em>empty</em>}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── CountrySelect ─────────────────────────────────────────────── */
export function CountrySelect({
  label, fieldKey, value, originalValue, onChange,
  colors, fullWidth = false,
}) {
  const isDirty = String(value ?? "") !== String(originalValue ?? "");
  return (
    <div
      style={
        fullWidth
          ? { gridColumn: "1 / -1", marginBottom: "0.4rem" }
          : { display: "flex", flexDirection: "column", gap: "0.2rem" }
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <label
          style={{
            fontSize: SZ.labelFs, fontWeight: "700",
            color: colors.textTertiary, letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
        {isDirty && (
          <span
            style={{
              fontSize: "0.55rem", fontWeight: "700", color: "#f59e0b",
              background: "rgba(245,158,11,0.12)",
              padding: "0.08rem 0.3rem", borderRadius: "3px",
            }}
          >
            ✎ EDITED
          </span>
        )}
      </div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        style={{
          width: "100%", padding: SZ.inputPad, background: colors.inputBg,
          border: `1.5px solid ${isDirty ? "#f59e0b" : colors.inputBorder}`,
          borderRadius: "5px",
          color: value ? colors.textPrimary : colors.textTertiary,
          fontSize: SZ.valueFs, outline: "none", cursor: "pointer",
          minHeight: SZ.inputMinH,
        }}
        onFocus={(e) => { e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3"; }}
        onBlur={(e) => { e.target.style.borderColor = isDirty ? "#f59e0b" : colors.inputBorder; }}
      >
        <option value="">— Select Country —</option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {isDirty && (
        <div
          style={{
            fontSize: "0.6rem", color: colors.textTertiary,
            marginTop: "0.1rem", display: "flex", gap: "0.25rem",
          }}
        >
          <span style={{ flexShrink: 0, color: "#ef4444" }}>Original:</span>
          <span style={{ fontStyle: "italic" }}>
            {originalValue || <em>empty</em>}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── SummaryCard ───────────────────────────────────────────────── */
export function SummaryCard({ icon, label, value, accent, colors }) {
  return (
    <div
      style={{
        padding: "0.6rem 0.75rem", background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "6px", display: "flex", flexDirection: "column", gap: "0.2rem",
      }}
    >
      <span
        style={{
          fontSize: "0.6rem", fontWeight: "700", color: colors.textTertiary,
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}
      >
        {icon} {label}
      </span>
      <span
        style={{
          fontSize: "0.78rem", fontWeight: "600",
          color: value === "N/A" ? colors.textTertiary : colors.textPrimary,
          fontStyle: value === "N/A" ? "italic" : "normal", wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── StepIndicator ─────────────────────────────────────────────── */
export function StepIndicator({ currentStep, steps, colors }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 0.25rem" }}>
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}
          >
            <div
              style={{
                width: "26px", height: "26px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", fontWeight: "700", flexShrink: 0,
                transition: "all 0.3s ease",
                background: isCompleted ? "#10b981" : isActive ? "#2196F3" : colors.inputBg,
                border: isCompleted ? "2px solid #10b981" : isActive ? "2px solid #2196F3" : `2px solid ${colors.cardBorder}`,
                color: isCompleted || isActive ? "#fff" : colors.textTertiary,
                boxShadow: isActive ? "0 0 0 3px rgba(33,150,243,0.15)" : "none",
              }}
            >
              {isCompleted ? "✓" : stepNum}
            </div>
            <div
              style={{
                position: "absolute", marginTop: "2.2rem", fontSize: "0.58rem",
                fontWeight: isActive ? "700" : "500",
                color: isActive ? "#2196F3" : isCompleted ? "#10b981" : colors.textTertiary,
                whiteSpace: "nowrap", transform: "translateX(-50%)", marginLeft: "13px",
              }}
            >
              {step}
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1, height: "2px",
                  background: isCompleted ? "#10b981" : colors.cardBorder,
                  margin: "0 3px", transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
