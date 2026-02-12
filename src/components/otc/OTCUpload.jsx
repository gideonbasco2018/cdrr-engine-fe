// FILE: src/components/otc/OTCUpload.jsx
import { useRef } from "react";

export default function OTCUpload({
  onFileSelect,
  onDownloadTemplate,
  uploading,
  colors,
  darkMode,
}) {
  const fileInputRef = useRef(null);

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {/* Download Template */}
      <button
        onClick={onDownloadTemplate}
        style={{
          padding: "0.625rem 1.25rem",
          background: darkMode ? "#1a1a1a" : "#fff",
          color: colors.textPrimary,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          fontSize: "0.875rem",
          fontWeight: "500",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = darkMode ? "#262626" : "#f9fafb";
          e.currentTarget.style.borderColor = "#4CAF50";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = darkMode ? "#1a1a1a" : "#fff";
          e.currentTarget.style.borderColor = colors.cardBorder;
        }}
      >
        <span>📄</span>
        <span>Download Template</span>
      </button>

      {/* Upload New Report */}
      <button
        onClick={() => !uploading && fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: "0.625rem 1.25rem",
          background: uploading ? "#2d6a4f" : "#10B981",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "0.875rem",
          fontWeight: "600",
          cursor: uploading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
          opacity: uploading ? 0.75 : 1,
          boxShadow: uploading ? "none" : "0 2px 8px rgba(16,185,129,0.35)",
        }}
        onMouseEnter={(e) => {
          if (!uploading) {
            e.currentTarget.style.background = "#059669";
            e.currentTarget.style.boxShadow =
              "0 4px 14px rgba(16,185,129,0.45)";
          }
        }}
        onMouseLeave={(e) => {
          if (!uploading) {
            e.currentTarget.style.background = "#10B981";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(16,185,129,0.35)";
          }
        }}
      >
        <span>{uploading ? "⏳" : "📤"}</span>
        <span>{uploading ? "Uploading..." : "Upload New Report"}</span>
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileSelect}
        style={{ display: "none" }}
      />
    </div>
  );
}
