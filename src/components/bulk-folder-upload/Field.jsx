// FILE: src/components/bulk-folder-upload/Field.jsx

function Field({ label, required, hint, colors, children }) {
  return (
    <label
      style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}
    >
      <span
        style={{ fontSize: 12.5, fontWeight: 600, color: colors.textPrimary }}
      >
        {label}
        {required && <span style={{ color: colors.danger }}> *</span>}
        {hint && (
          <span style={{ color: colors.textTertiary, fontWeight: 400 }}>
            {" "}
            — {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export default Field;
