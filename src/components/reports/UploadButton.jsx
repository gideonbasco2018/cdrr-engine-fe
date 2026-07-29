import { useRef, useState } from "react";
import * as XLSX from "xlsx";

// Prescription classification: allowed values
const VALID_PRESCRIPTION_VALUES = [
  "N/A",
  "Prescription (Rx) Drug",
  "Over-the-Counter (OTC) Drug",
  "Household Remedy (HR)",
];

// Find the "Prescription" column index in headers (case-insensitive match)
const findPrescriptionColIndex = (headers) =>
  headers.findIndex((h) => String(h).toLowerCase().includes("prescription"));

// Validate all data rows against the Prescription column
const validatePrescriptionColumn = (headers, dataRows) => {
  const colIdx = findPrescriptionColIndex(headers);

  // If the Prescription column doesn't exist at all in the file, block upload
  if (colIdx === -1) {
    return {
      colIdx: -1,
      errors: [
        {
          rowIndex: null,
          value: "",
          message:
            'No "Prescription" column was found in this file. Add it before uploading.',
        },
      ],
    };
  }

  const errors = [];
  dataRows.forEach((row, rIdx) => {
    const raw = row[colIdx];
    const value = raw !== undefined && raw !== null ? String(raw).trim() : "";

    if (!value) {
      errors.push({
        rowIndex: rIdx,
        value: "",
        message: `Row ${rIdx + 1}: Prescription is empty — this field is required.`,
      });
    } else if (!VALID_PRESCRIPTION_VALUES.includes(value)) {
      errors.push({
        rowIndex: rIdx,
        value,
        message: `Row ${rIdx + 1}: "${value}" is not a valid value.`,
      });
    }
  });

  return { colIdx, errors };
};

