// src/components/gmp/dashboard/GMPSectionCard.jsx
// FGMP's own flat card chrome for Monitoring & Analytics — plain 1px border,
// no accent stripe (a colored rail on every card is a templated-AI-design
// tell, and reads as noise once there are a dozen of these on one page).
// Color lives in the chart/number content, not the card frame.
export function GMPSectionCard({ title, subtitle, icon, children, ui, action }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 11,
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "13px 16px 11px",
          borderBottom: `1px solid ${ui.cardBorder}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "0.86rem", fontWeight: 700, color: ui.textPrimary, letterSpacing: "-0.005em" }}>
            {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
            {title}
          </p>
          {subtitle && (
            <p style={{ margin: "2px 0 0", fontSize: "0.71rem", color: ui.textMuted }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: "16px", flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
