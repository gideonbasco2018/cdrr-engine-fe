// FILE: src/components/donation/ModalShell.jsx

/* ── Modal shell — copies the overlay/card pattern of UploadButton.jsx ── */
export default function ModalShell({ onClose, icon, title, subtitle, width = 420, footer, children, colors }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          width,
          maxWidth: "95%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: `0 0 0 1px rgba(76,175,80,0.2),
            0 0 30px 4px rgba(76,175,80,0.22),
            0 0 60px 10px rgba(76,175,80,0.12),
            0 16px 48px rgba(0,0,0,0.35)`,
        }}
      >
        {/* Sticky header — compact single row, icon inline with title */}
        <div
          style={{
            flexShrink: 0,
            padding: "0.85rem 1.5rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            position: "relative",
          }}
        >
          <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, textAlign: "center", color: colors.textPrimary }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", lineHeight: 1.3, textAlign: "center", color: colors.textTertiary }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              right: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: colors.textTertiary,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0.75rem 1.5rem" }}>
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div
            style={{
              flexShrink: 0,
              padding: "0.5rem 1.5rem",
              borderTop: `1px solid ${colors.cardBorder}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
