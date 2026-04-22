function UploadErrorModal({ failedRecords, onClose, colors, darkMode }) {
  if (!failedRecords || failedRecords.length === 0) return null;

  const handleDownload = () => {
    const headers = ["Row #", "DTN", "Brand Name", "Reason"];
    const rows = failedRecords.map((r) => [
      r.row_number ?? "-",
      r.dtn ?? "-",
      r.brand_name ?? "-",
      r.reason ?? "-",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upload_errors_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          width: "min(720px, 95vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>❌</span>
            <h2
              style={{
                fontSize: "0.95rem",
                fontWeight: "600",
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Failed Upload Records
            </h2>
            <span
              style={{
                background: "#ef4444",
                color: "#fff",
                borderRadius: "10px",
                padding: "2px 8px",
                fontSize: "0.7rem",
                fontWeight: "700",
              }}
            >
              {failedRecords.length} failed
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleDownload}
              style={{
                padding: "0.4rem 0.85rem",
                background: "#10B981",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#059669")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#10B981")
              }
            >
              📥 Download CSV
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "0.4rem 0.85rem",
                background: "transparent",
                color: colors.textSecondary,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "6px",
                fontSize: "0.75rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode
                  ? "#1f1f1f"
                  : "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div
          style={{
            padding: "0.65rem 1.5rem",
            background: darkMode ? "#1a0000" : "#fff5f5",
            borderBottom: `1px solid ${colors.cardBorder}`,
            fontSize: "0.75rem",
            color: "#ef4444",
            flexShrink: 0,
          }}
        >
          ⚠️ The following rows failed to upload. Fix the errors in your Excel
          file and re-upload.
        </div>

        {/* Table */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.78rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: darkMode ? "#1a1a1a" : "#f5f5f5",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                {["Row #", "DTN", "Brand Name", "Reason"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.6rem 1rem",
                      textAlign: "left",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      borderBottom: `1px solid ${colors.cardBorder}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {failedRecords.map((record, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: `1px solid ${colors.cardBorder}`,
                    background:
                      i % 2 === 0
                        ? "transparent"
                        : darkMode
                          ? "#0d0d0d"
                          : "#fafafa",
                  }}
                >
                  <td
                    style={{
                      padding: "0.55rem 1rem",
                      color: colors.textTertiary,
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {record.row_number ?? "-"}
                  </td>
                  <td
                    style={{
                      padding: "0.55rem 1rem",
                      color: "#2196F3",
                      fontWeight: "600",
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {record.dtn ?? "-"}
                  </td>
                  <td
                    style={{
                      padding: "0.55rem 1rem",
                      color: colors.textPrimary,
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {record.brand_name ?? "-"}
                  </td>
                  <td
                    style={{
                      padding: "0.55rem 1rem",
                      color: "#ef4444",
                      maxWidth: "260px",
                    }}
                  >
                    <span
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {record.reason ?? "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
            Showing {failedRecords.length} failed record
            {failedRecords.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "0.4rem 1.25rem",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#dc2626")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ef4444")}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadErrorModal;
