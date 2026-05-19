import { getTheme } from "../theme";

export function SummaryCard({
  label,
  value,
  accent,
  fullWidth = false,
  darkMode,
}) {
  const t = getTheme(darkMode);
  const isNA = value === "N/A";
  return (
    <div
      style={{
        ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
        display: "flex",
        flexDirection: "column",
      }}
    >
      <label
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: t.labelColor,
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
          border: `1px solid ${t.fieldBorder}`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: 6,
          background: t.fieldBg,
          color: isNA ? t.fieldNA : t.fieldText,
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
