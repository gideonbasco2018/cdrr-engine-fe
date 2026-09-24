// FILE: src/components/clinicalTrial/UploadPreviewModal.jsx

/* ── UploadPreviewModal — shows a preview of parsed Excel rows before the
     user commits to the actual upload. Lists rows that will be inserted
     and any rows that failed validation, side by side. ── */
function UploadPreviewModal({
  preview,
  fileName,
  isUploading,
  onConfirm,
  onCancel,
  colors,
  darkMode,
}) {
  if (!preview) return null;

  const { total_rows, valid_count, error_count, valid_rows, errors } = preview;

  return (
    <div
      onClick={!isUploading ? onCancel : undefined}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "700px",
          maxWidth: "92vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0.85rem 1.1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                Review Upload
              </h3>
              <span style={{ fontSize: "0.65rem", color: colors.textTertiary }}>
                {fileName} — {total_rows} row{total_rows !== 1 ? "s" : ""}{" "}
                parsed
              </span>
            </div>
            {!isUploading && (
              <button
                onClick={onCancel}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.textTertiary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "0.6rem",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 99,
                background: "#10B98122",
                color: "#10B981",
              }}
            >
              {valid_count} ready to upload
            </span>
            {error_count > 0 && (
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: "#ef444422",
                  color: "#ef4444",
                }}
              >
                {error_count} will be skipped
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "0.85rem 1.1rem", overflowY: "auto", flex: 1 }}>
          {error_count > 0 && (
            <div style={{ marginBottom: "0.85rem" }}>
              <h4
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#ef4444",
                  margin: "0 0 0.4rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Rows that will be skipped
              </h4>
              <div
                style={{
                  background: "#ef444410",
                  border: "1px solid #ef444440",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  maxHeight: "160px",
                  overflowY: "auto",
                }}
              >
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.1rem",
                    fontSize: "0.68rem",
                    color: "#ef4444",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <h4
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: colors.textTertiary,
              margin: "0 0 0.4rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Rows that will be uploaded
          </h4>

          {valid_rows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem 0",
                fontSize: "0.72rem",
                color: colors.textTertiary,
              }}
            >
              No valid rows to upload.
            </div>
          ) : (
            <div
              style={{
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "#",
                      "Protocol No.",
                      "Study Title",
                      "Phase",
                      "Sponsor",
                      "Drugs",
                    ].map((label) => (
                      <th
                        key={label}
                        style={{
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: colors.textTertiary,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          textAlign: "left",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          background: colors.tableBg,
                          position: "sticky",
                          top: 0,
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {valid_rows.map((row, index) => (
                    <tr
                      key={row.row_number}
                      style={{
                        background:
                          index % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd,
                      }}
                    >
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.65rem",
                          color: colors.textTertiary,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {row.row_number}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.65rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {row.protocol_no || "—"}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.65rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          maxWidth: "220px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={row.study_title || ""}
                      >
                        {row.study_title || "—"}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.65rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {row.phase || "—"}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.65rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {row.sponsor_name || "—"}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          fontSize: "0.65rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          textAlign: "center",
                        }}
                      >
                        {row.drug_count ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.75rem 1.1rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onCancel}
            disabled={isUploading}
            style={{
              padding: "6px 16px",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "6px",
              color: colors.textPrimary,
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: isUploading ? "not-allowed" : "pointer",
              opacity: isUploading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUploading || valid_count === 0}
            style={{
              padding: "6px 16px",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor:
                isUploading || valid_count === 0 ? "not-allowed" : "pointer",
              opacity: isUploading || valid_count === 0 ? 0.6 : 1,
            }}
          >
            {isUploading ? "Uploading…" : `Confirm Upload (${valid_count})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadPreviewModal;
