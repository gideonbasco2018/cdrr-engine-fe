// src/components/gmp/queue/UploadModal.jsx
// Drag-and-drop Excel upload modal for GMP records
import React, { useState, useRef, useCallback } from "react";
import { uploadGMPExcel, previewGMPExcel } from "../../../api/gmp";
import { FONT } from "../shared/constants";

const ACCENT  = "#10b981";
const MODAL_CSS = `
@keyframes gmpModalIn {
  from { opacity:0; transform:scale(0.95) translateY(10px); }
  to   { opacity:1; transform:scale(1)   translateY(0); }
}
@keyframes gmpBackdropIn {
  from { opacity:0; }
  to   { opacity:1; }
}`;

export default function UploadModal({ onClose, onSuccess, colors, darkMode }) {
  const [file,       setFile]       = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [checking,   setChecking]   = useState(false);   // reading file, checking for dupes
  const [preview,    setPreview]    = useState(null);    // { will_insert, will_skip, insert_count, skip_count }
  const [uploading,  setUploading]  = useState(false);
  const [result,     setResult]     = useState(null);    // { inserted, skipped, errors, message }
  const [error,      setError]      = useState("");
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

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (checking) return; // a check is in flight for the current file — don't swap it mid-request
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [checking]);

  const onDragOver = (e) => { e.preventDefault(); if (!checking) setDragging(true); };
  const onDragLeave = ()  => setDragging(false);

  // Step 1 — read the file and check every DTN for duplicates, without
  // writing anything. Shows what will/won't be imported so the user can
  // decide before anything actually happens.
  const handleCheck = async () => {
    if (!file) return;
    setChecking(true);
    setError("");
    setPreview(null);
    try {
      const res = await previewGMPExcel(file);
      setPreview(res);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Could not read this file. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setChecking(false);
    }
  };

  // Step 2 — the user has reviewed the preview and confirmed; do the real
  // upload of the same file.
  const handleConfirmUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadGMPExcel(file);
      setResult(res);
      setPreview(null);
      if (res.inserted > 0) onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setUploading(false);
    }
  };

  const backToFile = () => { setPreview(null); setError(""); };
  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(""); };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: FONT,
        animation: "gmpBackdropIn 0.2s ease forwards",
      }}
    >
      <style>{MODAL_CSS}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? "#18191a" : "#ffffff",
          borderRadius: 16, width: "100%", maxWidth: 520,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>📤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>
                Upload New Report
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>
                Upload a filled FGMP Excel template to add records
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary,
              cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Result — success/skip summary and any not-inserted rows are two
              visually separate blocks. Sharing one box used to make a
              partial failure (e.g. "11 inserted, 1 error") look like it was
              part of the green success message instead of its own warning. */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: result.inserted > 0 ? "#dcfce7" : "#fef9c3",
                border: `1px solid ${result.inserted > 0 ? "#86efac" : "#fde68a"}`,
              }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem",
                  color: result.inserted > 0 ? "#15803d" : "#854d0e" }}>
                  {result.inserted > 0 ? "✅" : "⚠️"} {result.inserted} record{result.inserted === 1 ? "" : "s"} inserted
                </p>
                {result.skipped > 0 && (
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#854d0e" }}>
                    {result.skipped} row(s) skipped (duplicate DTN)
                  </p>
                )}
              </div>

              {result.errors?.length > 0 && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "#fef2f2", border: "1px solid #fecaca",
                }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "0.84rem", color: "#b91c1c" }}>
                    ⚠️ {result.errors.length} record{result.errors.length === 1 ? "" : "s"} not inserted
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {result.errors.map((e, i) => {
                      // Backend sends objects: { row_number, dtn, reason }.
                      // Tolerate a plain string too, just in case.
                      const text = typeof e === "string"
                        ? e
                        : `Row ${e.row_number ?? "?"}${e.dtn && e.dtn !== "-" ? ` · DTN ${e.dtn}` : ""} — ${e.reason ?? "could not be imported."}`;
                      return (
                        <li key={i} style={{ fontSize: "0.71rem", color: "#b91c1c", marginBottom: 2 }}>{text}</li>
                      );
                    })}
                  </ul>
                  {result.errors.length >= 20 && (
                    <p style={{ margin: "4px 0 0", fontSize: "0.68rem", color: colors.textTertiary }}>
                      Showing the first 20.
                    </p>
                  )}
                </div>
              )}

              <button onClick={reset} style={{
                alignSelf: "flex-start", fontSize: "0.72rem", color: colors.textTertiary,
                background: "transparent", border: "none", cursor: "pointer",
                padding: 0, textDecoration: "underline",
              }}>
                Upload another file
              </button>
            </div>
          )}

          {/* Preview / confirmation — shown after the file has been checked,
              before anything is actually written */}
          {preview && !result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{
                  flex: 1, padding: "10px 12px", borderRadius: 9,
                  background: "#dcfce7", border: "1px solid #86efac",
                }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "#15803d" }}>
                    {preview.insert_count}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: "#15803d" }}>
                    will be added
                  </p>
                </div>
                <div style={{
                  flex: 1, padding: "10px 12px", borderRadius: 9,
                  background: preview.skip_count > 0 ? "#fef9c3" : (darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc"),
                  border: `1px solid ${preview.skip_count > 0 ? "#fde68a" : colors.cardBorder}`,
                }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: preview.skip_count > 0 ? "#854d0e" : colors.textTertiary }}>
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
                  <div style={{
                    maxHeight: 140, overflowY: "auto", borderRadius: 8,
                    border: `1px solid ${colors.cardBorder}`,
                  }}>
                    {preview.will_insert.map((r, i) => (
                      <div key={i} style={{
                        padding: "6px 10px",
                        borderBottom: i < preview.will_insert.length - 1 ? `1px solid ${colors.cardBorder}` : "none",
                      }}>
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: colors.textPrimary }}>
                          DTN {r.dtn} {r.company !== "-" ? `· ${r.company}` : ""}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.68rem", color: colors.textTertiary }}>
                          {[r.category, r.transaction_type, r.date_received].filter(v => v && v !== "-").join(" · ") || "—"}
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
                  <div style={{
                    maxHeight: 140, overflowY: "auto", borderRadius: 8,
                    border: "1px solid #fecaca", background: "#fef2f2",
                  }}>
                    {preview.will_skip.map((r, i) => (
                      <div key={i} style={{
                        padding: "6px 10px",
                        borderBottom: i < preview.will_skip.length - 1 ? "1px solid #fecaca" : "none",
                      }}>
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#7f1d1d" }}>
                          Row {r.row_number}{r.dtn !== "-" ? ` · DTN ${r.dtn}` : ""} {r.company !== "-" ? `· ${r.company}` : ""}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.68rem", color: "#b91c1c" }}>
                          {r.reason}
                        </p>
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

          {/* Drop zone — hidden after checking / result */}
          {!result && !preview && (
            <div
              onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
              onClick={() => !checking && inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? ACCENT : file ? ACCENT : colors.cardBorder}`,
                borderRadius: 12, padding: "32px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                cursor: checking ? "not-allowed" : "pointer", transition: "all 0.18s",
                opacity: checking ? 0.6 : 1,
                background: dragging
                  ? `${ACCENT}0a`
                  : file
                    ? `${ACCENT}08`
                    : (darkMode ? "rgba(255,255,255,0.02)" : "#fafafa"),
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
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem", color: ACCENT }}>
                    {file.name}
                  </p>
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
            <p style={{
              margin: 0, fontSize: "0.76rem", color: "#ef4444",
              background: "#fef2f2", padding: "8px 12px",
              borderRadius: 7, border: "1px solid #fecaca",
            }}>
              ⚠️ {error}
            </p>
          )}

          {/* Info note */}
          {!result && !preview && (
            <p style={{
              margin: 0, fontSize: "0.7rem", color: colors.textTertiary,
              background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
              padding: "8px 12px", borderRadius: 7,
              border: `1px solid ${colors.cardBorder}`,
            }}>
              💡 Use the <strong>Download Template</strong> button to get the correct Excel format.
              Each row becomes one FGMP record (ID assigned automatically). Only a <strong>DTN</strong> is
              required — everything else can be left blank. Clicking <strong>Check File</strong> reads it
              first and shows you what will be added before anything is uploaded; a row whose
              <strong> DTN already exists</strong> in the system is skipped, never overwritten.
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 22px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={preview && !result ? backToFile : onClose}
            disabled={uploading || checking}
            style={{
              padding: "8px 20px", fontSize: "0.8rem", fontWeight: 600, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
            }}>
            {result ? "Close" : preview ? "← Back" : "Cancel"}
          </button>

          {!result && !preview && (
            <button
              onClick={handleCheck}
              disabled={checking || !file}
              style={{
                padding: "8px 24px", fontSize: "0.8rem", fontWeight: 700, fontFamily: FONT,
                borderRadius: 8, border: "none",
                background: (!checking && file) ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0"),
                color: (!checking && file) ? "#fff" : colors.textTertiary,
                cursor: (!checking && file) ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: (!checking && file) ? `0 2px 8px ${ACCENT}44` : "none",
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
                padding: "8px 24px", fontSize: "0.8rem", fontWeight: 700, fontFamily: FONT,
                borderRadius: 8, border: "none",
                background: (!uploading && preview.insert_count > 0) ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0"),
                color: (!uploading && preview.insert_count > 0) ? "#fff" : colors.textTertiary,
                cursor: (!uploading && preview.insert_count > 0) ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: (!uploading && preview.insert_count > 0) ? `0 2px 8px ${ACCENT}44` : "none",
                transition: "all 0.15s",
              }}
            >
              {uploading
                ? "⏳ Uploading…"
                : preview.insert_count > 0
                  ? `📤 Confirm & Upload ${preview.insert_count}`
                  : "Nothing to upload"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
