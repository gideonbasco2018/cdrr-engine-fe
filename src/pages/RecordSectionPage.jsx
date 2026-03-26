import { useState } from "react";

const FDA_URL = "/fda-portal/login.php";
const FDA_DISPLAY_URL = "http://ecprdrugs.fda.gov.ph/login.php";

function getColorScheme(darkMode) {
  if (darkMode) {
    return {
      pageBg: "#0f0f0f",
      textPrimary: "#f5f5f5",
      textTertiary: "#666",
      modalHeader: "#1a1a1a",
      modalBorder: "#2a2a2a",
      inputBg: "#1e1e1e",
      inputBorder: "#333",
      textSecondary: "#a0a0a0",
    };
  }
  return {
    pageBg: "#f4f6fb",
    textPrimary: "#1a1f36",
    textTertiary: "#9ca3af",
    modalHeader: "#f4f6fb",
    modalBorder: "#e8ecf4",
    inputBg: "#f9fafb",
    inputBorder: "#e5e7eb",
    textSecondary: "#6b7280",
  };
}

export default function RecordSectionPage({ darkMode = true }) {
  const colors = getColorScheme(darkMode);
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  return (
    <div
      style={{
        background: colors.pageBg,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Header Bar ── */}
      <div
        style={{
          background: colors.modalHeader,
          borderBottom: `1px solid ${colors.modalBorder}`,
          padding: "0.65rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: colors.textPrimary,
            whiteSpace: "nowrap",
          }}
        >
          🌐 FDA eCPR Portal
        </span>

        {/* URL Bar */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 8,
            padding: "0.35rem 0.75rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#10b981" }}>🔒</span>
          <span
            style={{
              fontSize: "0.82rem",
              color: colors.textSecondary,
              fontFamily: "monospace",
              userSelect: "all",
            }}
          >
            {FDA_DISPLAY_URL}
          </span>
        </div>

        <a
          href={FDA_DISPLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.4rem 0.85rem",
            background: "linear-gradient(135deg,#2196F3,#1565c0)",
            color: "#fff",
            borderRadius: 8,
            fontSize: "0.78rem",
            fontWeight: 600,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(33,150,243,.3)",
          }}
        >
          ↗ Open Tab
        </a>
      </div>

      {/* ── iframe Area ── */}
      <div style={{ flex: 1, position: "relative", background: "#fff" }}>
        {loading && !iframeError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: darkMode ? "#161616" : "#f4f6fb",
              gap: "1rem",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid #2196F3",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.85rem", color: colors.textTertiary }}>
              Loading FDA eCPR Portal...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {iframeError ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "1rem",
              background: darkMode ? "#161616" : "#f4f6fb",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "3rem" }}>🚫</span>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Site cannot be embedded
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: colors.textTertiary,
                margin: 0,
                maxWidth: 400,
              }}
            >
              The FDA eCPR portal blocked iframe embedding (X-Frame-Options).
              You can still access it directly.
            </p>
            <a
              href={FDA_DISPLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: "0.5rem",
                padding: "0.6rem 1.5rem",
                background: "linear-gradient(135deg,#2196F3,#1565c0)",
                color: "#fff",
                borderRadius: 10,
                fontSize: "0.88rem",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(33,150,243,.35)",
              }}
            >
              ↗ Open FDA eCPR Portal
            </a>
          </div>
        ) : (
          <iframe
            src={FDA_URL}
            title="FDA eCPR Portal"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setIframeError(true);
            }}
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>
    </div>
  );
}
