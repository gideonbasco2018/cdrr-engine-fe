// FILE: src/components/otc/OTCUploadProgress.jsx

export default function OTCUploadProgress({ message, colors, darkMode }) {
  if (!message) return null;

  return (
    <div
      style={{
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: "10px",
        padding: "0.875rem 1.25rem",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: "20px",
          height: "20px",
          border: "2px solid rgba(16,185,129,0.2)",
          borderTopColor: "#10B981",
          borderRadius: "50%",
          animation: "otc-spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
      <style>{`@keyframes otc-spin { to { transform: rotate(360deg); } }`}</style>

      <div>
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#10B981",
          }}
        >
          Uploading...
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: colors.textSecondary,
            marginTop: "2px",
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
