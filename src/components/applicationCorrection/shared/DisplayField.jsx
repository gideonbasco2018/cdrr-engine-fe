export function DisplayField({ label, value, fullWidth = false, darkMode }) {
  const isNA = value === "N/A";
  const labelColor = darkMode ? "#7A736C" : "#6B6560";
  const fieldBg = darkMode ? "#111111" : "#F5F3EE";
  const fieldBorder = darkMode ? "rgba(255,255,255,0.07)" : "#D6D1CB";
  const textColor = isNA
    ? darkMode
      ? "#3a3530"
      : "#9E9890"
    : darkMode
      ? "#F0EDE8"
      : "#1C1A17";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
      }}
    >
      <label
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: labelColor,
          marginBottom: 3,
        }}
      >
        {label}
      </label>
      <div
        style={{
          fontFamily: "inherit",
          fontSize: 13,
          padding: "7px 10px",
          border: `1px solid ${fieldBorder}`,
          borderRadius: 6,
          background: fieldBg,
          color: textColor,
          minHeight: 34,
          wordBreak: "break-word",
          fontStyle: isNA ? "italic" : "normal",
          display: "flex",
          alignItems: "center",
        }}
      >
        {value}
      </div>
    </div>
  );
}
