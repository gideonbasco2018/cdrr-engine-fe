// src/components/gmp/dashboard/GMPSectionCard.jsx
// Card chrome for FGMP Monitoring & Analytics — soft raised shadow, large
// rounded corners and a hairline under the header (the same look as CPR's
// Trend Overview card). Color lives in the chart/number content, not the card
// frame. `darkMode` only picks the shadow strength.
export const gmpCardShadow = (darkMode) =>
  darkMode
    ? "0 2px 6px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.25)"
    : "0 2px 8px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.05)";

export const isDarkUI = (ui) => ui.cardBg !== "#ffffff";

export function GMPSectionCard({ title, subtitle, icon, children, ui, action, darkMode }) {
  darkMode = darkMode ?? isDarkUI(ui);
  return (
    <div
      className="gmp-card"
      style={{
        background: ui.cardBg,
        border: darkMode ? `1px solid ${ui.cardBorder}` : "1px solid transparent",
        borderRadius: 18,
        boxShadow: gmpCardShadow(darkMode),
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 20px 14px",
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: ui.textPrimary, letterSpacing: "-0.005em" }}>
            {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
            {title}
          </p>
          {subtitle && (
            <p style={{ margin: "3px 0 0", fontSize: "0.72rem", color: ui.textMuted }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 20px", flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
