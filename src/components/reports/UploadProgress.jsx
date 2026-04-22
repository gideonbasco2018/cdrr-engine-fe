function UploadProgress({ message, colors }) {
  const text = typeof message === "object" ? message?.message : message;
  const percent = typeof message === "object" ? (message?.percent ?? 0) : null;

  if (!text) return null;

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: percent !== null ? "0.75rem" : 0,
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            border: "3px solid #4CAF50",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            flexShrink: 0,
          }}
        />
        <span
          style={{ color: colors.textPrimary, fontSize: "0.88rem", flex: 1 }}
        >
          {text}
        </span>
        {percent !== null && (
          <span
            style={{
              fontSize: "0.88rem",
              fontWeight: "700",
              color: "#4CAF50",
              fontFamily: "monospace",
              minWidth: "42px",
              textAlign: "right",
            }}
          >
            {percent}%
          </span>
        )}
      </div>

      {percent !== null && (
        <div
          style={{
            height: "6px",
            background: colors.cardBorder,
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percent}%`,
              background: percent === 100 ? "#10B981" : "#4CAF50",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
export default UploadProgress;
