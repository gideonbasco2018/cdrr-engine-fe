import { getTheme } from "../theme";

export function VDSection({ title, children, darkMode }) {
  const t = getTheme(darkMode);
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      {title && (
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: t.sectionTitle,
            textTransform: "uppercase",
            letterSpacing: "0.7px",
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: `1px solid ${t.sectionBorder}`,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
