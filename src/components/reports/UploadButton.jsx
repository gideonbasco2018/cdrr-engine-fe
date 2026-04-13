import { useRef, useState } from "react";

function UploadButton({ onFileSelect, onDownloadTemplate, uploading, colors }) {
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null); // file waiting for upload confirmation
  const [confirmDownload, setConfirmDownload] = useState(false); // download template confirmation

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // ── File picked → show confirmation instead of uploading immediately ──
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    // Reset input so same file can be re-selected if user cancels
    e.target.value = "";
  };

  const handleConfirm = () => {
    if (!pendingFile) return;
    // Wrap in a synthetic-like event object that onFileSelect expects
    onFileSelect({ target: { files: [pendingFile] } });
    setPendingFile(null);
  };

  const handleCancel = () => {
    setPendingFile(null);
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ display: "flex", gap: "0.75rem" }}>
        {/* Download Template */}
        <button
          onClick={() => setConfirmDownload(true)}
          style={{
            padding: ".7rem 1rem",
            background: colors.buttonSecondaryBg,
            border: `1px solid ${colors.buttonSecondaryBorder}`,
            borderRadius: "8px",
            color: colors.textPrimary,
            fontSize: "0.75rem",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.buttonSecondaryBgHover;
            e.currentTarget.style.borderColor =
              colors.buttonSecondaryBorderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.buttonSecondaryBg;
            e.currentTarget.style.borderColor = colors.buttonSecondaryBorder;
          }}
        >
          <span>📥</span>
          Download Template
        </button>

        {/* Upload */}
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          style={{
            padding: "0.7rem 1rem",
            background: uploading ? "#999" : "#4CAF50",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "0.75rem",
            fontWeight: "500",
            cursor: uploading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s",
            opacity: uploading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = "#45a049";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = "#4CAF50";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          <span>{uploading ? "⏳" : "📤"}</span>
          {uploading ? "Uploading..." : "Upload New Report"}
        </button>
      </div>

      {/* ── Download Template Confirmation Modal ── */}
      {confirmDownload && (
        <div
          onClick={() => setConfirmDownload(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 16,
              padding: "2rem",
              width: 400,
              maxWidth: "90%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
              animation: "slideInScale 0.25s ease",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              📥
            </div>

            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.05rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Download Template?
            </h3>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              This will download the official Excel upload template.
            </p>

            {/* File info card */}
            <div
              style={{
                background: colors.badgeBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.9rem 1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
              }}
            >
              <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>📊</span>
              <div>
                <div
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  upload_template.xlsx
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: colors.textTertiary,
                    marginTop: "0.2rem",
                  }}
                >
                  Excel Workbook · FDA CDRR Upload Template
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setConfirmDownload(false)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmDownload(false);
                  onDownloadTemplate();
                }}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#2196F3",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(33,150,243,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1976d2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#2196F3")
                }
              >
                <span>📥</span> Yes, Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Confirmation Modal ── */}
      {pendingFile && (
        <div
          onClick={handleCancel}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 16,
              padding: "2rem",
              width: 420,
              maxWidth: "90%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
              animation: "slideInScale 0.25s ease",
            }}
          >
            {/* Icon */}
            <div
              style={{
                fontSize: "2rem",
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              📤
            </div>

            {/* Title */}
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.05rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Confirm Upload
            </h3>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              Are you sure you want to upload this file?
            </p>

            {/* File info card */}
            <div
              style={{
                background: colors.badgeBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.9rem 1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
              }}
            >
              <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>📊</span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {pendingFile.name}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: colors.textTertiary,
                    marginTop: "0.2rem",
                  }}
                >
                  {formatSize(pendingFile.size)} &nbsp;·&nbsp;{" "}
                  {pendingFile.name.endsWith(".xlsx")
                    ? "Excel Workbook (.xlsx)"
                    : "Excel 97-2003 (.xls)"}
                </div>
              </div>
            </div>

            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textTertiary,
                fontSize: "0.8rem",
                textAlign: "center",
              }}
            >
              This will process and import all records from the file.
            </p>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#4CAF50",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(76,175,80,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#45a049")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#4CAF50")
                }
              >
                <span>📤</span> Yes, Upload
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInScale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>
  );
}

export default UploadButton;