function UploadButton({ onFileSelect, onDownloadTemplate, uploading, colors }) {
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [confirmDownload, setConfirmDownload] = useState(false);

  // ── preview state ──
  const [allDataRows, setAllDataRows] = useState([]); // full parsed data rows (all rows, not just preview)
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const PREVIEW_LIMIT = 15; // show first N rows by default to keep the table light

  // ── prescription validation + inline correction state ──
  const [prescriptionColIndex, setPrescriptionColIndex] = useState(-1);
  const [previewPrescriptionErrors, setPreviewPrescriptionErrors] = useState(
    [],
  );
  const [correctedValues, setCorrectedValues] = useState({}); // { [rowIndex]: newValue }

  // Keep a reference to the parsed workbook so we can patch cells and
  // regenerate a corrected file on confirm, without re-reading the file.
  const workbookRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const parseExcelPreview = (file) => {
    setPreviewLoading(true);
    setPreviewError(null);
    setAllDataRows([]);
    setPreviewHeaders([]);
    setPreviewPrescriptionErrors([]);
    setPrescriptionColIndex(-1);
    setCorrectedValues({});
    workbookRef.current = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array-of-arrays first, so we control headers/rows manually
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false,
        });

        if (!rows || rows.length === 0) {
          setPreviewError("The file appears to be empty.");
          setPreviewLoading(false);
          return;
        }

        const headers = rows[0].map((h, i) =>
          h ? String(h) : `Column ${i + 1}`,
        );
        const dataRows = rows.slice(1);

        // Validate the Prescription column against the entire file, not just the preview slice
        const { colIdx, errors } = validatePrescriptionColumn(
          headers,
          dataRows,
        );

        workbookRef.current = { workbook, sheetName: firstSheetName };
        setPreviewHeaders(headers);
        setAllDataRows(dataRows);
        setPrescriptionColIndex(colIdx);
        setPreviewPrescriptionErrors(errors);
      } catch (err) {
        console.error("Excel parse error:", err);
        setPreviewError(
          "Could not read this file. Make sure it's a valid .xlsx or .xls file.",
        );
      } finally {
        setPreviewLoading(false);
      }
    };
    reader.onerror = () => {
      setPreviewError("Failed to read the file.");
      setPreviewLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    parseExcelPreview(file); // parse immediately for preview
    e.target.value = "";
  };

  // Apply any inline corrections to the workbook and produce a new File to upload.
  // Falls back to the original file if nothing was corrected.
  const buildFileToUpload = () => {
    if (
      Object.keys(correctedValues).length === 0 ||
      !workbookRef.current ||
      prescriptionColIndex === -1
    ) {
      return pendingFile;
    }

    const { workbook, sheetName } = workbookRef.current;
    const worksheet = workbook.Sheets[sheetName];

    Object.entries(correctedValues).forEach(([rowIdxStr, newValue]) => {
      const rowIdx = Number(rowIdxStr);
      // Data rows start at sheet row 1 (row 0 is the header)
      const cellAddress = XLSX.utils.encode_cell({
        r: rowIdx + 1,
        c: prescriptionColIndex,
      });
      worksheet[cellAddress] = { t: "s", v: newValue };
    });

    const isLegacyXls = pendingFile.name.toLowerCase().endsWith(".xls");
    const wbout = XLSX.write(workbook, {
      type: "array",
      bookType: isLegacyXls ? "biff8" : "xlsx",
    });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    return new File([blob], pendingFile.name, { type: pendingFile.type });
  };

  const handleConfirm = () => {
    if (!pendingFile) return;
    const fileToUpload = buildFileToUpload();
    onFileSelect({ target: { files: [fileToUpload] } });
    setPendingFile(null);
    setAllDataRows([]);
    setPreviewHeaders([]);
    setPreviewPrescriptionErrors([]);
    setPrescriptionColIndex(-1);
    setCorrectedValues({});
    workbookRef.current = null;
  };

  const handleCancel = () => {
    setPendingFile(null);
    setAllDataRows([]);
    setPreviewHeaders([]);
    setPreviewError(null);
    setPreviewPrescriptionErrors([]);
    setPrescriptionColIndex(-1);
    setCorrectedValues({});
    workbookRef.current = null;
  };

  const handleCorrectionChange = (rowIndex, value) => {
    setCorrectedValues((prev) => ({ ...prev, [rowIndex]: value }));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // An error is "unresolved" if it can't be fixed inline (missing column)
  // or if the user hasn't picked a corrected value for that row yet.
  const unresolvedErrors = previewPrescriptionErrors.filter(
    (err) =>
      err.rowIndex === null || correctedValues[err.rowIndex] === undefined,
  );
  const hasUnresolvedErrors = unresolvedErrors.length > 0;
  const uploadBlocked = !!previewError || hasUnresolvedErrors;

  const getRowError = (rIdx) =>
    previewPrescriptionErrors.find((err) => err.rowIndex === rIdx);

  // Rows to display: the first PREVIEW_LIMIT rows, plus every row that has an
  // error, so a problem row is never hidden outside the visible preview.
  const errorRowIndexSet = new Set(
    previewPrescriptionErrors
      .filter((e) => e.rowIndex !== null)
      .map((e) => e.rowIndex),
  );
  const baseIndices = allDataRows.slice(0, PREVIEW_LIMIT).map((_, i) => i);
  const displayRowIndices = Array.from(
    new Set([...baseIndices, ...errorRowIndexSet]),
  ).sort((a, b) => a - b);

  const getCellDisplayValue = (rowIndex, colIndex) => {
    if (
      colIndex === prescriptionColIndex &&
      correctedValues[rowIndex] !== undefined
    ) {
      return correctedValues[rowIndex];
    }
    const raw = allDataRows[rowIndex]?.[colIndex];
    return raw !== undefined && raw !== "" ? String(raw) : "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => setConfirmDownload(true)}
          style={{
            padding: "5px 14px",
            background: colors.buttonSecondaryBg,
            border: `1px solid ${colors.buttonSecondaryBorder}`,
            borderRadius: "6px",
            color: colors.textPrimary,
            fontSize: "12px",
            fontWeight: 600,
            height: "30px",
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

        <button
          onClick={handleUploadClick}
          disabled={uploading}
          style={{
            padding: "5px 14px",
            background: uploading ? "#999" : "#4CAF50",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 600,
            height: "30px",
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

      {/* Download Template Confirmation Modal (unchanged) */}
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
      {/* LOADING MODAL (shown while the file is being read/parsed) */}
      {pendingFile && previewLoading && (
        <div
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
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 16,
              padding: "2.5rem 3rem",
              width: 340,
              maxWidth: "90%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
              animation: "slideInScale 0.25s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                border: "3px solid #4CAF50",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div
              style={{
                fontSize: "0.92rem",
                fontWeight: 600,
                color: colors.textPrimary,
                textAlign: "center",
              }}
            >
              Reading file...
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: colors.textTertiary,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {pendingFile.name}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM UPLOAD MODAL (preview + inline correction, shown after parsing) */}
      {pendingFile && !previewLoading && (
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
              width: previewHeaders.length > 0 ? "min(90vw, 1000px)" : 420,
              maxWidth: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
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
              📤
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
              Review the contents below before uploading.
            </p>

            {/* File info card */}
            <div
              style={{
                background: colors.badgeBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.9rem 1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
              }}
            >
              <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>📊</span>
              <div style={{ minWidth: 0, flex: 1 }}>
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
                  {allDataRows.length > 0 &&
                    ` · ${allDataRows.length} data rows detected`}
                </div>
              </div>
            </div>

            {previewError && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 8,
                  color: "#ef4444",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                }}
              >
                ⚠️ {previewError}
              </div>
            )}

            {/* Prescription validation banner — only lists unresolved issues */}
            {!previewError && hasUnresolvedErrors && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 8,
                  color: "#ef4444",
                  fontSize: "0.8rem",
                  marginBottom: "1rem",
                  maxHeight: "140px",
                  overflowY: "auto",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>
                  ⚠️ Prescription column has {unresolvedErrors.length}{" "}
                  {unresolvedErrors.length === 1 ? "issue" : "issues"} — fix
                  each highlighted row before uploading:
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                  {unresolvedErrors.slice(0, 10).map((err, i) => (
                    <li key={i} style={{ marginBottom: "0.15rem" }}>
                      {err.message}
                    </li>
                  ))}
                  {unresolvedErrors.length > 10 && (
                    <li>+ {unresolvedErrors.length - 10} more row(s)...</li>
                  )}
                </ul>
              </div>
            )}

            {!previewError && previewHeaders.length > 0 && (
              <div
                style={{
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  overflow: "auto",
                  maxHeight: "45vh",
                  marginBottom: "1.25rem",
                }}
              >
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontSize: "0.75rem",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          position: "sticky",
                          top: 0,
                          background: colors.badgeBg,
                          padding: "6px 10px",
                          textAlign: "left",
                          color: colors.textTertiary,
                          fontWeight: 700,
                          borderBottom: `1px solid ${colors.cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        #
                      </th>
                      {previewHeaders.map((h, i) => (
                        <th
                          key={i}
                          style={{
                            position: "sticky",
                            top: 0,
                            background:
                              i === prescriptionColIndex
                                ? "rgba(239,68,68,0.15)"
                                : colors.badgeBg,
                            padding: "6px 10px",
                            textAlign: "left",
                            color: colors.textPrimary,
                            fontWeight: 700,
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
                    {displayRowIndices.map((rIdx, i) => {
                      const rowError = getRowError(rIdx);
                      const isCorrected =
                        rowError && correctedValues[rIdx] !== undefined;

                      return (
                        <tr
                          key={rIdx}
                          title={
                            rowError && !isCorrected
                              ? rowError.message
                              : undefined
                          }
                          style={{
                            background: isCorrected
                              ? "rgba(76,175,80,0.12)"
                              : rowError
                                ? "rgba(239,68,68,0.14)"
                                : i % 2 === 0
                                  ? "transparent"
                                  : colors.badgeBg,
                          }}
                        >
                          <td
                            style={{
                              padding: "5px 10px",
                              color: rowError
                                ? isCorrected
                                  ? "#4CAF50"
                                  : "#ef4444"
                                : colors.textTertiary,
                              borderBottom: `1px solid ${colors.cardBorder}`,
                              fontWeight: rowError ? 700 : 400,
                            }}
                          >
                            {rowError ? (isCorrected ? "✓ " : "⚠️ ") : ""}
                            {rIdx + 1}
                          </td>
                          {previewHeaders.map((_, cIdx) => {
                            const isPrescriptionCell =
                              cIdx === prescriptionColIndex;

                            // Render an inline fix dropdown only for the invalid
                            // Prescription cell of an errored row.
                            if (isPrescriptionCell && rowError) {
                              return (
                                <td
                                  key={cIdx}
                                  style={{
                                    padding: "4px 6px",
                                    borderBottom: `1px solid ${colors.cardBorder}`,
                                  }}
                                >
                                  <select
                                    value={correctedValues[rIdx] ?? ""}
                                    onChange={(e) =>
                                      handleCorrectionChange(
                                        rIdx,
                                        e.target.value,
                                      )
                                    }
                                    style={{
                                      width: "100%",
                                      fontSize: "0.75rem",
                                      padding: "4px 6px",
                                      borderRadius: 6,
                                      border: isCorrected
                                        ? "1px solid rgba(76,175,80,0.5)"
                                        : "1px solid rgba(239,68,68,0.5)",
                                      background: colors.cardBg,
                                      color: colors.textPrimary,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <option value="" disabled>
                                      {`Invalid: "${rowError.value || "(empty)"}" — select correct value`}
                                    </option>
                                    {VALID_PRESCRIPTION_VALUES.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              );
                            }

                            const cellValue = getCellDisplayValue(rIdx, cIdx);
                            return (
                              <td
                                key={cIdx}
                                style={{
                                  padding: "5px 10px",
                                  color: colors.textSecondary,
                                  borderBottom: `1px solid ${colors.cardBorder}`,
                                  whiteSpace: "nowrap",
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {cellValue || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!previewError && allDataRows.length > displayRowIndices.length && (
              <p
                style={{
                  margin: "-0.75rem 0 1rem",
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                  textAlign: "center",
                }}
              >
                Showing {displayRowIndices.length} of {allDataRows.length} rows
                (all rows that need fixing are included).
              </p>
            )}

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
                disabled={uploadBlocked}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: uploadBlocked ? "#999" : "#4CAF50",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: uploadBlocked ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 10px rgba(76,175,80,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  opacity: uploadBlocked ? 0.6 : 1,
                }}
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
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export default UploadButton;
