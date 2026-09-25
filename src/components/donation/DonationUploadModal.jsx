// FILE: src/components/donation/DonationUploadModal.jsx
import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { uploadDonationExcel, previewDonationExcel } from "../../api/donation.js";

/* ── "Import" — drag & drop Excel upload with a "Check File" preview
   step, copies the design/behavior of UploadModal.jsx (FGMP Queue). ── */
const IMPORT_ACCENT = "#4CAF50";

export default function DonationUploadModal({ onClose, onSuccess, colors, darkMode }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState(null); // { insert_count, skip_count, will_insert, will_skip }
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { created, skipped_duplicates, skipped_invalid_dtn, failed, errors }
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Only .xlsx or .xls files are accepted.");
      return;
    }
    setError("");
    setResult(null);
    setPreview(null);
    setFile(f);
  };

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      if (checking) return;
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [checking],
  );
  const onDragOver = (e) => {
    e.preventDefault();
    if (!checking) setDragging(true);
  };
  const onDragLeave = () => setDragging(false);

  // Step 1 — read the file and check every Letter DTN (present? duplicate?)
  // without writing anything, so the user sees the outcome before committing.
  const handleCheck = async () => {
    if (!file) return;
    setChecking(true);
    setError("");
    setPreview(null);
    try {
      setPreview(await previewDonationExcel(file));
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Could not read this file. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setChecking(false);
    }
  };

  // Step 2 — the user reviewed the preview and confirmed; upload the same file.
  const handleConfirmUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadDonationExcel(file);
      setResult(res);
      setPreview(null);
      if (res.created > 0) onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setUploading(false);
    }
  };

  const backToFile = () => {
    setPreview(null);
    setError("");
  };
  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? "#18191a" : "#ffffff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>📤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>
                Upload New Donation
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>
                Upload a filled Donation Database Excel template to add records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textTertiary,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Result */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: result.created > 0 ? "#dcfce7" : "#fef9c3",
                  border: `1px solid ${result.created > 0 ? "#86efac" : "#fde68a"}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    color: result.created > 0 ? "#15803d" : "#854d0e",
                  }}
                >
                  {result.created > 0 ? "✅" : "⚠️"} {result.created} record{result.created === 1 ? "" : "s"} imported
                </p>
                {result.skipped_duplicates > 0 && (
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#854d0e" }}>
                    {result.skipped_duplicates} row(s) skipped (duplicate Letter DTN)
                  </p>
                )}
                {result.skipped_invalid_dtn > 0 && (
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#854d0e" }}>
                    {result.skipped_invalid_dtn} row(s) skipped (Letter DTN not a 14-digit number)
                  </p>
                )}
              </div>

              {result.errors?.length > 0 && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "0.84rem", color: "#b91c1c" }}>
                    ⚠️ {result.errors.length} record{result.errors.length === 1 ? "" : "s"} failed
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {result.errors.map((e, i) => (
                      <li key={i} style={{ fontSize: "0.71rem", color: "#b91c1c", marginBottom: 2 }}>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={reset}
                style={{
                  alignSelf: "flex-start",
                  fontSize: "0.72rem",
                  color: colors.textTertiary,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Upload another file
              </button>
            </div>
          )}

          {/* Preview / confirmation */}
          {preview && !result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "10px 12px", borderRadius: 9, background: "#dcfce7", border: "1px solid #86efac" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "#15803d" }}>
                    {preview.insert_count}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: "#15803d" }}>will be added</p>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 9,
                    background: preview.skip_count > 0 ? "#fef9c3" : darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    border: `1px solid ${preview.skip_count > 0 ? "#fde68a" : colors.cardBorder}`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: preview.skip_count > 0 ? "#854d0e" : colors.textTertiary,
                    }}
                  >
                    {preview.skip_count}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: preview.skip_count > 0 ? "#854d0e" : colors.textTertiary }}>
                    will be skipped
                  </p>
                </div>
              </div>

              {preview.insert_count > 0 && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: "#15803d" }}>
                    ✅ Ready to add:
                  </p>
                  <div style={{ maxHeight: 140, overflowY: "auto", borderRadius: 8, border: `1px solid ${colors.cardBorder}` }}>
                    {preview.will_insert.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "6px 10px",
                          borderBottom: i < preview.will_insert.length - 1 ? `1px solid ${colors.cardBorder}` : "none",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: colors.textPrimary }}>
                          DTN {r.dtn} {r.donor !== "-" ? `· ${r.donor}` : ""}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.68rem", color: colors.textTertiary }}>
                          {[r.product_name, r.date_received].filter((v) => v && v !== "-").join(" · ") || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.skip_count > 0 && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: "#b91c1c" }}>
                    ⚠️ Won't be uploaded:
                  </p>
                  <div style={{ maxHeight: 140, overflowY: "auto", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2" }}>
                    {preview.will_skip.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "6px 10px",
                          borderBottom: i < preview.will_skip.length - 1 ? "1px solid #fecaca" : "none",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#7f1d1d" }}>
                          Row {r.row_number}
                          {r.dtn !== "-" ? ` · DTN ${r.dtn}` : ""}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.68rem", color: "#b91c1c" }}>{r.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.total_rows === 0 && (
                <p style={{ margin: 0, fontSize: "0.76rem", color: colors.textTertiary }}>
                  No data rows found in this file.
                </p>
              )}
            </div>
          )}

          {/* Drop zone */}
          {!result && !preview && (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !checking && inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? IMPORT_ACCENT : file ? IMPORT_ACCENT : colors.cardBorder}`,
                borderRadius: 12,
                padding: "32px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                cursor: checking ? "not-allowed" : "pointer",
                transition: "all 0.18s",
                opacity: checking ? 0.6 : 1,
                background: dragging
                  ? `${IMPORT_ACCENT}0a`
                  : file
                    ? `${IMPORT_ACCENT}08`
                    : darkMode
                      ? "rgba(255,255,255,0.02)"
                      : "#fafafa",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={checking}
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <span style={{ fontSize: "2.5rem" }}>{file ? "📄" : "📁"}</span>
              {file ? (
                <>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem", color: IMPORT_ACCENT }}>{file.name}</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textTertiary }}>
                    {checking ? "Checking…" : `${(file.size / 1024).toFixed(1)} KB · Click to change file`}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.84rem", color: colors.textPrimary }}>
                    Drag & drop your Excel file here
                  </p>
                  <p style={{ margin: 0, fontSize: "0.73rem", color: colors.textTertiary }}>
                    or click to browse · .xlsx / .xls accepted
                  </p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              style={{
                margin: 0,
                fontSize: "0.76rem",
                color: "#ef4444",
                background: "#fef2f2",
                padding: "8px 12px",
                borderRadius: 7,
                border: "1px solid #fecaca",
              }}
            >
              ⚠️ {error}
            </p>
          )}

          {/* Info note */}
          {!result && !preview && (
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: colors.textTertiary,
                background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
                padding: "8px 12px",
                borderRadius: 7,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              💡 Use the <strong>Download Template</strong> button to get the correct Excel format. Each
              row becomes one donation record. <strong>Letter DTN is optional</strong>, but if a row has
              one it must be a <strong>14-digit number</strong> — a row with the wrong format is skipped.
              Clicking <strong>Check File</strong> reads it first and shows you what will be added before
              anything is uploaded; a row whose <strong>Letter DTN already exists</strong> in the system is
              skipped, never overwritten. Date columns accept any common format (e.g. 28-May-2026 or
              2026-05-28) and are stored consistently either way.
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            onClick={preview && !result ? backToFile : onClose}
            disabled={uploading || checking}
            style={{
              padding: "8px 20px",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: 8,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textTertiary,
              cursor: "pointer",
            }}
          >
            {result ? "Close" : preview ? "← Back" : "Cancel"}
          </button>

          {!result && !preview && (
            <button
              onClick={handleCheck}
              disabled={checking || !file}
              style={{
                padding: "8px 24px",
                fontSize: "0.8rem",
                fontWeight: 700,
                borderRadius: 8,
                border: "none",
                background: !checking && file ? IMPORT_ACCENT : darkMode ? "#2a2b2c" : "#e2e8f0",
                color: !checking && file ? "#fff" : colors.textTertiary,
                cursor: !checking && file ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: !checking && file ? `0 2px 8px ${IMPORT_ACCENT}44` : "none",
                transition: "all 0.15s",
              }}
            >
              {checking ? "🔍 Checking…" : "🔍 Check File"}
            </button>
          )}

          {preview && !result && (
            <button
              onClick={handleConfirmUpload}
              disabled={uploading || preview.insert_count === 0}
              style={{
                padding: "8px 24px",
                fontSize: "0.8rem",
                fontWeight: 700,
                borderRadius: 8,
                border: "none",
                background: !uploading && preview.insert_count > 0 ? IMPORT_ACCENT : darkMode ? "#2a2b2c" : "#e2e8f0",
                color: !uploading && preview.insert_count > 0 ? "#fff" : colors.textTertiary,
                cursor: !uploading && preview.insert_count > 0 ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: !uploading && preview.insert_count > 0 ? `0 2px 8px ${IMPORT_ACCENT}44` : "none",
                transition: "all 0.15s",
              }}
            >
              {uploading ? "⏳ Uploading…" : preview.insert_count > 0 ? `📤 Confirm & Upload ${preview.insert_count}` : "Nothing to upload"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
