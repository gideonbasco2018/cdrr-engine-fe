import { neuCardBg, neuShadow } from "./analyticsHelpers";

export function SectionCard({
  title,
  subtitle,
  icon,
  children,
  ui,
  darkMode,
  action,
}) {
  return (
    <div
      style={{
        background: neuCardBg(darkMode),
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: neuShadow(darkMode),
      }}
    >
      <div
        style={{
          padding: "14px 18px 12px",
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
            {title}
          </p>
          {subtitle && (
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}
